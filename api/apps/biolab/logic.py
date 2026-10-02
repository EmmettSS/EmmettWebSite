"""Pure sequence logic for the F-09 server mirror.

The browser is the primary compute surface (card F-09: zero server cost, works offline).
This module exists for exactly two jobs required by the card:
  * the Static Bridge / SEO example, and
  * an optional server-side analysis used when the client decides to call the API.

It is deliberately dependency-free, deterministic and side-effect free: nothing here writes
to the database, the log or a file. The server never stores a submitted sequence.
"""

from __future__ import annotations

import math
import re

MAX_SEQUENCE_LENGTH = 500_000  # card F-09: server-side limit (the browser allows 1 MB)
DEFAULT_MIN_ORF_AA = 30

CODON_TABLES: dict[str, dict[str, object]] = {
    "standard": {
        "starts": ("ATG", "TTG", "CTG", "GTG"),
        "stops": ("TAA", "TAG", "TGA"),
        "table": {
            "TTT": "F", "TTC": "F", "TTA": "L", "TTG": "L", "CTT": "L", "CTC": "L", "CTA": "L", "CTG": "L",
            "ATT": "I", "ATC": "I", "ATA": "I", "ATG": "M", "GTT": "V", "GTC": "V", "GTA": "V", "GTG": "V",
            "TCT": "S", "TCC": "S", "TCA": "S", "TCG": "S", "CCT": "P", "CCC": "P", "CCA": "P", "CCG": "P",
            "ACT": "T", "ACC": "T", "ACA": "T", "ACG": "T", "GCT": "A", "GCC": "A", "GCA": "A", "GCG": "A",
            "TAT": "Y", "TAC": "Y", "TAA": "*", "TAG": "*", "CAT": "H", "CAC": "H", "CAA": "Q", "CAG": "Q",
            "AAT": "N", "AAC": "N", "AAA": "K", "AAG": "K", "GAT": "D", "GAC": "D", "GAA": "E", "GAG": "E",
            "TGT": "C", "TGC": "C", "TGA": "*", "TGG": "W", "CGT": "R", "CGC": "R", "CGA": "R", "CGG": "R",
            "AGT": "S", "AGC": "S", "AGA": "R", "AGG": "R", "GGT": "G", "GGC": "G", "GGA": "G", "GGG": "G",
        },
    },
    "vertebrate-mito": {
        "starts": ("ATG", "ATT", "ATC", "ATA", "GTG"),
        "stops": ("TAA", "TAG", "AGA", "AGG"),
        "table": {
            "TTT": "F", "TTC": "F", "TTA": "L", "TTG": "L", "CTT": "L", "CTC": "L", "CTA": "L", "CTG": "L",
            "ATT": "I", "ATC": "I", "ATA": "M", "ATG": "M", "GTT": "V", "GTC": "V", "GTA": "V", "GTG": "V",
            "TCT": "S", "TCC": "S", "TCA": "S", "TCG": "S", "CCT": "P", "CCC": "P", "CCA": "P", "CCG": "P",
            "ACT": "T", "ACC": "T", "ACA": "T", "ACG": "T", "GCT": "A", "GCC": "A", "GCA": "A", "GCG": "A",
            "TAT": "Y", "TAC": "Y", "TAA": "*", "TAG": "*", "CAT": "H", "CAC": "H", "CAA": "Q", "CAG": "Q",
            "AAT": "N", "AAC": "N", "AAA": "K", "AAG": "K", "GAT": "D", "GAC": "D", "GAA": "E", "GAG": "E",
            "TGT": "C", "TGC": "C", "TGA": "W", "TGG": "W", "CGT": "R", "CGC": "R", "CGA": "R", "CGG": "R",
            "AGT": "S", "AGC": "S", "AGA": "*", "AGG": "*", "GGT": "G", "GGC": "G", "GGA": "G", "GGG": "G",
        },
    },
}

COMPLEMENT = {"A": "T", "C": "G", "G": "C", "T": "A", "N": "N"}
HEADER_RE = re.compile(r"^>.*$", re.MULTILINE)
WHITESPACE_RE = re.compile(r"[\s\d]+")
ILLEGAL_RE = re.compile(r"[^ACGTN]")

# Payload keys that would indicate real patient data. Presence means the request is rejected:
# the tool is for research/education and never accepts patient data (card F-09 guardrail).
PATIENT_DATA_KEYS = (
    "national_id", "nationalid", "kod_melli", "kodemelli", "insurance_id", "insurance_code",
    "patient_name", "patient", "phone", "mobile", "address", "birth_date", "birthdate",
    "passport", "melli_code", "shenasname", "ssn", "mrn",
)


