---
name: semiotic-charts
description: Generate trustworthy, accessible, agent-legible charts with Semiotic. Use whenever you produce a data visualization in a React/TypeScript app, stream a chart as generative UI, or pick a chart type for a dataset. Emit a validated config and run the trust loop — never hand-write chart JSX that breaks on first paint.
---

# Generating charts with Semiotic

Semiotic is a React data-visualization library whose differentiator is **trust**:
generation is cheap, but a chart that renders, that a screen-reader user can
receive, and that carries its own provenance is scarce. This skill is the
workflow for producing one.

The cardinal rule: **do not hand-write chart JSX and hope it paints.** Emit a
`{ component, props }` proposal and run it through the trust loop, which is
guaranteed-renderable or returns reasons and ranked alternatives to retry with.

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
`semiotic/server`) so the loop also *proves the scene is non-empty* and reads back
render evidence (mark count, domains, ARIA label) — the first-try oracle.

### As an agent tool

`chartGenerationTool()` returns a framework-agnostic JSON-Schema tool definition;
`toAnthropicTool` / `toOpenAITool` shape it for those APIs (Vercel AI SDK and
LangChain accept the same JSON Schema). `createChartToolHandler(optionsFor)` is the
execute step. No vendor SDK is required.

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

1. **Sub-path imports.** Import from the family entry point, not the barrel:
   `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/geo`,
   `semiotic/realtime`, `semiotic/ai`. The full `semiotic` is large; a family
   entry point is a fraction of it.
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
import { LineChart } from "semiotic/xy"

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
  evidence), `suggestCharts`, `groundChart`, `diagnoseConfig`, `repairChartConfig`,
  `proposeChartVariants`, and more. Prefer these over guessing.
- **CLI gate:** `npx semiotic-ai --doctor` validates a `{ component, props }` JSON
  (`--audit-a11y` for an accessibility audit). Run it before shipping generated code.
- **Machine-readable docs:** the published `llms.txt` is the chart catalog with
  per-chart communicative-act labels; read it for the full surface rather than
  guessing component names.

## Don't

- Don't hand-write chart JSX without running `prepareChart` or `--doctor`.
- Don't import charts from the bare `semiotic` barrel in production code.
- Don't pass `data={[]}` for live charts (use push mode — omit `data`).
- Don't promise live/interactive behavior from `renderChart` — it's a static snapshot.
- Don't invent a component name; if no chart fits, say so and surface alternatives
  (`suggestCharts` / `repairChartConfig`) — a wrong chart deceives the reader who
  can least afford it.
