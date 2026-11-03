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
    assert.equal(lint("const props = { ...frameProps, /* frameProps precedence: compose the owned overlay after the spread */ foregroundGraphics }", "semiotic/frame-props-last", "src/components/charts/xy/LineChart.tsx").length, 0)
    assert.equal(lint("const props = { ...frameProps, /* preserve the label color */ foregroundGraphics }", "semiotic/frame-props-last", "src/components/charts/xy/LineChart.tsx").length, 1)
    assert.equal(lint("const props = { ...frameProps, data, /* frameProps precedence: compose the foreground */ foregroundGraphics }", "semiotic/frame-props-last", "src/components/charts/xy/LineChart.tsx").length, 1)
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
    const separateTests = `
      it("grouped chart", () => {
        const view = <LineChart lineBy="series" />
      })
      it("unrelated pointer test", () => {
        fireEvent.mouseMove(target, { clientX: 100, clientY: 50 })
      })
    `
    assert.equal(lint(separateTests, "semiotic/interaction-test-layout-control", "src/example.test.tsx").length, 0)
  })

  it("resolves immutable layout prop spreads with JSX override order", () => {
    const rule = "semiotic/interaction-test-layout-control"
    const cases = [
      ["shared BubbleChart fixture", "const plotProps = { width: 400, showLegend: false }", '<BubbleChart {...plotProps} colorBy="category" />', 0],
      ["typed fixture", "const plotProps = { showLegend: false } as const", '<BubbleChart {...plotProps} colorBy="category" />', 0],
      ["known spread without a legend override", "const plotProps = { width: 400 }", '<BubbleChart colorBy="category" showLegend={false} {...plotProps} />', 0],
      ["later JSX true overrides fixture", "const plotProps = { showLegend: false }", '<BubbleChart {...plotProps} colorBy="category" showLegend />', 1],
      ["later spread true overrides JSX false", "const plotProps = { showLegend: true }", '<BubbleChart colorBy="category" showLegend={false} {...plotProps} />', 1],
      ["later JSX false overrides spread", "const plotProps = { showLegend: true }", '<BubbleChart {...plotProps} colorBy="category" showLegend={false} />', 0],
      ["unknown spread invalidates false", "", '<BubbleChart colorBy="category" showLegend={false} {...runtimeProps} />', 1],
      ["explicit false follows unknown spread", "", '<BubbleChart colorBy="category" {...runtimeProps} showLegend={false} />', 0],
      ["nested const spreads", "const base = { showLegend: false }; const plotProps = { ...base, width: 400 }", '<BubbleChart {...plotProps} colorBy="category" />', 0],
      ["nested unknown spread follows false", "const plotProps = { showLegend: false, ...runtimeProps }", '<BubbleChart {...plotProps} colorBy="category" />', 1],
      ["nested false follows unknown spread", "const plotProps = { ...runtimeProps, showLegend: false }", '<BubbleChart {...plotProps} colorBy="category" />', 0],
      ["mutated const object", "const plotProps = { showLegend: false }; plotProps.showLegend = true", '<BubbleChart {...plotProps} colorBy="category" />', 1],
      ["escaped const object", "const plotProps = { showLegend: false }; update(plotProps)", '<BubbleChart {...plotProps} colorBy="category" />', 1],
      ["aliased mutable object", "const plotProps = { showLegend: false }; const alias = plotProps; alias.showLegend = true", '<BubbleChart {...plotProps} colorBy="category" />', 1],
      ["destructured binding", "const { plotProps } = { plotProps: { showLegend: true }, showLegend: false }", '<BubbleChart {...plotProps} colorBy="category" />', 1],
      ["getter can mutate copied properties", "const plotProps = { get width() { this.showLegend = true; return 400 }, showLegend: false }", '<BubbleChart {...plotProps} colorBy="category" />', 1],
      ["computed overwrite", "const plotProps = { showLegend: false, [runtimeKey]: true }", '<BubbleChart {...plotProps} colorBy="category" />', 1],
      ["literal computed false", "const plotProps = { ['showLegend']: false }", '<BubbleChart {...plotProps} colorBy="category" />', 0],
      ["mutable binding", "let plotProps = { showLegend: false }", '<BubbleChart {...plotProps} colorBy="category" />', 1],
      ["grouping in known spread", "const plotProps = { colorBy: 'category' }", '<BubbleChart {...plotProps} />', 1],
    ]
    for (const [label, setup, chart, expected] of cases) {
      const code = `${setup}; it("hover", () => {
        const view = ${chart}
        fireEvent.mouseMove(target, { clientX: 100, clientY: 225 })
      })`
      assert.equal(lint(code, rule, "src/example.test.tsx").length, expected, label)
    }
    assert.equal(lint(`
      const plotProps = { showLegend: true }
      it("hover", () => {
        const plotProps = { showLegend: false }
        const view = <BubbleChart {...plotProps} colorBy="category" />
        fireEvent.mouseMove(target, { clientX: 100, clientY: 225 })
      })
    `, rule, "src/example.test.tsx").length, 0)
  })

  it("keeps library module scope free of tree-shaking side effects", () => {
    const rule = "semiotic/no-module-side-effects"
    const chart = "src/components/charts/xy/LineChart.tsx"
    const clean = [
      '"use client"',
      'import { forwardRef, createContext } from "react"',
      "void axisKeysComplete",
      "const Ctx = /* @__PURE__ */ createContext(null)",
      'export const Chart = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ forwardRef(function Chart() { registerPlugins() }), "Chart")',
      "function registerPlugins() { registerXYPlugin(plugin) }"
    ].join("\n")
    assert.equal(lint(clean, rule, chart).length, 0)

    const findings = lint([
      "registerXYPlugin(plugin)",
      'Chart.displayName = "Chart"',
      "const Ctx = createContext(null)",
      "export const Wrapped = /* @__PURE__ */ withDisplayName(forwardRef(render), \"Wrapped\")",
      "const Lazy = React.lazy(() => import(\"./x\"))"
    ].join("\n"), rule, chart)
    assert.deepEqual(findings.map(finding => finding.messageId), [
      "sideEffectStatement",
      "sideEffectStatement",
      "unannotatedFactory",
      "unannotatedFactory",
      "unannotatedFactory"
    ])

    // Tests, the server graph, and entry modules may register at load.
    for (const exempt of ["src/components/charts/xy/LineChart.test.tsx", "src/components/server/staticXY.tsx", "src/components/semiotic-ai.ts", "docs/src/components/BlocksView.jsx"]) {
      assert.equal(lint("registerXYPlugin(plugin)", rule, exempt).length, 0, exempt)
    }
  })

  it("checks all calls and constructors throughout module initializers", () => {
    const rule = "semiotic/no-module-side-effects"
    const file = "src/components/example.ts"
    for (const code of [
      "const registration = registerPlugin(plugin)",
      "const cache = new SideEffectfulCache()",
      "const x = { value: enabled ? register() : 0 }",
      "const x = [register()] satisfies unknown[]",
      "const x = /* @__PURE__ */ wrap({ value: register() })",
      "const x = /* @__PURE__ */ wrap(new SideEffectfulCache())",
      "const x = /* @__PURE__ */ factory()()",
      "const x = condition && (register() as unknown)",
      "export default register()",
      "const { x = register() } = config",
      "class C { [register()]() {} }",
      "const C = class extends mixin(Base) {}",
      "const x = new Set(iterable)",
      "const x = Object.freeze(sharedObject)",
      "const x = Array.from([], register)",
      "const Set = SideEffectfulCache; const x = new Set()",
      "const Object = custom; const x = Object.freeze({})",
      "const x = /* @__PURE__ */ (0, register())"
    ]) assert.ok(lint(code, rule, file).some((finding) => finding.messageId === "unannotatedCall"), code)

    for (const code of [
      "const cache = /* @__PURE__ */ new PrivateCache()",
      "const x = /* @__PURE__ */ wrap({ value: /* @__PURE__ */ calculate() })",
      "const x = new Set(['a', 'b']); const y = new Map(); const z = new WeakMap()",
      "const x = Object.freeze({ a: 1 }); const y = Symbol.for('key')",
      "class C { field = register(); method() { register() } }",
      "const C = class { field = new SideEffectfulCache() }",
      "const obj = { method() { register() }, get value() { return register() } }",
      "const run = () => register()"
    ]) assert.deepEqual(lint(code, rule, file), [], code)

    for (const code of [
      "const x = (globalThis.registry ??= new Map())",
      "const x = counter++",
      "const x = delete shared.key",
      "const x = await pending",
      "const x = tag`template`",
      "const x = /* @__PURE__ */ wrap(shared.value = 1)"
    ]) assert.ok(lint(code, rule, file).some((finding) => finding.messageId === "sideEffectStatement"), code)
  })
})
