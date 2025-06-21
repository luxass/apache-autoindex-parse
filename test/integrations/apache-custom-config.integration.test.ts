import type { StartedTestContainer } from "testcontainers";
import path from "node:path";
import { GenericContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testdir } from "vitest-testdirs";
import { inferFormat, parse } from "../../src";

// eslint-disable-next-line test/prefer-lowercase-title
describe("Apache Custom Config Integration Test", async () => {
  let apacheContainer: StartedTestContainer;
  const testdirPath = await testdir({
    "ReadMe.txt": "This is a test directory for Apache integration tests.",
    "normal-file.html": "<h1>Normal File</h1>",
    "file with spaces.txt": "File with spaces in name",
    "file-with-dashes.css": "/* CSS file */",
    "file_with_underscores.js": "// JavaScript file",
    "file.with.dots.json": "{\"test\": true}",
    "UPPERCASE-FILE.XML": "<?xml version='1.0'?>",
    "file(with)parentheses.log": "Log file content",
    "file[with]brackets.md": "# Markdown file",
    "nested": {
      "nestedFile.txt": "This is a nested file.",
      "special chars": {
        "файл.txt": "Unicode filename",
        "中文文件.txt": "Chinese filename",
      },
      "deep": {
        level: {
          "deepFile.txt": "Deep nested file",
        },
      },
    },
    "many-files": Array.from({ length: 10 }, (_, i) => ({
      [`file-${String(i + 1).padStart(3, "0")}.txt`]: `Content of file ${i + 1}`,
    })).reduce((acc, obj) => ({ ...acc, ...obj }), {}),
  });

  beforeAll(async () => {
    apacheContainer = await new GenericContainer("httpd:2.4-alpine")
      .withExposedPorts(80)
      .withBindMounts([
        {
          source: path.resolve("./test/configs/apache-fancy.conf"),
          target: "/usr/local/apache2/conf/httpd.conf",
        },
        {
          source: testdirPath,
          target: "/usr/local/apache2/htdocs",
        },
      ])
      .start();
  });

  afterAll(async () => {
    await apacheContainer.stop();
  });

  function getContainerUrl(path = "/") {
    const port = apacheContainer.getMappedPort(80);
    const host = apacheContainer.getHost();
    return `http://${host}:${port}${path}`;
  }

  it("should start container successfully", async () => {
    const response = await fetch(getContainerUrl());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("should infer fancy format (F2)", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();
    const inferredFormat = inferFormat(html);

    expect(inferredFormat).toBe("F2");
  });

  it("should parse root directory correctly", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();
    const parsed = parse(html);

    expect(parsed).toBeDefined();
    expect(parsed?.type).toBe("directory");
    expect(parsed?.path).toBe("/");
    expect(parsed?.children).toBeDefined();

    const children = parsed?.children || [];
    expect(children.length).toBeGreaterThan(5);

    // Check for expected files
    const fileNames = children.map((child) => child.name);
    expect(fileNames).toContain("ReadMe.txt");
    expect(fileNames).toContain("normal-file.html");
    expect(fileNames).toContain("nested");
    expect(fileNames).toContain("many-files");
  });

  it("should handle files with special characters", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();
    const parsed = parse(html);

    const fileNames = parsed?.children.map((c) => c.name) || [];
    expect(fileNames).toContain("file with spaces.txt");
    expect(fileNames).toContain("file-with-dashes.css");
    expect(fileNames).toContain("file_with_underscores.js");
    expect(fileNames).toContain("file.with.dots.json");
    expect(fileNames).toContain("file(with)parentheses.log");
    expect(fileNames).toContain("file[with]brackets.md");
  });

  it("should parse nested directories", async () => {
    const response = await fetch(getContainerUrl("/nested/"));
    expect(response.status).toBe(200);

    const html = await response.text();
    const parsed = parse(html);

    expect(parsed).toBeDefined();
    expect(parsed?.type).toBe("directory");
    expect(parsed?.path).toBe("/nested/");

    const children = parsed?.children || [];
    expect(children.length).toBeGreaterThan(0);

    const childNames = children.map((c) => c.name);
    expect(childNames).toContain("nestedFile.txt");
    expect(childNames).toContain("special chars");
    expect(childNames).toContain("deep");
  });

  it("should handle unicode filenames", async () => {
    const response = await fetch(getContainerUrl("nested/special%20chars/"));
    expect(response.status).toBe(200);

    const html = await response.text();
    const parsed = parse(html);

    const children = parsed?.children || [];
    const fileNames = children.map((c) => c.name);

    // Unicode filenames should be parsed correctly
    expect(fileNames.some((name) => name.includes("файл") || name.includes("%"))).toBe(true);
    expect(fileNames.some((name) => name.includes("中文") || name.includes("%"))).toBe(true);
  });

  it("should parse many files directory", async () => {
    const response = await fetch(getContainerUrl("/many-files/"));
    expect(response.status).toBe(200);

    const html = await response.text();
    const parsed = parse(html);

    expect(parsed).toBeDefined();
    expect(parsed?.children.length).toBe(10);

    const fileNames = parsed?.children.map((c) => c.name) || [];
    expect(fileNames).toContain("file-001.txt");
    expect(fileNames).toContain("file-010.txt");
  });

  it("should extract lastModified dates", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();
    const parsed = parse(html);

    const children = parsed?.children || [];

    // F2 format should include lastModified dates
    const filesWithDates = children.filter((c) => c.lastModified);
    expect(filesWithDates.length).toBeGreaterThan(0);

    // Dates should be reasonable (within last hour)
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    filesWithDates.forEach((file) => {
      expect(file.lastModified).toBeGreaterThan(oneHourAgo);
      expect(file.lastModified).toBeLessThanOrEqual(now);
    });
  });

  it("should differentiate between files and directories", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();
    const parsed = parse(html);

    const children = parsed?.children || [];
    const files = children.filter((c) => c.type === "file");
    const directories = children.filter((c) => c.type === "directory");

    expect(files.length).toBeGreaterThan(0);
    expect(directories.length).toBeGreaterThan(0);

    // Check specific types
    expect(files.some((f) => f.name === "ReadMe.txt")).toBe(true);
    expect(directories.some((d) => d.name === "nested")).toBe(true);

    // Directories should have children array
    directories.forEach((dir) => {
      expect(dir).toHaveProperty("children");
      expect(Array.isArray((dir as any).children)).toBe(true);
    });

    // Files should not have children property
    files.forEach((file) => {
      expect(file).not.toHaveProperty("children");
    });
  });
});
