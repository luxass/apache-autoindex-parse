import { join } from "node:path";

export function createFixture(name: string): (path: string) => string {
  return (path: string) => {
    return join(import.meta.dirname, "fixtures", name, path);
  };
}
