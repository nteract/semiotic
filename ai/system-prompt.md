# Semiotic — React Data Visualization

Use family subpath imports such as `semiotic/line` for LineChart-only routes and
`semiotic/xy`, `semiotic/ordinal`,
`semiotic/network`, `semiotic/geo`, or `semiotic/realtime` in production code.
Use `semiotic/ai` or `semiotic/ai/core` for generation helpers. Current bundle
measurements live in the README and the complete AI reference.

## Agent Workflow

Keep retrieval narrow: start with this prompt, then fetch one relevant component
schema with the MCP `getSchema` tool or
`npx semiotic-ai --schema <Component>`, and one nearby example only when needed.
Do not load the complete schema, example catalog, or full reference into every
request.

1. Identify the data shape, communicative intent, audience, and delivery mode
   (static/serialized or React push).
2. Use `suggestCharts` when the component is not already determined, then verify
   the selected component's exact schema instead of guessing props.
3. Produce a serializable `{ component, props }` proposal before translating it
   to JSX; import chart components from the smallest applicable public subpath
   in production code. For a route whose only XY chart is `LineChart`, use
   `semiotic/line`; otherwise use its family subpath.
4. Validate with `prepareChart`, `diagnoseConfig`, or `evaluateChart`, or
   `npx semiotic-ai --doctor`; repair reported contract failures.
5. When a renderer is available, require non-empty render evidence and run the
   accessibility audit before presenting the result.

## Selection Map

- Flat observations: XY charts for trends/relationships; ordinal charts for
  categorical comparison, ranking, distribution, and part-to-whole.
  Multivariate comparable magnitudes: `RadarChart`. Cumulative signed
  steps: `WaterfallChart` (each row is a delta). For multivariate profile
  comparison across independently scaled fields, consider the schema-backed
  `ParallelCoordinatesRecipe`; for single-year daily seasonality, consider
  `CalendarHeatmapRecipe`.
- Trees: `TreeDiagram`, `Treemap`, `CirclePack`, or animated `OrbitDiagram`.
- Nodes/edges: `ForceDirectedGraph`, `SankeyDiagram`, `ProcessSankey`, or
  `ChordDiagram`. Prefer these HOCs to `StreamNetworkFrame` unless the task
  needs lower-level streaming control.
- Geographic rows/features: charts from `semiotic/geo`.
- Live time-windowed observations: Realtime HOCs from `semiotic/realtime`.
- A single focal value: `BigNumber` from `semiotic/value`.
- Physics charts: use only when motion has data meaning and keep an exact,
  readable settled projection.

This map narrows discovery; it does not define props. Use `suggestCharts` and
the selected component's exact schema for the final choice.

Before profiling GraphQL or database rows, declare record keys through
`identifiers` (or `fieldRoles: { key: "identifier" }`). Identifier fields are
identity, not quantitative measures or unique-value categories.

## Delivery Modes

- Static JSX, SSR, MCP rendering, and serialized configurations keep the
  initial data snapshot in the component's real data prop.
- Built-in portable recipes are serialized under their recipe component name
  and rendered in React with `<ChartRecipe recipeId="..." />` from
  `semiotic/ai`. Their `layoutConfig` is JSON-safe and schema-validated; use
  the lower-level layout from `semiotic/recipes` only when React callbacks or
  bespoke layout control are required.
- React push mode omits `data` entirely and mutates through a ref. Do not pass
  `data={[]}`. Supply the schema's stable ID accessor before using `remove` or
  `update`.
- Realtime HOCs require a valid time field (default `time`) for windowing; set
  `timeAccessor` when the field has another name.
- Stream Frames are low-level escape hatches. Network-frame callbacks receive
  `RealtimeNode`/`RealtimeEdge` wrappers rather than raw rows.

Push example:

```jsx
const chartRef = useRef()
chartRef.current.push({ x: 1, y: 2 })
<Scatterplot ref={chartRef} xAccessor="x" yAccessor="y" />
```

Available ref methods vary by component; the exact schema/capability metadata is
authoritative.

## Accessibility, Interaction, and Composition

- Chart HOCs commonly support `title`, `description`, `summary`,
  `accessibleTable`, `onClick`, and `onObservation`; verify the selected schema.
  Value components have their own contract.
- Use `ChartContainer` when generated descriptions, structured navigation,
  status, notifications, or shared actions are needed. Match its height to a
  child chart that uses explicit dimensions.
