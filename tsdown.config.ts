import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/traverse.ts",
    "./src/test-utils.ts",
  ],
  format: ["cjs", "esm"],
  exports: true,
  clean: true,
  dts: true,
  treeshake: true,
  publint: true,
});
