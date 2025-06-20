import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inferFormat, parse } from "../src";
import { createFixture } from "./__utils";

const fixture = createFixture("F1");

// eslint-disable-next-line test/prefer-lowercase-title
describe("F1", () => {
  it("auto-inferred format", () => {
    const html = readFileSync(fixture("unicode-org.html"), "utf-8");

    const format = inferFormat(html);

    expect(format).toBe("F1");
  });

  it("unicode.org's public directory listing", () => {
    const html = readFileSync(fixture("unicode-org.html"), "utf-8");

    const entry = parse(html, "F1");

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

  it("parse directory", () => {
    const html = readFileSync(fixture("directory.html"), "utf-8");

    const entry = parse(html, "F1");

    expect(entry).toBeDefined();

    const paths = entry?.children.map((entry) => entry.path);

    expect(paths).toStrictEqual([
      "file%20with%20spaces.txt",
      "file-with-dashes.html",
      "file_with_underscores.json",
      "level2/",
      "simple.txt",
      "%d1%84%d0%b0%d0%b9%d0%bb.txt",
    ]);
  });

  it("parse special files", () => {
    const html = readFileSync(fixture("special-files.html"), "utf-8");

    const entry = parse(html, "F0");

    expect(entry).toBeDefined();

    const paths = entry?.children.map((entry) => entry.path);

    expect(paths).toStrictEqual([
      "ReadMe.txt",
      "UPPERCASE-FILE.XML",
      "file%20with%20spaces.html",
      "file%22with%22double%22quotes.rb",
      "file%23with%23hash.py",
      "file%2520with%2520url%2520encoding.html",
      "file&amp;with&amp;ampersands.php",
      "file",
      "file(with)parentheses.txt",
      "file+with+plus+signs.txt",
      "file,with,commas.csv",
      "file-with-dashes.css",
      "file.with.dots.json",
      "file@with@symbols.md",
      "file%5bwith%5dbrackets.log",
      "file_with_underscores.js",
      "hello/",
      "level1/",
      "many-files/",
      "normal-file.txt",
    ]);
  });
});
