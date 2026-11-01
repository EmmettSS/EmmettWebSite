import { describe, expect, it } from "vitest";

import { sanitizeRichHtml } from "./sanitize-rich-html";

describe("sanitizeRichHtml", () => {
  it("preserves allowed Markdown while removing scripts and event handlers", () => {
    const sanitized = sanitizeRichHtml(
      '<h2 id="summary">Summary</h2><p onclick="alert(1)">safe</p><script>alert(2)</script><img src="/media/cover.png" alt="cover" onerror="alert(3)">',
    );

    expect(sanitized).toContain('<h2 id="summary">Summary</h2>');
    expect(sanitized).toContain("<p>safe</p>");
    expect(sanitized).toContain('<img src="/media/cover.png" alt="cover" />');
    expect(sanitized).not.toMatch(/<script|onclick|onerror|alert\(/i);
  });

  it("removes dangerous URL schemes and hardens links opened in a new tab", () => {
    const sanitized = sanitizeRichHtml(
      '<a href="javascript:alert(1)">bad</a><a href="//evil.example" target="_blank" rel="opener">link</a><a href="https://safe.example" target="_blank">safe</a>',
    );

    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("//evil.example");
    expect(sanitized).toContain('href="https://safe.example"');
    expect(sanitized).toContain('target="_blank"');
    expect(sanitized).toContain('rel="noopener noreferrer"');
    expect(sanitized).not.toContain('rel="opener"');
  });

  it("drops unapproved embedded content and data URLs", () => {
    const sanitized = sanitizeRichHtml(
      '<svg onload="alert(1)"><script>alert(2)</script></svg><iframe src="https://evil.example"></iframe><img src="data:text/html,evil">',
    );

    expect(sanitized).not.toMatch(/<svg|<script|<iframe|onload|data:text\/html/i);
  });

  it("returns an empty string for empty API content", () => {
    expect(sanitizeRichHtml("")).toBe("");
  });
});
