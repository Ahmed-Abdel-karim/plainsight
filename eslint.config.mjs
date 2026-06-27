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
  "features/**/*.test.{ts,tsx}",
];
const MACHINE_TESTS = "features/scene/state/**";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // The worker process registry is type machinery: its generics use `any` for
  // bivariant matching across heterogeneous process signatures (`unknown` fails
  // on the contravariant `execute` params). Scoped here rather than disabled
  // globally so product code stays `any`-free.
  {
    files: ["lib/listings/worker/types.ts"],
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
  // Architecture boundaries — enforced, not just documented (see docs/conventions.md).
  // Downward-only layers, no sibling-feature imports, and no deep relative chains.
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "features/**/*.{ts,tsx}",
      "data/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./lib",
              from: ["./app", "./components", "./features"],
              message:
                "lib/ is the bottom layer — it must not import app/, components/, or features/.",
            },
            {
              // data/contract.ts + data/types.ts ARE the shared domain kernel —
              // the type-only vocabulary lib's pure computation models against.
              // They sit logically below lib; the `data/` prefix is storage
              // co-location, not an IO dependency. Only data's runtime
              // (loaders/repository/selectors) is the IO layer lib must not reach.
              target: "./lib",
              from: "./data",
              except: ["./contract.ts", "./types.ts"],
              message:
                "lib/ may model against the data/contract + data/types domain kernel, but must not import data/ runtime (loaders/repository/selectors).",
            },
            {
              target: "./data",
              from: ["./app", "./components", "./features"],
              message:
                "data/ may import lib/ only — not app/, components/, or features/.",
            },
            {
              target: "./components",
              from: ["./app", "./features"],
              message:
                "components/ is shared UI — it must not import app/ or features/.",
            },
            {
              target: "./features",
              from: ["./app"],
              message: "features/ must not import app/.",
            },
            {
              target: "./app",
              from: "./features",
              except: ["./home/index.ts", "./scene/index.ts"],
              message:
                "app/ must import features through their root public API.",
            },
            {
              target: "./features/home",
              from: ["./features/scene"],
              message: "A feature must not import a sibling feature.",
            },
            {
              target: "./features/scene",
              from: ["./features/home"],
              message: "A feature must not import a sibling feature.",
            },
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../../**"],
              message:
                "No deep relative imports (3+ levels up). Use the @/ alias, e.g. @/features/scene/… or @/components/….",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);

export default eslintConfig;
