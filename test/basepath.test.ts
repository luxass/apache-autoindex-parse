import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { parse } from "../src";
import { traverse } from "../src/traverse";
import { createFixture } from "./__utils";

const fixtureF0 = createFixture("F0");
const fixtureF1 = createFixture("F1");
const fixtureF2 = createFixture("F2");

describe("basePath option", () => {
  describe.each([
    ["F0" as const, fixtureF0],
    ["F1" as const, fixtureF1],
    ["F2" as const, fixtureF2],
  ])("%s", (format, fixture) => {
    it("prepends basePath to all entry paths", () => {
      const html = readFileSync(fixture("directory.html"), "utf-8");
      const entries = parse(html, { format, basePath: "/cdn/unicode" });

      const paths = entries.map((e) => e.path);

      expect(paths.every((p) => p.startsWith("/cdn/unicode/"))).toBe(true);
      expect(paths).toContain("/cdn/unicode/simple.txt");
      expect(paths).toContain("/cdn/unicode/level2");
    });

    it("normalizes basePath without leading slash", () => {
      const html = readFileSync(fixture("directory.html"), "utf-8");
      const entries = parse(html, { format, basePath: "public" });

      const paths = entries.map((e) => e.path);

      expect(paths.every((p) => p.startsWith("/public/"))).toBe(true);
      expect(paths).toContain("/public/simple.txt");
      expect(paths).toContain("/public/level2");
    });

    it("strips trailing slash from basePath", () => {
      const html = readFileSync(fixture("directory.html"), "utf-8");
      const entries = parse(html, { format, basePath: "/public/" });

      const paths = entries.map((e) => e.path);

      expect(paths.every((p) => p.startsWith("/public/"))).toBe(true);
      expect(paths.every((p) => !p.includes("//"))).toBe(true);
      expect(paths).toContain("/public/simple.txt");
    });

    it("works with nested basePath", () => {
      const html = readFileSync(fixture("unicode-org.html"), "utf-8");
      const entries = parse(html, { format, basePath: "/cdn/unicode/public" });

      const paths = entries.map((e) => e.path);

      expect(paths.every((p) => p.startsWith("/cdn/unicode/public/"))).toBe(true);
    });

    it("returns unmodified paths when basePath is omitted", () => {
      const html = readFileSync(fixture("directory.html"), "utf-8");
      const entries = parse(html, { format });

      const paths = entries.map((e) => e.path);

      expect(paths).toContain("simple.txt");
      expect(paths.every((p) => !p.startsWith("/"))).toBe(true);
    });
  });

  it("preserves entry metadata with basePath", () => {
    const html = readFileSync(fixtureF2("unicode-org.html"), "utf-8");
    const entries = parse(html, { format: "F2", basePath: "/archive" });

    const dir = entries.find((e) => e.type === "directory");
    const file = entries.find((e) => e.type === "file");

    expect(dir).toBeDefined();
    expect(dir!.path).toBe("/archive/1.1-Update");
    expect(dir!.name).toBe("1.1-Update");

    expect(file).toBeDefined();
    expect(file!.path).toBe("/archive/ReadMe.txt");
    expect(file!.name).toBe("ReadMe.txt");
    expect(file!.lastModified).toBeDefined();
  });
});

describe("traverse with basePath", () => {
  it("prepends basePath to all traversed entries", async () => {
    const rootHtml = readFileSync(fixtureF2("directory.html"), "utf-8");

    // Return empty HTML for nested requests to prevent infinite recursion
    const emptyHtml = "<html><body></body></html>";

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(rootHtml) })
      .mockResolvedValue({ ok: true, text: () => Promise.resolve(emptyHtml) });

    vi.stubGlobal("fetch", mockFetch);

    const entries = await traverse("http://example.com/test/", {
      format: "F2",
      basePath: "/cdn/files",
    });

    expect(entries.length).toBeGreaterThan(0);

    const paths = entries.map((e) => e.path);

    expect(paths.every((p) => p.startsWith("/cdn/files/"))).toBe(true);

    const simpleFile = entries.find((e) => e.name === "simple.txt");
    expect(simpleFile!.path).toBe("/cdn/files/simple.txt");

    const level2Dir = entries.find((e) => e.name === "level2");
    expect(level2Dir!.path).toBe("/cdn/files/level2");

    vi.unstubAllGlobals();
  });

  it("calls onFile callback with prefixed paths", async () => {
    const html = readFileSync(fixtureF2("directory.html"), "utf-8");
    const emptyHtml = "<html><body></body></html>";

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) })
      .mockResolvedValue({ ok: true, text: () => Promise.resolve(emptyHtml) });

    vi.stubGlobal("fetch", mockFetch);

    const filePaths: string[] = [];
    const onFile = vi.fn((file) => {
      filePaths.push(file.path);
    });

    await traverse("http://example.com/test/", {
      format: "F2",
      basePath: "/archive",
      onFile,
    });

    expect(onFile).toHaveBeenCalled();
    expect(filePaths.every((p) => p.startsWith("/archive/"))).toBe(true);
    expect(filePaths).toContain("/archive/simple.txt");

    vi.unstubAllGlobals();
  });

  it("calls onDirectory callback with prefixed paths", async () => {
    const rootHtml = readFileSync(fixtureF2("directory.html"), "utf-8");
    const emptyHtml = "<html><body></body></html>";

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(rootHtml) })
      .mockResolvedValue({ ok: true, text: () => Promise.resolve(emptyHtml) });

    vi.stubGlobal("fetch", mockFetch);

    const dirPaths: string[] = [];
    const onDirectory = vi.fn((dir) => {
      dirPaths.push(dir.path);
    });

    await traverse("http://example.com/test/", {
      format: "F2",
      basePath: "/cdn",
      onDirectory,
    });

    expect(onDirectory).toHaveBeenCalled();
    expect(dirPaths.every((p) => p.startsWith("/cdn/"))).toBe(true);
    expect(dirPaths).toContain("/cdn/level2");

    vi.unstubAllGlobals();
  });

  it("returns unmodified paths when basePath is omitted", async () => {
    const html = readFileSync(fixtureF2("directory.html"), "utf-8");
    const emptyHtml = "<html><body></body></html>";

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) })
      .mockResolvedValue({ ok: true, text: () => Promise.resolve(emptyHtml) });

    vi.stubGlobal("fetch", mockFetch);

    const entries = await traverse("http://example.com/test/", {
      format: "F2",
    });

    expect(entries.length).toBeGreaterThan(0);

    const paths = entries.map((e) => e.path);
    expect(paths.every((p) => !p.startsWith("/"))).toBe(true);

    const simpleFile = entries.find((e) => e.name === "simple.txt");
    expect(simpleFile!.path).toBe("simple.txt");

    vi.unstubAllGlobals();
  });
});
