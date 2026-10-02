import { describe, expect, it } from "vitest";
import { gradeTone, isValidDomain, mergeSteps, normalizeDomainInput, overallSummary, recommendations, reportPath, statusLabel, type ScanSection } from "./logic";

const sections: ScanSection[] = [
  {
    id: "headers",
    label_fa: "هدرها",
    label_en: "Headers",
    checked: true,
    score: 50,
    reason_fa: "",
    reason_en: "",
    findings: [
      { key: "hsts", label_fa: "HSTS", label_en: "HSTS", status: "pass", detail_fa: "", detail_en: "", advice_fa: "", advice_en: "", snippet: "" },
      { key: "csp", label_fa: "CSP", label_en: "CSP", status: "fail", detail_fa: "", detail_en: "", advice_fa: "سیاست را تنظیم کنید", advice_en: "Set the policy", snippet: "add_header ..." },
    ],
  },
];

describe("scanner client logic", () => {
  it("normalizes whatever people paste", () => {
    expect(normalizeDomainInput("https://WWW.Example.com/path?x=1")).toBe("example.com");
    expect(normalizeDomainInput("example.com.")).toBe("example.com");
    expect(normalizeDomainInput(" user@example.com ")).toBe("example.com");
    expect(normalizeDomainInput("example.com:8443")).toBe("example.com");
  });

  it("rejects IPs and malformed labels before hitting the API", () => {
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("-bad.example.com")).toBe(false);
    expect(isValidDomain("127.0.0.1")).toBe(false);
    expect(isValidDomain("localhost")).toBe(false);
    expect(isValidDomain("")).toBe(false);
  });

  it("merges polling steps without duplicates", () => {
    const first = mergeSteps([], [{ step: "dns", state: "done", label_fa: "DNS", label_en: "DNS" }]);
    const second = mergeSteps(first, [
      { step: "dns", state: "done", label_fa: "DNS", label_en: "DNS" },
      { step: "tls", state: "done", label_fa: "TLS", label_en: "TLS" },
    ]);
    expect(second.map((step) => step.step)).toEqual(["dns", "tls"]);
  });

  it("maps grades to tones", () => {
    expect(gradeTone("A")).toBe("good");
    expect(gradeTone("C")).toBe("mid");
    expect(gradeTone("F")).toBe("bad");
  });

  it("summarizes and picks recommendations", () => {
    expect(overallSummary(sections)).toEqual({ pass: 1, warn: 0, fail: 1 });
    expect(recommendations(sections)).toHaveLength(1);
    expect(recommendations(sections)[0].snippet).toContain("add_header");
  });

  it("labels statuses and builds a noindex-carrying report path", () => {
    expect(statusLabel("warn", "fa")).toBe("هشدار");
    expect(reportPath("fa", "abc 123")).toContain("/fa/tools/check-security?id=abc%20123");
  });
});
