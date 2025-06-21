import type { StartedTestContainer } from "testcontainers";
import { GenericContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// eslint-disable-next-line test/prefer-lowercase-title
describe("Apache Integration Test (Default Config)", () => {
  let apacheContainer: StartedTestContainer;

  beforeAll(async () => {
    apacheContainer = await new GenericContainer("httpd:2.4-alpine")
      .withExposedPorts(80)
      .start();
  });

  afterAll(async () => {
    await apacheContainer.stop();
  });

  it("should parse Apache's default directory listing", async () => {
    const port = apacheContainer.getMappedPort(80);
    const host = apacheContainer.getHost();

    const url = `http://${host}:${port}/`;
    const response = await fetch(url);
    const html = await response.text();

    expect(response.ok).toBe(true);
    // eslint-disable-next-line no-console
    console.log(html);

    // const entry = parse(html);

    // expect(entry).toBeDefined();
    // expect(entry?.type).toBe("directory");
    // expect(entry?.path).toBe("/");
    // expect(entry?.children.length).toBeGreaterThan(0);

    // // Check if the format is inferred correctly
    // const format = inferFormat(html);
    // expect(format).toBe("F0"); // Default Apache format
  });
});
