/**
 * Synthetic FHIR R4 samples for the F-09 tab.
 *
 * HARD RULE (card F-09 · prompt §2.3): only sample data. Nothing here is derived from a real
 * person; identifiers are obvious placeholders, `gender` stays `unknown`, and there is no
 * birth date, address, phone number or national identifier field anywhere in the shape.
 * The code system below is our own `emmett.example` namespace precisely because these are
 * teaching examples, not licensed LOINC/SNOMED codes.
 */
import type { AnalysisResult } from "./logic";

export type FhirResource = Record<string, unknown> & { resourceType: string };

export const SYNTHETIC_TAG = {
  system: "https://emmett.example/fhir/synthetic-data",
  code: "synthetic-sample",
  display: "Synthetic sample data — never a real patient",
};

export const REQUIRED_FIELDS: Record<string, string[]> = {
  Patient: ["resourceType", "id", "name", "gender"],
  Observation: ["resourceType", "id", "status", "code", "subject", "valueQuantity"],
  Encounter: ["resourceType", "id", "status", "class", "subject", "period"],
};

/** Field names that would indicate real patient data; the server rejects payloads carrying them. */
export const PATIENT_DATA_FIELDS = [
  "national_id",
  "nationalId",
  "kod_melli",
  "kodemelli",
  "insurance_id",
  "patient_name",
  "phone",
  "mobile",
  "address",
  "birth_date",
  "passport",
];

export function sampleFhir(result: AnalysisResult): FhirResource[] {
  const subject = { reference: "Patient/sample-patient-0001", display: "Synthetic sample patient" };
  return [
    {
      resourceType: "Patient",
      id: "sample-patient-0001",
      meta: { tag: [SYNTHETIC_TAG] },
      active: true,
      name: [{ use: "official", family: "Sample", given: ["Synthetic"] }],
      gender: "unknown",
      text: { status: "generated", div: "Synthetic sample patient — not a real person." },
    },
    {
      resourceType: "Observation",
      id: "sample-observation-gc-0001",
      meta: { tag: [SYNTHETIC_TAG] },
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
              display: "Laboratory",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "https://emmett.example/fhir/synthetic-codes",
            code: "SEQ-GC",
            display: "GC content of a submitted sequence (percent)",
          },
        ],
        text: "GC content (percent)",
      },
      subject,
      effectiveDateTime: "2020-01-01T00:00:00Z",
      valueQuantity: {
        value: Math.round(result.composition.gcPercent * 100) / 100,
        unit: "%",
        system: "http://unitsofmeasure.org",
        code: "%",
      },
      note: [{ text: "Computed locally in the browser from a public reference sequence." }],
    },
    {
      resourceType: "Encounter",
      id: "sample-encounter-0001",
      meta: { tag: [SYNTHETIC_TAG] },
      status: "finished",
      class: {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "AMB",
        display: "ambulatory",
      },
      subject,
      period: { start: "2020-01-01T00:00:00Z", end: "2020-01-01T00:30:00Z" },
      reasonCode: [{ text: "In-silico sequence analysis (educational sample)" }],
    },
  ];
}

export type ValidationReport = { valid: boolean; missing: { resource: string; fields: string[] }[] };

export function validateFhir(resources: FhirResource[]): ValidationReport {
  const missing: { resource: string; fields: string[] }[] = [];
  for (const resource of resources) {
    const required = REQUIRED_FIELDS[resource.resourceType] ?? ["resourceType", "id"];
    const absent = required.filter((field) => {
      const value = resource[field];
      if (value === undefined || value === null) return true;
      if (typeof value === "string") return value.trim() === "";
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === "object") {
        const quantity = value as { value?: unknown; unit?: unknown };
        return quantity.value === undefined || (quantity.unit !== undefined && quantity.unit === "");
      }
      return false;
    });
    if (absent.length) missing.push({ resource: resource.resourceType, fields: absent });
  }
  return { valid: missing.length === 0, missing };
}