- Interactive widget annotations need `id`, `stableId`, or
  `provenance.stableId`. Use `autoPlaceAnnotations` for density, progressive
  disclosure, and redundant association cues; keep provenance/lifecycle
  metadata when claims are agent-authored.
- Repeated pictograms should normally render at least 16px. If they do not fit,
  wrap/reduce them, raise the unit value, or choose another encoding.

## Theming

Use `ThemeProvider` from `semiotic/themes/react`, presets and serialization from
`semiotic/themes`, and semantic CSS variables such as `--semiotic-danger` for
scoped role overrides. Use `colorBy` for categorical data and
`CategoryColorProvider`/`LinkedCharts` for stable cross-chart category colors.
`COLOR_BLIND_SAFE_CATEGORICAL` is available from `semiotic/themes`.

## Behavior Contracts

<!-- semiotic-behavior-contracts:start -->

These rules are generated from `ai/behaviorContracts.cjs` and are consumed by `semiotic-ai --doctor`, MCP resources, and docs checks.

- **Accessible chart text uses direct chart props** (`accessibility.description-props`): High-level charts expose title for the visible name, description for a concise accessible description, summary for a screen-reader-only takeaway and interaction guidance, and accessibleTable for the data-table fallback.
- **Cursor styling does not create behavior** (`interaction.cursor-is-presentation-only`): Cursor values in realtime props, retained mark styles, styleRules, and custom hit targets change pointer presentation only. They do not install click handlers, keyboard activation, observations, or accessibility semantics.
- **Data required by usage mode** (`props.data-required-by-usage-mode`): Static usage (`renderChart`, MCP previews, SSR snapshots, and copy/paste examples with immediate data) requires data in props. React push mode selects live ingestion by omitting data and mutating through a ref.
- **Categorical color precedence** (`color.category-precedence`): When colorBy is set, CategoryColorProvider/LinkedCharts category maps win for mapped categories. Unmapped categories fall back to explicit colorScheme, then ThemeProvider colors.categorical, then the built-in categorical fallback.
- **Required prop combinations** (`props.required-combinations`): Some chart families need semantic props beyond data. These combinations are enforced by validation/schema for static configs and remain required in push mode unless explicitly noted.
  Required combinations: StackedAreaChart: static data + areaBy; push areaBy. Stacked areas need a flat data array plus areaBy to identify the stacked series. BubbleChart: static data + sizeBy; push sizeBy. Bubbles need sizeBy in addition to x/y accessors so radius encodes data rather than a constant point size. StackedBarChart: static data + stackBy; push stackBy. Stacked bars need stackBy to split each category into stack segments. GroupedBarChart: static data + groupBy; push groupBy. Grouped bars need groupBy to split each category into side-by-side bars. SwimlaneChart: static data + subcategoryAccessor; push subcategoryAccessor. Swimlanes need subcategoryAccessor; colorBy defaults to the same field when not provided. GaugeChart: static value; push not supported. GaugeChart is value-only. Its thresholds use { value, color, label? }; BigNumber thresholds use the distinct { at, level, color?, label? } vocabulary. ForceDirectedGraph: static nodes + edges; push nodes + edges. ForceDirectedGraph schema/rendering requires nodes and edges. If an agent infers nodes from edge endpoints, it must materialize a nodes array before returning code.
