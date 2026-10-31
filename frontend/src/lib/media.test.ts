import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildMediaResponseHeaders, getMediaRootDir, resolveSafeMediaFile } from "@/lib/media";

describe("lib/media", () => {
  const origMediaRoot = process.env.MEDIA_ROOT;

  afterEach(() => {
    if (origMediaRoot === undefined) {
      delete process.env.MEDIA_ROOT;
    } else {
      process.env.MEDIA_ROOT = origMediaRoot;
    }
  });

  it("resolves default and custom MEDIA_ROOT directories", () => {
    delete process.env.MEDIA_ROOT;
    expect(getMediaRootDir()).toContain(path.join("backend", "media"));

    process.env.MEDIA_ROOT = "/tmp/custom-media";
    expect(getMediaRootDir()).toBe(path.resolve("/tmp/custom-media"));
  });

  it("serves allowlisted images inline and forces attachment on documents while blocking traversal", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "emmett-media-"));
    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "emmett-outside-"));
    try {
      await fs.mkdir(path.join(tempRoot, "image"), { recursive: true });
      await fs.mkdir(path.join(tempRoot, "document"), { recursive: true });
      await fs.writeFile(path.join(tempRoot, "image", "cover.png"), "png-bytes");
      await fs.writeFile(path.join(tempRoot, "document", "spec.pdf"), "pdf-bytes");
      await fs.writeFile(path.join(tempRoot, "image", "script.svg"), "<svg/>");
      await fs.writeFile(path.join(outsideDir, "secret.png"), "outside");
      await fs.symlink(
        path.join(outsideDir, "secret.png"),
        path.join(tempRoot, "image", "escape.png"),
      );

      const image = await resolveSafeMediaFile(["image", "cover.png"], tempRoot);
      expect(image).not.toBeNull();
      expect(image?.contentType).toBe("image/png");
      expect(image?.inline).toBe(true);
      const imageHeaders = buildMediaResponseHeaders(image!);
      expect(imageHeaders.get("X-Content-Type-Options")).toBe("nosniff");
      expect(imageHeaders.get("Content-Disposition")).toBeNull();

      const pdf = await resolveSafeMediaFile(["document", "spec.pdf"], tempRoot);
      expect(pdf?.inline).toBe(false);
      expect(buildMediaResponseHeaders(pdf!).get("Content-Disposition")).toBe("attachment");

      expect(await resolveSafeMediaFile([], tempRoot)).toBeNull();
      expect(await resolveSafeMediaFile(["..", "secret.png"], tempRoot)).toBeNull();
      expect(await resolveSafeMediaFile(["image/cover.png"], tempRoot)).toBeNull();
      expect(await resolveSafeMediaFile(["image", "bad\0name.png"], tempRoot)).toBeNull();
      expect(await resolveSafeMediaFile(["image", "script.svg"], tempRoot)).toBeNull();
      expect(await resolveSafeMediaFile(["image", "escape.png"], tempRoot)).toBeNull();
      expect(await resolveSafeMediaFile(["image"], tempRoot)).toBeNull();
      expect(await resolveSafeMediaFile(["image", "missing.png"], tempRoot)).toBeNull();
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });
});
