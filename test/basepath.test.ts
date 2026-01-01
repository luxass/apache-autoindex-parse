import type { AutoIndexFormat } from "../src";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "../src";
import { createFixture } from "./__utils";

const fixtureF0 = createFixture("F0");
const fixtureF1 = createFixture("F1");
const fixtureF2 = createFixture("F2");

const formats: AutoIndexFormat[] = ["F0", "F1", "F2"];
const fixtures = { F0: fixtureF0, F1: fixtureF1, F2: fixtureF2 };

describe("basePath option", () => {
  describe.each(formats)("%s", (format) => {
    const fixture = fixtures[format];

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