class SequenceError(Exception):
    """Raised for input the tool refuses; the view converts it into a bilingual 400."""

    def __init__(self, message_fa: str, message_en: str):
        super().__init__(message_en)
        self.message_fa = message_fa
        self.message_en = message_en


def sanitize_sequence(raw: str, max_length: int = MAX_SEQUENCE_LENGTH) -> tuple[str, str | None]:
    """Strips FASTA headers/whitespace and validates the alphabet. Returns (sequence, header)."""
    if not isinstance(raw, str):
        raise SequenceError("ورودی باید متن باشد.", "The input must be text.")
    header = None
    for line in raw.splitlines():
        if line.strip().startswith(">") and header is None:
            header = line.strip()[1:].strip()
    body = WHITESPACE_RE.sub("", HEADER_RE.sub("", raw)).upper()
    if not body:
        raise SequenceError(
            "توالی‌ای پیدا نشد. فقط A، C، G، T و N (و سرخط FASTA) پذیرفته می‌شود.",
            "No sequence found. Only A, C, G, T, N and a FASTA header are accepted.",
        )
    illegal = ILLEGAL_RE.search(body)
    if illegal:
        raise SequenceError(
            f"کاراکتر غیرمجاز «{illegal.group()}» در جایگاه {illegal.start() + 1}؛ توالی DNA فقط A/C/G/T/N است.",
            f"Illegal character “{illegal.group()}” at position {illegal.start() + 1}; DNA is A/C/G/T/N only.",
        )
    if len(body) > max_length:
        raise SequenceError(
            f"توالی بیش از حد بلند است ({len(body)} نوکلئوتید). سقف سمت سرور {max_length} است.",
            f"Sequence is too long ({len(body)} nt). The server-side cap is {max_length}.",
        )
    return body, header


def composition(sequence: str) -> dict[str, object]:
    counts = {"A": 0, "C": 0, "G": 0, "T": 0, "N": 0}
    for base in sequence:
        counts[base] = counts.get(base, 0) + 1
    resolved = counts["A"] + counts["C"] + counts["G"] + counts["T"]
    gc = counts["G"] + counts["C"]
    return {
        "length": len(sequence),
        "counts": counts,
        "gc_percent": (gc / resolved * 100) if resolved else 0.0,
        "at_percent": ((counts["A"] + counts["T"]) / resolved * 100) if resolved else 0.0,
        "gc_skew": ((counts["G"] - counts["C"]) / gc) if gc else 0.0,
        "ambiguous": counts["N"],
    }


def molecular_weight_da(sequence: str) -> float:
    counts = composition(sequence)["counts"]
    assert isinstance(counts, dict)
    mass = counts["A"] * 313.21 + counts["T"] * 304.2 + counts["C"] * 289.18 + counts["G"] * 329.21
    return max(0.0, mass - 61.96)


def melting_temperature(sequence: str, salt_molar: float = 0.05) -> dict[str, float | str]:
    counts = composition(sequence)["counts"]
    assert isinstance(counts, dict)
    length = len(sequence)
    wallace = 2 * (counts["A"] + counts["T"]) + 4 * (counts["G"] + counts["C"])
    correction = 16.6 * math.log10(max(salt_molar, 1e-6))
    gc_formula = (64.9 + 41 * (counts["G"] + counts["C"] - 16.4) / length + correction) if length else 0.0
    return {
        "wallace": wallace,
        "gc_formula": gc_formula,
        "salt_molar": salt_molar,
        "method": "wallace" if length <= 14 else "gc-formula",
    }


def reverse_complement(sequence: str) -> str:
    return "".join(COMPLEMENT.get(base, "N") for base in reversed(sequence))


def translate(sequence: str, table_id: str = "standard", frame: int = 0, stop_at_stop: bool = False) -> str:
    codon_table = CODON_TABLES[table_id]["table"]
    assert isinstance(codon_table, dict)
    protein = []
    for index in range(frame, len(sequence) - 2, 3):
        amino = codon_table.get(sequence[index : index + 3], "X")
        if amino == "*":
            if stop_at_stop:
                break
            protein.append("*")
            continue
        protein.append(amino)
    return "".join(protein)