- **Push mode omits data** (`streaming.push-mode-data`): HOC push mode is selected by omitting the data prop entirely. Passing data={[]} is static empty data and can clear/reinitialize the frame on render.
- **Serialized proposals keep the initial snapshot** (`streaming.serialized-proposal-snapshot`): A JSON component/props proposal for MCP, SSR, or evaluation is a static snapshot even when the request mentions future pushes. Keep the supplied initial rows in the component's real data prop and do not invent pushRows, pushRequirement, ref, or method props.
- **Ref mutations need stable IDs** (`streaming.ref-mutations-require-id-accessors`): push() and pushMany() can append without IDs, but remove(id) and update(id, updater) require a stable ID accessor: pointIdAccessor for XY/realtime charts, dataIdAccessor for ordinal charts, and nodeIDAccessor/edgeIdAccessor for network operations.
- **renderChart uses static props only** (`rendering.renderchart-static-props`): MCP renderChart and semiotic/server renderChart render a single static SVG/PNG snapshot. Browser-only realtime components and future ref pushes are not renderable through that path.
- **Axis formatters are React callbacks** (`serialization.formatters-are-react-callbacks`): xFormat, yFormat, categoryFormat, and valueFormat are callback props, not d3 format strings or axis-title strings. They are intentionally absent from JSON/MCP schemas and string values fail validation.
- **Value components do not inherit chart-HOC props** (`value.bignumber-wire-contract`): BigNumber is a value component, not a chart HOC, so it does not inherit the common chart-HOC prop list. It uses label as its visible heading and supports description and summary; title and accessibleTable are invalid. Its percent format expects a ratio such as 0.97 and renders it as 97%.
- **Proportional symbol maps use geographic props** (`geo.proportional-symbol-wire-shape`): ProportionalSymbolMap reads point rows from points, longitude from xAccessor (default lon), latitude from yAccessor (default lat), and radius from sizeBy. sizeRange is the two-number pixel-radius range.
- **Physics charts separate chart mode from simulation input** (`physics.sample-and-mechanical-inputs`): Sample simulations use data plus the chart's accessors. Seeded no-data demonstrations use simulationMode="mechanical" (legacy mode="mechanical" remains accepted); mode otherwise carries chart display modes such as primary or sparkline.
- **Physics push methods ingest source records** (`physics.push-uses-source-records`): Physics HOC refs push source records through the chart's accessors. pushRows and dataIdAccessor are not component props; stable source id fields are retained on spawned bodies without an invented accessor.

<!-- semiotic-behavior-contracts:end -->

## Key Patterns
- **Percentile band + main line**: Layer `<AreaChart yAccessor="p95" y0Accessor="p5" showLine={false} />` + `<LineChart yAccessor="p50" />`. AreaChart's `showLine` only draws the top edge, NOT a separate main line.
- **SSR**: `renderChart("BarChart", props)` from `semiotic/server` — uses HOC names. Also `"Sparkline"` (no axes, 2px margins). `renderChartWithEvidence()` returns `{ svg, evidence }` (mark counts by scene type, axis domains, empty flag, semantic status/diagnostics, annotation count, accessible name). Check `empty`/`markCount` for paint and `semanticStatus` separately for meaning; `degenerate` marks are not trustworthy even when paint `status` is `ok`, while `not-assessed` means no capability check exists. `renderToImage()` (PNG), `renderToAnimatedGif()` (GIF), `renderDashboard()` (multi-chart). All accept `theme`. Required props: StackedBarChart needs `stackBy`, GroupedBarChart needs `groupBy`, StackedAreaChart needs `areaBy`, BubbleChart needs `sizeBy`, FunnelChart uses `stepAccessor`, GaugeChart needs `value` (`thresholds` optional).
- **Serializable chart-adjacent text**: use a `frame-text` annotation instead of splicing server SVG. It anchors to the resolved plot rectangle without data coordinates: `{ type: "frame-text", text: "100", position: "bottom-right", dy: 16 }`. Positions cover the plot's nine edge/center anchors; `dx`/`dy` may move text into a caller-reserved margin. The same annotation renders in CSR and SSR.
- **CLI**: `npx semiotic-ai --list` shows components/import paths/renderability; `npx semiotic-ai --schema GaugeChart` prints one component schema with metadata; `--doctor` validates props JSON and behavior contracts.
- **MCP**: `npx semiotic-mcp` exposes schema, chart suggestion, token-encoding suggestion (`suggestTokenEncoding` for ISOTYPE/dot/icon arrays), diagnosis, accessibility, grounding, issue, theme, static render (`renderChart`), and ChatGPT Apps render (`renderInteractiveChart`) tools. Discover schemas through `semiotic://schema-index`, then read only `semiotic://schema/{component}`; `semiotic://schema` remains the complete catalog for bulk tooling. Other resources include `semiotic://components`, `semiotic://behavior-contracts`, `semiotic://system-prompt`, `semiotic://examples`, and the widget template `ui://semiotic/chart-widget.html`. Prompts: `build-semiotic-chart`, `debug-semiotic-chart`.
- **Data Pitfalls bridge**: `toDataPitfallsChain(component, props, { rendered, context, narrative })` from `semiotic/ai` returns a dependency-free `datapitfalls` chain input containing config, JSX, reader grounding, diagnostics, accessibility audit, and optional render evidence/image.
- **exportChart**: Pass the wrapper div, not the SVG element: `exportChart(wrapperDiv, { format: "png" })`. It finds canvas+SVG internally.
