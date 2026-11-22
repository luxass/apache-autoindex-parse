import type { StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll } from "vitest";

// A fresh runner may need to pull the image and install timezone data.
const APACHE_STARTUP_TIMEOUT_MS = 120_000;

/** Starts and stops one Apache container per suite and returns a URL builder. */
export function registerApacheContainer(
  start: () => Promise<StartedTestContainer>,
): (path?: string) => string {
  let container: StartedTestContainer | undefined;

  beforeAll(async () => {
    container = await start();
  }, APACHE_STARTUP_TIMEOUT_MS);

  afterAll(async () => {
    await container?.stop();
  });

  return (path = "/") => {
    if (!container) {
      throw new Error("Apache container did not start");
    }
    return `http://${container.getHost()}:${container.getMappedPort(80)}${path}`;
  };
}
