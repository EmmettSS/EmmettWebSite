import { describe, expect, it, vi } from "vitest";
import { base64UrlDecode, decodeJwt, describeTime, SEVERITY_LABELS } from "./logic";

const NOW = new Date("2024-03-20T12:00:00Z");

function token(header: Record<string, unknown>, payload: Record<string, unknown>, signature = "signature"): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.${signature}`;
}

describe("F-05 acceptance", () => {
  /** Card test 1 — alg: none is critical. */
  it("flags alg: none as critical with a CWE reference", () => {
    const result = decodeJwt(token({ alg: "none", typ: "JWT" }, { sub: "42" }), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const warning = result.warnings.find((item) => item.id === "alg-none");
    expect(warning?.severity).toBe("critical");
    expect(warning?.cwe).toBe("CWE-347");
    expect(result.signaturePresent).toBe(false);
  });

  /** Card test 2 — expired token, with a correct Jalali rendering. */
  it("warns on an expired token and renders the Jalali date", () => {
    const exp = Math.floor(new Date("2024-03-17T08:00:00Z").getTime() / 1000);
    const result = decodeJwt(token({ alg: "RS256" }, { sub: "42", exp, iat: exp - 3600, iss: "a", aud: "b" }), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.timing.exp?.raw).toBe(exp);
    expect(result.timing.exp?.jalali).toContain("۱۴۰۲");
    expect(result.timing.exp?.relativeFa).toContain("پیش");
    expect(result.warnings.map((item) => item.id)).toContain("expired");
  });

  /** Card test 3 — malformed base64 must not throw. */
  it("returns a clear error for malformed input instead of throwing", () => {
    expect(decodeJwt("", NOW)).toMatchObject({ ok: false, code: "empty" });
    expect(decodeJwt("only-one-part", NOW)).toMatchObject({ ok: false, code: "shape" });
    expect(decodeJwt("!!!.???.###", NOW)).toMatchObject({ ok: false, code: "base64" });
    expect(decodeJwt(`${Buffer.from("{bad json").toString("base64url")}.e30.sig`, NOW)).toMatchObject({ ok: false, code: "json" });
  });

  /** Card test 4 — decode ≠ verified. */
  it("never claims verification without a key", () => {
    const result = decodeJwt(token({ alg: "HS256" }, { sub: "42" }), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.verified).toBe(false);
    expect(result.summaryFa).toContain("decode");
  });

  /** Card test 5 (security) — decoding is fully client-side. */
  it("performs no network request while decoding", () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("F-05 must never upload a token");
    });
    const original = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      decodeJwt(token({ alg: "RS256", kid: "/etc/keys/1.pem" }, { sub: "42", exp: 2_000_000_000 }), NOW);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });

  it("detects header injection vectors", () => {
    const result = decodeJwt(token({ alg: "RS256", kid: "https://evil.example/key.pem", jku: "https://evil.example/jwks" }, { sub: "42" }), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.warnings.map((item) => item.id);
    expect(ids).toContain("kid-path");
    expect(ids).toContain("header-jku");
    expect(result.warnings.find((item) => item.id === "kid-path")?.severity).toBe("critical");
  });

  it("warns about HMAC confusion, long lifetimes and missing iss/aud", () => {
    const result = decodeJwt(token({ alg: "HS256" }, { sub: "1", iat: 1_700_000_000, exp: 1_700_000_000 + 48 * 3600 }), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.map((item) => item.id)).toEqual(expect.arrayContaining(["alg-hs", "long-lifetime", "missing-iss-aud"]));
    expect(SEVERITY_LABELS.critical.fa).toBe("بحرانی");
  });

  it("decodes base64url with padding tolerance", () => {
    expect(base64UrlDecode("eyJhIjoxfQ")).toEqual({ ok: true, text: '{"a":1}' });
    expect(base64UrlDecode("!!")).toMatchObject({ ok: false, code: "base64" });
    expect(describeTime(1_700_000_000, NOW).relativeFa).toContain("پیش");
  });
});
