import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "../src/index";

it("should parse apache index files (F=0)", () => {
  const html = readFileSync("./test/fixtures/F0/unicode-org-f0-directory.html", "utf-8");

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

it("should parse apache index files (F=1)", () => {
  const html = readFileSync("./test/fixtures/F1/unicode-org-f1-directory.html", "utf-8");

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

it("should parse apache index files (F=2)", () => {
  const html = readFileSync("./test/fixtures/F2/unicode-org-f2-directory.html", "utf-8");

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

describe("auto-inferred format", () => {
  it("should parse apache index files (infer: F0)", () => {
    const html = readFileSync("./test/fixtures/F0/unicode-org-f0-directory.html", "utf-8");

    const entry = parse(html);

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

    const lastModified = entry?.children.map((entry) => entry.lastModified);

    expect(lastModified?.every((date) => date === undefined)).toBe(true);

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

  it("should parse apache index files (infer: F1)", () => {
    const html = readFileSync("./test/fixtures/F1/unicode-org-f1-directory.html", "utf-8");

    const entry = parse(html);

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

    const lastModified = entry?.children.map((entry) => entry.lastModified);

    expect(lastModified?.every((date) => date === undefined)).toBe(false);

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
