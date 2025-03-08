import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parse } from "../src/index";

it("should parse apache index files (F=0)", () => {
  const html = readFileSync("./test/fixtures/F0/unicode-org-f0-directory.html", "utf-8");

  const entry = parse(html, "F0");

  expect(entry).toBeDefined();

  const paths = entry?.children.map((entry) => entry.path);

  expect(paths).toStrictEqual([
    "/Public/emoji/1.0/",
    "/Public/emoji/2.0/",
    "/Public/emoji/3.0/",
    "/Public/emoji/4.0/",
    "/Public/emoji/5.0/",
    "/Public/emoji/11.0/",
    "/Public/emoji/12.0/",
    "/Public/emoji/12.1/",
    "/Public/emoji/13.0/",
    "/Public/emoji/13.1/",
    "/Public/emoji/14.0/",
    "/Public/emoji/15.0/",
    "/Public/emoji/15.1/",
    "/Public/emoji/16.0/",
    "/Public/emoji/17.0/",
    "/Public/emoji/ReadMe.txt",
    "/Public/emoji/latest/",
  ]);

  const files = entry?.children.filter((entry) => entry.type === "file");

  expect(files).toHaveLength(1);
  expect(files).toStrictEqual([
    {
      type: "file",
      name: "ReadMe.txt",
      path: "/Public/emoji/ReadMe.txt",
      lastModified: expect.any(Number),
    },
  ]);
});

it("should parse apache index files (F=1)", () => {
  const html = readFileSync("./test/fixtures/F1/unicode-org-f1-directory.html", "utf-8");

  const entry = parse(html, "F1");

  expect(entry).toBeDefined();

  const paths = entry?.children.map((entry) => entry.path);

  expect(paths).toStrictEqual([
    "/Public/emoji/1.0/",
    "/Public/emoji/2.0/",
    "/Public/emoji/3.0/",
    "/Public/emoji/4.0/",
    "/Public/emoji/5.0/",
    "/Public/emoji/11.0/",
    "/Public/emoji/12.0/",
    "/Public/emoji/12.1/",
    "/Public/emoji/13.0/",
    "/Public/emoji/13.1/",
    "/Public/emoji/14.0/",
    "/Public/emoji/15.0/",
    "/Public/emoji/15.1/",
    "/Public/emoji/16.0/",
    "/Public/emoji/17.0/",
    "/Public/emoji/ReadMe.txt",
    "/Public/emoji/latest/",
  ]);

  const files = entry?.children.filter((entry) => entry.type === "file");

  expect(files).toHaveLength(1);
  expect(files).toStrictEqual([
    {
      type: "file",
      name: "ReadMe.txt",
      path: "/Public/emoji/ReadMe.txt",
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
    "/Public/emoji/1.0/",
    "/Public/emoji/2.0/",
    "/Public/emoji/3.0/",
    "/Public/emoji/4.0/",
    "/Public/emoji/5.0/",
    "/Public/emoji/11.0/",
    "/Public/emoji/12.0/",
    "/Public/emoji/12.1/",
    "/Public/emoji/13.0/",
    "/Public/emoji/13.1/",
    "/Public/emoji/14.0/",
    "/Public/emoji/15.0/",
    "/Public/emoji/15.1/",
    "/Public/emoji/16.0/",
    "/Public/emoji/17.0/",
    "/Public/emoji/ReadMe.txt",
    "/Public/emoji/latest/",
  ]);

  const files = entry?.children.filter((entry) => entry.type === "file");

  expect(files).toHaveLength(1);
  expect(files).toStrictEqual([
    {
      type: "file",
      name: "ReadMe.txt",
      path: "/Public/emoji/ReadMe.txt",
      lastModified: expect.any(Number),
    },
  ]);
});
