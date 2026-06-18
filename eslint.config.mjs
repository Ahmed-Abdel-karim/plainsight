import { defineConfig, globalIgnores } from "eslint/config";
import vitest from "@vitest/eslint-plugin";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import testingLibrary from "eslint-plugin-testing-library";

// Component test files use Testing Library; machine tests (pure XState, node env)
// do not, so the testing-library rules are scoped to exclude them.
const COMPONENT_TEST_GLOBS = [
  "app/**/*.test.{ts,tsx}",
  "components/**/*.test.{ts,tsx}",
];
const MACHINE_TESTS = "components/scene/state/**";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "design/**",
  ]),
  // Test-quality guardrails (docs/testing-strategy.md, Principle 5.2).
  // Vitest hygiene applies to every test file (recommended already errors on
  // no-focused-tests / expect-expect / valid-expect — a "test" with no assertion
  // fails lint). Disable autofix on no-focused-tests so a stray `.only` can't be
  // silently stripped.
  {
    files: ["**/*.test.{ts,tsx}"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-focused-tests": ["error", { fixable: false }],
    },
  },
  // Testing Library rules nudge role/label queries over hidden test-ids
  // (Principle 2's "meaningful signal"). DOM component tests only.
  {
    ...testingLibrary.configs["flat/react"],
    files: COMPONENT_TEST_GLOBS,
    ignores: [MACHINE_TESTS],
  },
  eslintConfigPrettier,
]);

export default eslintConfig;
