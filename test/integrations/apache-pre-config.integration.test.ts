import type { StartedTestContainer } from "testcontainers";
import path from "node:path";
import { GenericContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  testdir,
} from "vitest-testdirs";
import { inferFormat, parse } from "../../src";

// eslint-disable-next-line test/prefer-lowercase-title
describe("Apache Integration Test (Pre Config)", async () => {
  let apacheContainer: StartedTestContainer;
  const testdirPath = await testdir({
    "ReadMe.txt": `This is a test directory for Apache integration tests.`,
    "hello.txt": `Hello, world!`,
    "file with spaces.txt": `File with spaces in name`,
    "file-with-dashes.css": `/* CSS file */`,
    "file_with_underscores.js": `// JavaScript file`,
    "UPPERCASE-FILE.XML": `<?xml version='1.0'?>`,
    "nested": {
      "nestedFile.txt": `This is a nested file.`,
      "subdir": {
        "subdirFile.txt": `This is a file in a subdirectory.`,
      },
    },
  });

  beforeAll(async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    apacheContainer = await new GenericContainer("httpd:2.4-alpine")
      .withExposedPorts(80)
      .withCommand([
        "sh",
        "-c",
        `apk add --no-cache tzdata && `
        + `ln -snf /usr/share/zoneinfo/${timezone} /etc/localtime && `
        + `echo "${timezone}" > /etc/timezone && `
        + `exec httpd-foreground`,
      ])
      .withEnvironment({
        TZ: timezone,
      })
      .withBindMounts([
        {
          source: path.resolve("./test/configs/apache-pre.conf"),
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

  function getContainerUrl() {
    const port = apacheContainer.getMappedPort(80);
    const host = apacheContainer.getHost();
    return `http://${host}:${port}/`;
  }

  it("infer format", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();

    expect(response.ok).toBe(true);
    const inferredFormat = inferFormat(html);
    expect(inferredFormat).toBe("F1");
  });

  it("should parse Apache's pre-formatted directory listing", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();

    expect(response.ok).toBe(true);
    const entries = parse(html);

    expect(entries).toBeDefined();
    expect(entries.length).toBeGreaterThan(0);

    expect(entries.some((child) => child.path === "ReadMe.txt")).toBe(true);
    expect(entries.some((child) => child.path === "hello.txt")).toBe(true);
    expect(entries.some((child) => child.path === "nested")).toBe(true);
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

  it("should include lastModified dates in pre format", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();
    const entries = parse(html);

    // F1 format should include lastModified dates
    const filesWithDates = entries.filter((c) => c.lastModified);
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
    const entries = parse(html);

    const files = entries.filter((c) => c.type === "file");
    const directories = entries.filter((c) => c.type === "directory");

    expect(files.length).toBeGreaterThan(0);
    expect(directories.length).toBeGreaterThan(0);

    // Check specific types
    expect(files.some((f) => f.name === "ReadMe.txt")).toBe(true);
    expect(directories.some((d) => d.name === "nested")).toBe(true);
  });
});
