import sanitizeHtml, { type IOptions } from "sanitize-html";

/**
 * Defense-in-depth sanitizer for HTML returned by the Django API.
 *
 * The API already renders Markdown through nh3; this second, server-side boundary
 * keeps remote or legacy content from being trusted by React's raw-HTML sink.
 */
const RICH_HTML_OPTIONS: IOptions = {
  allowedTags: [
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "del",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "code",
    "pre",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "id"],
    img: ["src", "alt", "title", "width", "height"],
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
    code: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (_tagName, attributes) => {
      const { target, ...safeAttributes } = attributes;
      return {
        tagName: "a",
        attribs: {
          ...safeAttributes,
          rel: "noopener noreferrer",
          ...(target === "_blank" ? { target: "_blank" } : {}),
        },
      };
    },
  },
};

/** Sanitize untrusted API HTML before passing it to React's `dangerouslySetInnerHTML`. */
export function sanitizeRichHtml(html: string): string {
  return html ? sanitizeHtml(html, RICH_HTML_OPTIONS) : "";
}
