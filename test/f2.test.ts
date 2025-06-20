import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inferFormat, parse } from "../src";
import { createFixture } from "./__utils";

const fixture = createFixture("F2");

// eslint-disable-next-line test/prefer-lowercase-title
describe("F2", () => {
  it("auto-inferred format", () => {
    const html = readFileSync(fixture("unicode-org.html"), "utf-8");

    const format = inferFormat(html);

    expect(format).toBe("F2");
  });

  it("unicode.org's public directory listing", () => {
    const html = readFileSync(fixture("unicode-org.html"), "utf-8");

    const entry = parse(html, "F2");

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
        lastModified: expect.any(Number),
      },
    ]);
  });

  it("parse root directory", () => {
    const html = readFileSync(fixture("directory.html"), "utf-8");

    const entry = parse(html, "F2");

    expect(entry).toBeDefined();

    const paths = entry?.children.map((entry) => entry.path);

    expect(paths).toStrictEqual([
      "apache-autoindex-parse/",
      "apache-autoindex-parse-2/",
      "apache-autoindex-parse-3/",
      "apache-autoindex-parse-4/",
      "apache-autoindex-parse-5/",
      "apache-autoindex-parse-6/",
      "apache-autoindex-parse-7/",
      "apache-autoindex-parse-8/",
    ]);
  });
});
