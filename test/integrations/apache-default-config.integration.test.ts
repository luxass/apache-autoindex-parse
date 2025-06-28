import type { StartedTestContainer } from "testcontainers";
import { GenericContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  testdir,
} from "vitest-testdirs";
import { inferFormat, parse } from "../../src";

// eslint-disable-next-line test/prefer-lowercase-title
describe("Apache Integration Test (Default Config)", async () => {
  let apacheContainer: StartedTestContainer;
  const testdirPath = await testdir({
    "ReadMe.txt": `This is a test directory for Apache integration tests.`,
    "hello.txt": `Hello, world!`,
    "nested": {
      "nestedFile.txt": `This is a nested file.`,
      "subdir": {
        "subdirFile.txt": `This is a file in a subdirectory.`,
      },
    },
  });

  beforeAll(async () => {
    apacheContainer = await new GenericContainer("httpd:2.4-alpine")
      .withExposedPorts(80)
      .withBindMounts([
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
    expect(inferredFormat).toBe("F0");
  });

  it("should parse Apache's default directory listing", async () => {
    const response = await fetch(getContainerUrl());
    const html = await response.text();

    expect(response.ok).toBe(true);

    const entries = parse(html);

    expect(entries).toBeDefined();
    expect(entries.length).toBeGreaterThan(0);

    expect(entries.some((child) => child.path === "ReadMe.txt")).toBe(true);
    expect(entries.some((child) => child.path === "hello.txt")).toBe(true);
  });
});
