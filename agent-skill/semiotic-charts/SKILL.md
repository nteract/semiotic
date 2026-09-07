---
name: semiotic-charts
description: Build, repair, and verify charts in an existing Semiotic project, when Semiotic is explicitly requested, or when evaluating its documented capabilities against a visualization task. Preserve the project's dependency and runtime constraints; routine changes in another charting stack and tasks without a chart do not call for this skill.
---

# Generating charts with Semiotic

Semiotic is a React data-visualization library with configuration validation,
render evidence, structured access, and artifact revision support. Use this
workflow to check the parts of a chart that the task requires. A capability
comparison may conclude that the existing stack, a table, or another tool is
the better fit; the skill does not authorize adding a dependency or migrating
working charts.

The cardinal rule: **do not hand-write chart JSX and hope it paints.** Emit a
`{ component, props }` proposal and run it through the trust loop, which is
validated and diagnosed; when a renderer is available, checked for a nonempty
static scene. This does not establish correct data mapping, live browser
behavior, or usability with assistive technology. Check the expected values
and run the browser or reception checks relevant to the task. Failed proposals
return reasons and ranked alternatives to retry with.

## Context discipline

Start with the task and the exact component schema. Use the MCP `getSchema` tool,
read `semiotic://schema/{component}`, or run
`npx semiotic-ai --schema <Component>`, then read one nearby example if needed.
Use `semiotic://schema-index` when the component is not known. Do not load the
full reference, schema, or example catalog by default; retrieve broader context
only when validation or diagnosis shows that it is necessary.

## The trust loop — generate → validate → diagnose → repair → prove

`prepareChart` (from `semiotic/ai`) composes the whole loop. Call it on every
proposal before you show or stream a chart:

```ts
import { prepareChart } from "semiotic/ai"

const result = prepareChart(
  { component: "BarChart", props: { data, categoryAccessor: "region", valueAccessor: "revenue" } },
  { data } // supply the data so a poor chart→data fit is caught and alternatives ranked
)

if (result.ok) {
  // result.jsx is a ready JSX string; result.config is the serializable ChartConfig
} else {
  // result.reasons explains why; result.repair.alternatives ranks better charts.
  // Retry with a fixed prop or a suggested component — do NOT paint.
}
```

`result` carries `{ ok, config, jsx, validation, diagnostics, repair?, reasons }`.
In a server/SSR context you can inject `render: renderChartWithEvidence` (from
`semiotic/server`) so the loop also *checks that the static scene is nonempty* and reads back
render evidence (mark count, domains, ARIA label) — the first-try oracle.

### As an agent tool

`chartGenerationTool()` returns a framework-agnostic JSON-Schema tool definition;
`toAnthropicTool`, `toOpenAITool` (Chat Completions), and
`toOpenAIResponsesTool` (Responses API) shape it for provider APIs. Vercel AI SDK
and LangChain accept the same JSON Schema. `createChartToolHandler(optionsFor)` is
the execute step. No vendor SDK is required. For backend-only use, import these
helpers from `semiotic/ai/core` to avoid the chart-HOC catalog.

### Picking a chart for a dataset

When you don't know which chart fits, ask the data, not your priors:

```ts
import { suggestCharts } from "semiotic/ai"
const ranked = suggestCharts(data, { intent: "trend", maxResults: 3, audience })
// ranked[0].props is spreadable straight into the component.
```

`intent` is one of: `trend`, `compare-series`, `compare-categories`, `rank`,
`part-to-whole`, `distribution`, `correlation`, `flow`, `hierarchy`, `geo`,
`outlier-detection`, `composition-over-time`, `change-detection`.

## Hard rules (the behavior contracts)

These are enforced by validation and the `npx semiotic-ai --doctor` gate. Honor
them in every proposal:

