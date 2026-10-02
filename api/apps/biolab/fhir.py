"""Synthetic FHIR R4 samples for F-09 (tab 4).

Hard rule: sample data only. Identifiers are obvious placeholders, `gender` stays `unknown`,
and no real person's data shape (birth date, address, phone, national identifier) exists here.
The code system is our own `emmett.example` namespace because these are teaching examples,
not licensed LOINC/SNOMED codes.
"""

from __future__ import annotations

SYNTHETIC_TAG = {
    "system": "https://emmett.example/fhir/synthetic-data",
    "code": "synthetic-sample",
    "display": "Synthetic sample data — never a real patient",
}

REQUIRED_FIELDS: dict[str, tuple[str, ...]] = {
    "Patient": ("resourceType", "id", "name", "gender"),
    "Observation": ("resourceType", "id", "status", "code", "subject", "valueQuantity"),
    "Encounter": ("resourceType", "id", "status", "class", "subject", "period"),
}


def sample_bundle(gc_percent: float = 37.31) -> dict[str, object]:
    subject = {"reference": "Patient/sample-patient-0001", "display": "Synthetic sample patient"}
    resources = [
        {
            "resourceType": "Patient",
            "id": "sample-patient-0001",
            "meta": {"tag": [SYNTHETIC_TAG]},
            "active": True,
            "name": [{"use": "official", "family": "Sample", "given": ["Synthetic"]}],
            "gender": "unknown",
            "text": {"status": "generated", "div": "Synthetic sample patient — not a real person."},
        },
        {
            "resourceType": "Observation",
            "id": "sample-observation-gc-0001",
            "meta": {"tag": [SYNTHETIC_TAG]},
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "laboratory",
                            "display": "Laboratory",
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "https://emmett.example/fhir/synthetic-codes",
                        "code": "SEQ-GC",
                        "display": "GC content of a submitted sequence (percent)",
                    }
                ],
                "text": "GC content (percent)",
            },
            "subject": subject,
            "effectiveDateTime": "2020-01-01T00:00:00Z",
            "valueQuantity": {
                "value": round(gc_percent, 2),
                "unit": "%",
                "system": "http://unitsofmeasure.org",
                "code": "%",
            },
            "note": [{"text": "Computed from a public reference sequence; no patient data involved."}],
        },
        {
            "resourceType": "Encounter",
            "id": "sample-encounter-0001",
            "meta": {"tag": [SYNTHETIC_TAG]},
            "status": "finished",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "AMB",
                "display": "ambulatory",
            },
            "subject": subject,
            "period": {"start": "2020-01-01T00:00:00Z", "end": "2020-01-01T00:30:00Z"},
            "reasonCode": [{"text": "In-silico sequence analysis (educational sample)"}],
        },
    ]
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "meta": {"tag": [SYNTHETIC_TAG]},
        "entry": [{"resource": resource} for resource in resources],
        "note": "Synthetic samples only. The server rejects any payload that looks like real patient data.",
    }


def validate_bundle(resources: list[dict[str, object]]) -> dict[str, object]:
    missing = []
    for resource in resources:
        required = REQUIRED_FIELDS.get(str(resource.get("resourceType")), ("resourceType", "id"))
        absent = [field for field in required if not resource.get(field)]
        if absent:
            missing.append({"resource": resource.get("resourceType"), "fields": absent})
    return {"valid": not missing, "missing": missing}