def _scan_frame(
    source: str,
    frame: int,
    strand: str,
    sequence_length: int,
    min_aa: int,
    table_id: str,
) -> list[dict[str, object]]:
    starts = CODON_TABLES[table_id]["starts"]
    codon_table = CODON_TABLES[table_id]["table"]
    assert isinstance(starts, tuple) and isinstance(codon_table, dict)
    found: list[dict[str, object]] = []
    run_start = -1
    for index in range(frame, len(source) - 2, 3):
        codon = source[index : index + 3]
        if run_start < 0:
            if codon in starts:
                run_start = index
            continue
        if codon_table.get(codon, "X") == "*":
            length_aa = (index + 3 - run_start) // 3 - 1
            if length_aa >= min_aa:
                found.append(_orf(source, run_start, index + 3, frame, strand, sequence_length, table_id, True))
            run_start = -1
    if run_start >= 0:
        length_aa = (len(source) - run_start) // 3
        if length_aa >= min_aa:
            found.append(_orf(source, run_start, run_start + length_aa * 3, frame, strand, sequence_length, table_id, False))
    return found


def _orf(
    source: str,
    run_start: int,
    run_end: int,
    frame: int,
    strand: str,
    sequence_length: int,
    table_id: str,
    complete: bool,
) -> dict[str, object]:
    length_nt = run_end - run_start
    protein = translate(source[run_start:run_end], table_id)
    start = run_start + 1 if strand == "forward" else sequence_length - run_end + 1
    end = run_end if strand == "forward" else sequence_length - run_start
    return {
        "start": start,
        "end": end,
        "frame": frame + 1,
        "strand": strand,
        "length_nt": length_nt,
        "length_aa": (length_nt // 3 - 1) if complete else length_nt // 3,
        "protein": protein[:-1] if complete else protein,
        "complete": complete,
    }


def find_orfs(
    sequence: str,
    min_aa: int = DEFAULT_MIN_ORF_AA,
    both_strands: bool = True,
    table_id: str = "standard",
    limit: int | None = 40,
) -> list[dict[str, object]]:
    orfs: list[dict[str, object]] = []
    for frame in range(3):
        orfs.extend(_scan_frame(sequence, frame, "forward", len(sequence), min_aa, table_id))
    if both_strands:
        reverse = reverse_complement(sequence)
        for frame in range(3):
            orfs.extend(_scan_frame(reverse, frame, "reverse", len(sequence), min_aa, table_id))
    orfs.sort(key=lambda item: (-int(item["length_nt"]), int(item["start"])))
    return orfs[:limit] if limit else orfs


def codon_usage(sequence: str, table_id: str = "standard") -> list[dict[str, object]]:
    codon_table = CODON_TABLES[table_id]["table"]
    assert isinstance(codon_table, dict)
    counts: dict[str, int] = {}
    total = 0
    for index in range(0, len(sequence) - 2, 3):
        codon = sequence[index : index + 3]
        if "N" in codon:
            continue
        counts[codon] = counts.get(codon, 0) + 1
        total += 1
    rows = [
        {
            "codon": codon,
            "amino": codon_table.get(codon, "X"),
            "count": count,
            "per_thousand": (count / total * 1000) if total else 0.0,
        }
        for codon, count in counts.items()
    ]
    rows.sort(key=lambda row: (-int(row["count"]), str(row["codon"])))
    return rows


def analyze(sequence: str, options: dict[str, object] | None = None) -> dict[str, object]:
    """Full server-side analysis. Pure function: same input → same output, no I/O."""
    options = options or {}
    table_id = str(options.get("table") or "standard")
    if table_id not in CODON_TABLES:
        raise SequenceError(
            "جدول کدون انتخاب‌شده پشتیبانی نمی‌شود.",
            "The selected codon table is not supported.",
        )
    min_aa = int(options.get("min_orf_aa") or DEFAULT_MIN_ORF_AA)
    both_strands = bool(options.get("both_strands", True))
    orfs = find_orfs(sequence, min_aa=min_aa, both_strands=both_strands, table_id=table_id, limit=40)
    stats = composition(sequence)
    return {
        "length": len(sequence),
        "composition": stats,
        "molecular_weight_da": round(molecular_weight_da(sequence), 2),
        "melting_temperature": melting_temperature(sequence),
        "orfs": orfs,
        "longest_orf": orfs[0] if orfs else None,
        "codon_usage": codon_usage(sequence, table_id),
        "reverse_complement_preview": reverse_complement(sequence[:120]),
        "protein_preview": translate(sequence[:120], table_id),
        "options": {"table": table_id, "min_orf_aa": min_aa, "both_strands": both_strands},
    }


def contains_patient_data(payload: dict[str, object]) -> str | None:
    """Returns the offending key when the payload looks like real patient data."""
    for key, value in payload.items():
        normalized = str(key).strip().lower()
        if normalized in PATIENT_DATA_KEYS:
            return str(key)
        if isinstance(value, dict):
            nested = contains_patient_data(value)
            if nested:
                return f"{key}.{nested}"
    return None