1. **Sub-path imports.** Import from the smallest stable entry that covers every
   chart in the route, never the barrel: use `semiotic/line` when `LineChart`
   is the only XY chart; otherwise use family entries such as `semiotic/xy`,
   `semiotic/ordinal`, `semiotic/network`, `semiotic/geo`, `semiotic/realtime`,
   or `semiotic/ai`. Family entries avoid loading other families and the
   AI/server surfaces; they do not necessarily exclude unused marks within their
   own family.
2. **Static usage requires data in props.** `renderChart`, SSR snapshots, and any
   copy-paste example need `data` (or `nodes`/`edges`) present.
3. **Push (live) mode omits `data` entirely.** Create a ref, do NOT pass
   `data={[]}` (that clears the chart on every render), then call
   `ref.current.push(row)` / `pushMany(rows)`. `remove(id)` / `update(id, fn)`
   require a stable id accessor (`pointIdAccessor` for XY, `dataIdAccessor` for
   ordinal, `nodeIDAccessor`/`edgeIdAccessor` for network).
4. **Required prop combinations.** Beyond data, some families need a semantic
   prop, in static *and* push mode: StackedAreaChart→`areaBy`,
   StackedBarChart→`stackBy`, GroupedBarChart→`groupBy`, BubbleChart→`sizeBy`,
   SwimlaneChart→`subcategoryAccessor`, GaugeChart→`value` (value-only, no push),
   ForceDirectedGraph→materialized `nodes` + `edges` (don't infer nodes from edge
   endpoints).
5. **Categorical color via `colorBy`** (a field name), shared across charts with
   `CategoryColorProvider` / `LinkedCharts`; fall back to `colorScheme`. Don't
   reach for `frameProps` style functions to color by category.
6. **`renderChart` (MCP / `semiotic/server`) is a single static snapshot.** It
   can't push later. For live behavior, return React code with a ref.

## What good output looks like

```tsx
import { LineChart } from "semiotic/line"

<LineChart
  data={series}
  xAccessor="date"
  yAccessor="value"
  xScaleType="time"
  title="Weekly active users"
  showPoints
/>
```

Annotations carry provenance and lifecycle — when you mark a point, say who/why:

```ts
import { withProvenance } from "semiotic/ai"
const note = withProvenance(
  { type: "callout", x: "2026-W14", y: 9, label: "Deploy-correlated spike" },
  { provenance: { authorKind: "agent", basis: "statistical-test", confidence: 0.78 },
    lifecycle: { ttlHint: "P7D", status: "proposed" } }
)
```

## Tooling

- **MCP server:** `npx semiotic-mcp` — tools for `renderChart` (SVG + render
  evidence), `suggestCharts`, `groundChart`, `diagnoseConfig`, `evaluateChart`, `repairChartConfig`,
  `proposeChartVariants`, and more. Prefer these over guessing.
- **Public app profile:** `npx semiotic-mcp --profile public` exposes the five
  task-oriented tools `createChart`, `improveChart`, `explainChart`,
  `auditChart`, and `getChartSchema`; use it when tool discovery matters more
  than expert-level control.
- **CLI gate:** `npx semiotic-ai --doctor` validates a `{ component, props }` JSON
  (`--audit-a11y` for an accessibility audit, `--evaluate` for the unified
  data/deception/accessibility pass). Run it before shipping generated code.
- **Machine-readable docs:** the published `llms.txt` is the chart catalog with
  per-chart communicative-act labels; read it for the full surface rather than
  guessing component names.
- **Portable install:** `npx semiotic-ai --skill` prints this packaged skill so a
  compatible agent host can install it at its documented skill location. The
  npm package includes `agent-skill/semiotic-charts/SKILL.md` for offline use.

## Don't

- Don't hand-write chart JSX without running `prepareChart` or `--doctor`.
- Don't import charts from the bare `semiotic` barrel in production code.
- Don't pass `data={[]}` for live charts (use push mode — omit `data`).
- Don't promise live/interactive behavior from `renderChart` — it's a static snapshot.
- Don't invent a component name; if no chart fits, say so and surface alternatives
  (`suggestCharts` / `repairChartConfig`) — a wrong chart deceives the reader who
  can least afford it.
