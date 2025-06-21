import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/traverse.ts",
  ],
  format: ["cjs", "esm"],
  exports: true,
  clean: true,
  dts: true,
  noExternal: [
    "node-html-parser",
  ],
  treeshake: true,
  publint: true,
});
