import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inferFormat, parse } from "../src";
import { createFixture } from "./__utils";

const fixture = createFixture("F1");

// eslint-disable-next-line test/prefer-lowercase-title
describe("F0", () => {
  it("auto-inferred format", () => {
    const html = readFileSync(fixture("unicode-org.html"), "utf-8");

    const format = inferFormat(html);

    expect(format).toBe("F0");
  });

  it("unicode.org's public directory listing", () => {
    const html = readFileSync(fixture("unicode-org.html"), "utf-8");

    const entry = parse(html, "F0");

    expect(entry).toBeDefined();

    const paths = entry?.children.map((entry) => entry.path);

    expect(paths).toStrictEqual([
      "1.0/",
      "2.0/",
      "3.0/",
      "4.0/",
      "5.0/",
      "11.0/",
      "12.0/",
      "12.1/",
      "13.0/",
      "13.1/",
      "14.0/",
      "15.0/",
      "15.1/",
      "16.0/",
      "17.0/",
      "ReadMe.txt",
      "latest/",
    ]);

    const files = entry?.children.filter((entry) => entry.type === "file");

    expect(files).toHaveLength(1);
    expect(files).toStrictEqual([
      {
        type: "file",
        name: "ReadMe.txt",
        path: "ReadMe.txt",
        lastModified: undefined,
      },
    ]);
  });
});
