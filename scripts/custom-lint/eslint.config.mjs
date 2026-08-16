import tseslint from "typescript-eslint"
import semiotic from "./index.mjs"

export default [
  {
    ignores: ["src/vendor/**", "dist/**", "docs/build/**", "coverage/**"]
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}", "docs/src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: { semiotic },
    rules: {
      "semiotic/frame-props-last": "error",
      "semiotic/family-subpath-imports": "error",
      "semiotic/interaction-test-layout-control": "error"
    }
  }
]
