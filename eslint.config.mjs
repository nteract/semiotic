// ESLint flat config (ESLint 9+).
//
// Migrated from .eslintrc.json during the 3.5.0 dep sweep. Behaviour matches
// the legacy config: eslint:recommended + plugin:react/recommended for all
// files, @typescript-eslint for .ts/.tsx, with the same rule overrides and
// ignore patterns.
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"

export default [
  {
    ignores: ["src/vendor/**", "dist/**", "docs/build/**", ".parcel-cache/**", "coverage/**"]
  },

  js.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node
      }
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      // Disable the classic-transform rules now that tsconfig uses
      // `"jsx": "react-jsx"`. `react-in-jsx-scope` and `jsx-uses-react`
      // both exist to enforce `import React from "react"` for the old
      // createElement transform — neither applies to the automatic runtime.
      ...reactPlugin.configs["jsx-runtime"].rules,
      // rules-of-hooks catches conditional/early-return-before-hook bugs
      // statically (e.g. the loading→data hook-count crash) — hard error.
      "react-hooks/rules-of-hooks": "error",
      // exhaustive-deps is a staged rollout: "warn" keeps it visible and
      // non-blocking (`eslint src` exits 0 on warnings, like the existing
      // no-explicit-any warnings) while the ~40 legacy call sites are cleaned
      // up incrementally. Graduate to "error" once that backlog is clear.
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/no-children-prop": "off",
      "no-empty-function": "off",
      "no-inner-declarations": "off"
    }
  },

  ...tseslint.configs.recommended.map(cfg => ({
    ...cfg,
    files: ["**/*.{ts,tsx}"]
  })),

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off",
      // typescript-eslint 8's recommended is stricter than the legacy config's
      // scope (which only wired the parser, no rule sets). Disable the rules
      // that surface codebase-wide existing patterns — each is its own follow-up
      // sweep. Re-enable individually by removing
      // its line below.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": "allow-with-description",
        "ts-check": false
      }],
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "@typescript-eslint/no-this-alias": "error"
    }
  }
]
