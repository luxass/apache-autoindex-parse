import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["unicorn", "typescript", "oxc"],
  categories: {
    correctness: "error",
    perf: "error",
    suspicious: "error",
    pedantic: "warn",
  },
  rules: {
    "eslint/no-await-in-loop": "off",
    "no-console": ["error", { allow: ["error"] }],
    "no-shadow": "off",
    "eslint/eqeqeq": ["warn", "always", { null: "ignore" }],
    "typescript/no-explicit-any": "error",
    curly: "off",
  },
  ignorePatterns: ["test/fixtures/**"],
});
