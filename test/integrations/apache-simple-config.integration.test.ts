import path from "node:path";

import { GenericContainer } from "testcontainers";
import { describe, expect, it } from "vitest";
import { testdir } from "vitest-testdirs";

import { inferFormat, parse } from "../../src";
import { registerApacheContainer } from "./apache-container";

// eslint-disable-next-line test/prefer-lowercase-title
describe("Apache Integration Test (Simple Config)", async () => {
  const testdirPath = await testdir({
    "ReadMe.txt": `This is a test directory for Apache integration tests.`,
    "hello.txt": `Hello, world!`,
    "file with spaces.txt": `File with spaces in name`,
    "file-with-dashes.css": `/* CSS file */`,
    "file_with_underscores.js": `// JavaScript file`,
    "UPPERCASE-FILE.XML": `<?xml version='1.0'?>`,
    nested: {
      "nestedFile.txt": `This is a nested file.`,
      subdir: {
        "subdirFile.txt": `This is a file in a subdirectory.`,
      },
    },
  });

  const getContainerUrl = registerApacheContainer(() => {
    return new GenericContainer("httpd:2.4-alpine")
      .withExposedPorts(80)
      .withBindMounts([
        {
          source: path.resolve("./test/configs/apache-simple.conf"),
          target: "/usr/local/apache2/conf/httpd.conf",
        },
        {
          source: testdirPath,
          target: "/usr/local/apache2/htdocs",
        },
      ])
      .start();
  });

  it("infer format", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();

    expect(response.ok).toBe(true);
    const inferredFormat = inferFormat(html);
    expect(inferredFormat).toBe("F0");
  });

  it("should parse Apache's simple directory listing", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();

    expect(response.ok).toBe(true);

    const entries = parse(html);

    expect(entries).toBeDefined();
    expect(entries.length).toBeGreaterThan(0);

    expect(entries.some((child) => child.path === "ReadMe.txt")).toBe(true);
    expect(entries.some((child) => child.path === "hello.txt")).toBe(true);
    expect(entries.some((child) => child.path === "nested/")).toBe(true);
  });

  it("should handle files with special characters", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();
    const entries = parse(html);

    const fileNames = entries.map((c) => c.name);

    expect(fileNames).toContain("file with spaces.txt");
    expect(fileNames).toContain("file-with-dashes.css");
    expect(fileNames).toContain("file_with_underscores.js");
    expect(fileNames).toContain("UPPERCASE-FILE.XML");
  });

  it("should not include lastModified dates in simple format", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();
    const entries = parse(html);

    // F0 format should not include lastModified dates
    const filesWithDates = entries.filter((c) => c.lastModified);
    expect(filesWithDates.length).toBe(0);
  });
});
