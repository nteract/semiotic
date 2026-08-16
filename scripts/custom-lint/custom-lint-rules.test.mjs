import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { Linter } from "eslint"
import tseslint from "typescript-eslint"
import semiotic from "./index.mjs"

function lint(code, ruleId, filename) {
  const linter = new Linter({ configType: "flat" })
  return linter.verify(code, [{
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } }
    },
    plugins: { semiotic },
    rules: { [ruleId]: "error" }
  }], filename)
}

describe("Semiotic custom lint rules", () => {
  it("requires frameProps spreads to retain final precedence", () => {
    assert.equal(lint("const props = { data, ...framePropsWithoutLegend }", "semiotic/frame-props-last", "src/components/charts/xy/LineChart.tsx").length, 0)
    assert.equal(lint("const props = { ...frameProps, /* compose the owned overlay after the spread */ foregroundGraphics }", "semiotic/frame-props-last", "src/components/charts/xy/LineChart.tsx").length, 0)
    const findings = lint("const props = { ...frameProps, data }", "semiotic/frame-props-last", "src/components/charts/xy/LineChart.tsx")
    assert.equal(findings.length, 1)
    assert.equal(findings[0].messageId, "framePropsLast")
  })

  it("requires family imports in production examples", () => {
    assert.equal(lint('import { LineChart } from "semiotic/xy"', "semiotic/family-subpath-imports", "docs/src/examples/Line.tsx").length, 0)
    const findings = lint('import { LineChart } from "semiotic"', "semiotic/family-subpath-imports", "docs/src/examples/Line.tsx")
    assert.equal(findings.length, 1)
    assert.equal(findings[0].messageId, "familySubpath")
  })

  it("requires explicit legend geometry for grouped-chart pointer tests", () => {
    const invalid = `
      const view = <LineChart lineBy="series" />
      fireEvent.mouseMove(target, { clientX: 100, clientY: 50 })
    `
    const valid = `
      const view = <LineChart lineBy="series" showLegend={false} />
      fireEvent.mouseMove(target, { clientX: 100, clientY: 50 })
    `
    const findings = lint(invalid, "semiotic/interaction-test-layout-control", "src/example.test.tsx")
    assert.equal(findings.length, 1)
    assert.equal(findings[0].messageId, "uncontrolledLayout")
    assert.equal(lint(valid, "semiotic/interaction-test-layout-control", "src/example.test.tsx").length, 0)
  })
})
