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
      "1.1-Update/",
      "2.0-Update/",
      "2.1-Update/",
      "2.1-Update2/",
      "2.1-Update3/",
      "2.1-Update4/",
      "3.0-Update/",
      "3.0-Update1/",
      "3.1-Update/",
      "3.1-Update1/",
      "3.2-Update/",
      "4.0-Update/",
      "4.0-Update1/",
      "4.1.0/",
      "5.0.0/",
      "5.1.0/",
      "5.2.0/",
      "6.0.0/",
      "6.1.0/",
      "6.2.0/",
      "6.3.0/",
      "7.0.0/",
      "8.0.0/",
      "9.0.0/",
      "10.0.0/",
      "11.0.0/",
      "12.0.0/",
      "12.1.0/",
      "13.0.0/",
      "14.0.0/",
      "15.0.0/",
      "15.1.0/",
      "16.0.0/",
      "17.0.0/",
      "CTT/",
      "MAPPINGS/",
      "PROGRAMS/",
      "ReadMe.txt",
      "UCA/",
      "UCD/",
      "UNIDATA/",
      "cldr/",
      "draft/",
      "emoji/",
      "idna/",
      "math/",
      "reconstructed/",
      "security/",
      "vertical/",
      "zipped/",
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
});
