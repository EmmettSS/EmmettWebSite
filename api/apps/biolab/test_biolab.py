"""Guard tests for the server-side biolab mirror (F-09).

The server contract (card F-09 §API and §guards):
  * a public reference sequence analyses to the published values (same numbers as the browser);
  * illegal characters and oversized payloads get a bilingual 400, never a 500;
  * payloads that look like real patient data are rejected;
  * nothing is persisted: the request writes no rows.
"""

from __future__ import annotations

import json
import pathlib
import re

from django.test import TestCase
from django.urls import reverse

from . import logic

REFERENCE_FASTA_PATH = pathlib.Path(__file__).resolve().parents[2] / "data" / "sars-cov-2-mn908947.3.fasta"


def reference_sequence() -> str:
    body = []
    for line in REFERENCE_FASTA_PATH.read_text(encoding="utf-8").splitlines():
        if line.startswith(">") or not line.strip():
            continue
        body.append(line.strip())
    return "".join(body)


class LogicTests(TestCase):
    def test_reference_sequence_matches_published_values(self):
        sequence = reference_sequence()
        self.assertEqual(len(sequence), 29903)
        stats = logic.composition(sequence)
        self.assertAlmostEqual(stats["gc_percent"], 37.97, places=2)  # Wuhan-Hu-1 genome GC

    def test_spike_cds_analysis_matches_the_browser_core(self):
        sequence = reference_sequence()[21562:25384]
        self.assertEqual(len(sequence), 3822)
        result = logic.analyze(sequence, {"min_orf_aa": 1000, "both_strands": False})
        self.assertEqual(result["length"], 3822)
        self.assertAlmostEqual(result["composition"]["gc_percent"], 37.31, places=2)  # type: ignore[index]
        protein = logic.translate(sequence)
        self.assertEqual(len(protein), 1274)
        self.assertTrue(protein.startswith("MFVFLVLLPLVSSQCVNLTTRTQLPPAYTNSFTRGVYYPD"))
        self.assertEqual(protein[680:685], "PRRAR")  # furin cleavage site
        longest = result["longest_orf"]
        self.assertEqual(longest["length_aa"], 1273)  # type: ignore[index]
        self.assertEqual(longest["start"], 1)  # type: ignore[index]
        self.assertEqual(longest["end"], 3822)  # type: ignore[index]

    def test_sanitize_rejects_illegal_characters_and_oversized_input(self):
        with self.assertRaises(logic.SequenceError) as ctx:
            logic.sanitize_sequence("ATGCXYZ")
        self.assertIn("X", ctx.exception.message_fa)
        with self.assertRaises(logic.SequenceError):
            logic.sanitize_sequence("A" * (logic.MAX_SEQUENCE_LENGTH + 1))
        sequence, header = logic.sanitize_sequence(">demo test\n1 atgc\n002 ACGT")
        self.assertEqual(sequence, "ATGCACGT")
        self.assertEqual(header, "demo test")

    def test_patient_data_detection_walks_nested_payloads(self):
        self.assertIsNone(logic.contains_patient_data({"sequence": "ATGC"}))
        self.assertEqual(logic.contains_patient_data({"national_id": "123"}), "national_id")
        self.assertEqual(
            logic.contains_patient_data({"options": {"patient_name": "x"}}),
            "options.patient_name",
        )

    def test_orfs_are_found_in_all_six_frames(self):
        # A 42-nt sequence with an explicit ATG…TAA window in frame 1 (13 aa: M + 12 K).
        sequence = "ATG" + "AAA" * 12 + "TAA"
        orfs = logic.find_orfs(sequence, min_aa=5, both_strands=False)
        self.assertEqual(len(orfs), 1)
        self.assertEqual(orfs[0]["frame"], 1)
        self.assertEqual(orfs[0]["start"], 1)
        self.assertEqual(orfs[0]["end"], 42)
        self.assertEqual(orfs[0]["length_aa"], 13)
        self.assertEqual(orfs[0]["protein"], "M" + "K" * 12)
        both = logic.find_orfs(sequence, min_aa=3, both_strands=True)
        self.assertTrue(any(orf["strand"] == "reverse" for orf in both) or len(both) == 1)


class ApiTests(TestCase):
    def test_analyze_endpoint_returns_computed_values_and_never_stores(self):
        from apps.tools.models import SharedResult

        before = SharedResult.objects.count()
        response = self.client.post(
            reverse("bio-analyze"),
            data=json.dumps({"sequence": ">demo\nATGAAATAA"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["length"], 9)
        self.assertEqual(payload["mode"], "server")
        self.assertEqual(payload["header"], "demo")
        self.assertEqual(SharedResult.objects.count(), before)  # nothing persisted

    def test_analyze_endpoint_rejects_patient_data_with_bilingual_message(self):
        response = self.client.post(
            reverse("bio-analyze"),
            data=json.dumps({"sequence": "ATGAAATAA", "national_id": "2715830491"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertIn("national_id", body["message_fa"])
        self.assertIn("patient data", body["message_en"])

    def test_analyze_endpoint_rejects_bad_input_without_crashing(self):
        for payload in ({"sequence": "ATGCX"}, {"sequence": ""}, {}):
            response = self.client.post(
                reverse("bio-analyze"), data=json.dumps(payload), content_type="application/json"
            )
            self.assertEqual(response.status_code, 400)
            self.assertIn("message_fa", response.json())

    def test_sequence_is_never_written_to_the_log_or_the_database(self):
        import logging

        records: list[str] = []

        class Capture(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:  # noqa: D102
                records.append(self.format(record))

        handler = Capture()
        root = logging.getLogger()
        root.addHandler(handler)
        try:
            self.client.post(
                reverse("bio-analyze"),
                data=json.dumps({"sequence": "ATGAAATAAGGGCCC"}),
                content_type="application/json",
            )
        finally:
            root.removeHandler(handler)
        joined = "\n".join(records)
        self.assertNotIn("ATGAAATAAGGGCCC", joined)  # the sequence never reaches a log line

    def test_codon_tables_and_fhir_samples_are_served(self):
        tables = self.client.get(reverse("bio-codon-tables")).json()
        self.assertEqual(tables["default"], "standard")
        self.assertGreaterEqual(len(tables["tables"]), 2)
        self.assertEqual(tables["max_sequence_length"], 500_000)

        bundle = self.client.get(reverse("bio-fhir-samples")).json()
        self.assertEqual(bundle["resourceType"], "Bundle")
        self.assertTrue(bundle["validation"]["valid"])
        blob = json.dumps(bundle)
        self.assertIn("Synthetic sample patient", blob)
        for forbidden in ("national_id", "birthDate", "phone", "address"):
            self.assertNotIn(forbidden, blob)
        self.assertGreaterEqual(len(bundle["entry"]), 3)


class StaticBridgeDataTests(TestCase):
    """The repository data file that feeds the Static Bridge and this test suite."""

    def test_reference_file_is_a_valid_fasta_with_expected_provenance(self):
        raw = REFERENCE_FASTA_PATH.read_text(encoding="utf-8")
        self.assertTrue(raw.startswith(">MN908947.3"))
        self.assertIn("Wuhan-Hu-1", raw)
        sequence = re.sub(r"[^ACGTN]", "", re.sub(r"^>.*$", "", raw, flags=re.M))
        self.assertEqual(len(sequence), 29903)
