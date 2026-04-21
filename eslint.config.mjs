// ESLint flat config (ESLint 9+).
//
// Migrated from .eslintrc.json during the 3.5.0 dep sweep. Behaviour matches
// the legacy config: eslint:recommended + plugin:react/recommended for all
// files, @typescript-eslint for .ts/.tsx, with the same rule overrides and
// ignore patterns.
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
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
      react: reactPlugin
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
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
      // sweep, tracked in OUTSTANDING_WORK.md. Re-enable individually by removing
      // its line below.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      // ~15 sites using the bare `Function` type — real type-safety debt worth
      // a dedicated sweep but not a migration blocker.
      "@typescript-eslint/no-unsafe-function-type": "off",
      // One site in RingBuffer.ts uses the `const self = this` pattern.
      "@typescript-eslint/no-this-alias": "off"
    }
  }
]
