#!/usr/bin/env tsx
/**
 * Playground control-drift gate (docs strategy Phase 1).
 *
 * Playground pages hand-author a `controls` array of UI knobs. Those knobs are
 * UI affordances, not a direct mirror of the prop API (they carry labels,
 * groups, slider ranges, and sometimes UI-only option values mapped through a
 * page-level `mapProps`), so most of the schema can't be gated. The one robust,
 * high-value invariant: a `select` knob bound to a prop that `chartSpecs.ts`
 * declares as an **enum** must not offer an option the chart no longer accepts.
 *
 * To stay false-positive-free:
 *   - only enum-typed chartSpecs props are checked (props without an `enum`
 *     accept open values, so a select there can't "drift");
 *   - a control with a `propPath` (nested target) is skipped;
 *   - if the page defines `mapProps`, option values may be transformed before
 *     reaching the prop, so a mismatch is reported as informational, not failed.
 *
 * Run: npx tsx scripts/check-docs-playground-controls.ts
 */

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseSync } from "@babel/core"
import { CHART_SPECS, PROP_BAGS } from "../src/components/charts/shared/chartSpecs.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const playgroundDir = join(repoRoot, "docs/src/pages/playground")

const errors: string[] = []
const info: string[] = []

// ── chartSpecs enums per resolved prop ─────────────────────────────────────

function enumMap(spec: (typeof CHART_SPECS)[string]): Map<string, Set<string>> {
  const merged: Record<string, any> = {}
  for (const bag of spec.propBags) Object.assign(merged, PROP_BAGS[bag])
  Object.assign(merged, spec.ownProps)
  const out = new Map<string, Set<string>>()
  for (const [name, propSpec] of Object.entries(merged)) {
    if (propSpec && Array.isArray((propSpec as any).enum)) {
      out.set(name, new Set((propSpec as any).enum.map(String)))
    }
  }
  return out
}

// ── AST helpers ────────────────────────────────────────────────────────────

function objectKeyValue(obj: any, key: string): any {
  if (obj?.type !== "ObjectExpression") return undefined
  for (const prop of obj.properties) {
    if (prop.type !== "ObjectProperty") continue
    const k = prop.key
    const name = k.type === "Identifier" ? k.name : k.type === "StringLiteral" ? k.value : null
    if (name === key) return prop.value
  }
  return undefined
}

function stringValue(node: any): string | null {
  return node?.type === "StringLiteral" ? node.value : null
}

function stringArray(node: any): string[] | null {
  if (node?.type !== "ArrayExpression") return null
  const out: string[] = []
  for (const el of node.elements) {
    if (el?.type === "StringLiteral") out.push(el.value)
    else return null // not a pure string-literal array (computed) — bail
  }
  return out
}

interface PageInfo {
  componentName: string | null
  hasMapProps: boolean
  // select controls: name -> { options, hasPropPath }
  selects: Map<string, { options: string[] | null; hasPropPath: boolean }>
}

function analyzePage(source: string): PageInfo {
  const ast = parseSync(source, {
    parserOpts: { plugins: ["jsx"], sourceType: "module" },
    babelrc: false,
    configFile: false,
  })
  const result: PageInfo = { componentName: null, hasMapProps: false, selects: new Map() }

  const visit = (node: any) => {
    if (!node || typeof node !== "object") return

    // componentName="X" JSX attribute
    if (node.type === "JSXAttribute" && node.name?.name === "componentName") {
      if (node.value?.type === "StringLiteral") result.componentName = node.value.value
    }
    // mapProps used as a JSX prop (mapProps={...}) or any `mapProps` identifier
    if (node.type === "JSXAttribute" && node.name?.name === "mapProps") result.hasMapProps = true

    // control objects: { type: "select", name, options, propPath? }
    if (node.type === "ObjectExpression") {
      const typeVal = stringValue(objectKeyValue(node, "type"))
      const nameVal = stringValue(objectKeyValue(node, "name"))
      if (typeVal === "select" && nameVal) {
        const optionsNode = objectKeyValue(node, "options")
        result.selects.set(nameVal, {
          options: optionsNode ? stringArray(optionsNode) : null,
          hasPropPath: objectKeyValue(node, "propPath") !== undefined,
        })
      }
    }

    for (const key of Object.keys(node)) {
      const child = (node as any)[key]
      if (Array.isArray(child)) child.forEach(visit)
      else if (child && typeof child === "object" && child.type) visit(child)
    }
  }
  visit(ast)
  return result
}

// ── Run ────────────────────────────────────────────────────────────────────

const files = existsSync(playgroundDir)
  ? readdirSync(playgroundDir).filter((f) => f.endsWith("Playground.js"))
  : []

let checkedPages = 0
let checkedControls = 0

for (const file of files) {
  const page = analyzePage(readFileSync(join(playgroundDir, file), "utf8"))
  if (!page.componentName) continue // composite/streaming playground without a single charted component
  const spec = CHART_SPECS[page.componentName]
  if (!spec) continue // componentName not a registered chart (realtime composite, etc.)
  const enums = enumMap(spec)
  if (enums.size === 0) continue
  checkedPages++

  for (const [name, ctrl] of page.selects) {
    const allowed = enums.get(name)
    if (!allowed || ctrl.hasPropPath || ctrl.options === null) continue
    checkedControls++
    const stray = ctrl.options.filter((o) => !allowed.has(o))
    if (stray.length === 0) continue
    const msg =
      `${file}: select "${name}" offers ${JSON.stringify(stray)} not in ${page.componentName}.${name} ` +
      `enum {${[...allowed].join(", ")}}`
    if (page.hasMapProps) {
      info.push(`${msg} (page uses mapProps — verify the transform maps these)`)
    } else {
      errors.push(`${msg}. The knob exposes an option the chart no longer accepts.`)
    }
  }
}

for (const m of info) console.log(`ℹ ${m}`)
if (info.length) console.log("")

if (errors.length) {
  console.error("✗ playground control drift detected:\n")
  for (const m of errors) console.error(`  - ${m}\n`)
  process.exit(1)
}

console.log(
  `✓ playground controls clean: ${checkedControls} enum-bound select knob(s) across ${checkedPages} ` +
    `playground(s) match chartSpecs enums (${info.length} informational).`,
)
