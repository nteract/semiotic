# Semiotic: Stream-First Architecture Strategy

**Status:** Draft
**Author:** Elijah Meeks + Claude
**Date:** March 2026

---

## Thesis

Streaming visualization is a superset of static visualization. A static chart is a streaming chart whose data source happens to be bounded — all points arrive at once, the stream terminates, and the visualization finalizes. Apache Flink proved this for data processing: batch is a special case of streaming, not a separate paradigm. Semiotic should adopt the same principle.

Today Semiotic has two parallel worlds: the legacy SVG Frames (XYFrame, OrdinalFrame, NetworkFrame) with props-driven derivation, and the new canvas-first realtime Frames (RealtimeFrame, RealtimeNetworkFrame) with push APIs. These share almost no code. The strategy is to converge on a single stream-first core where the legacy Frames are eventually reimplemented as bounded-stream configurations of unified streaming Frames.

---

## Why

**The current architecture has a split personality.** Static Frames use `useDerivedStateFromProps()` to diff prop categories, funnel through monolithic calculate functions (`calculateXYFrame`, `calculateOrdinalFrame`, `calculateNetworkFrame`), and produce SVG render pipelines. Realtime Frames use ref-based mutable stores, rAF loops, and canvas renderers. Annotations, hover, tooltips, scales, and color utilities are largely duplicated or incompatible between the two.

**Users want hybrid charts.** The most common real-world pattern is: load historical data (bounded), render a static chart, then seamlessly transition to live updates (unbounded). Today this requires choosing between a static Frame (no streaming) or a Realtime Frame (no rich annotation/summary support). There's no path between them.

**Canvas should be the default.** SVG is correct for publication-quality static output, server-side rendering, and accessibility annotations. But for interactive, animated, or data-dense charts, canvas is strictly better. The current Frames default to SVG and opt-in to canvas per layer (`canvasLines`, `canvasPoints`). This should invert: canvas-first with SVG for annotations and export.

---

## Core Concepts (Borrowed from Flink)

### Bounded vs. Unbounded Sources

Every chart has a data source. The source declares its nature:

| Source type | Bounded? | Example |
|---|---|---|
| Static array prop (`data={[...]}`) | Bounded | Historical sales data |
| Ref push API (`ref.current.push(d)`) | Unbounded | Live sensor readings |
| Async iterable / Observable | Either | WebSocket (unbounded) or fetch-all (bounded) |
| Array prop + push API | Both | Historical backfill then live updates |

When the source is bounded, the framework knows all data has arrived and can optimize: compute layout once, sort globally, use SVG if small, skip animation. When unbounded, it uses incremental updates, canvas rendering, windowing, and animated transitions.

This maps directly to Flink's `execution.runtime-mode`:
- **`BATCH`** — all data arrives via props, render once, optimize for quality
- **`STREAMING`** — data arrives via push, render continuously, optimize for throughput
- **`AUTO`** — detect from which APIs are used

### Watermarks

In Flink, a watermark with timestamp `t` asserts: "all events before `t` have arrived." For visualization, watermarks control progressive rendering:

- For a static chart loading a large dataset, process data in chunks. Advance the watermark as chunks arrive. Render finalized regions (before watermark) with full fidelity; provisional regions (after watermark) with a loading indicator or reduced detail.
- For a streaming chart, the watermark is the current time minus an out-of-orderness tolerance. Data behind the watermark is final; data ahead of it may be revised.
- For bounded data, stream termination emits a `MAX_TIMESTAMP` watermark that finalizes everything — equivalent to "render the static chart."

This concept makes progressive rendering of large static datasets and real-time streaming use the same codepath.

### Windowing

Flink's windows (tumbling, sliding, session) map naturally to time-series visualization:

| Window type | Viz analog | Current Semiotic |
|---|---|---|
| Tumbling | Time-bucketed bars (`RealtimeHistogram.binSize`) | `binSize` prop |
| Sliding | Rolling average / moving statistics | Not supported |
| Session | Activity-based grouping | Not supported |
| Global + custom trigger | "Accumulate all, render on signal" = batch | `data` prop |

Today `windowSize` and `windowMode` on RealtimeFrame are ad-hoc. In a unified model, windowing becomes a first-class declarative concept across all chart types.

### Dynamic Tables (Internal Abstraction)

Flink converts every stream into a "dynamic table" — a logical, continuously changing table. Queries run against it, producing output tables that convert back to streams.

For Semiotic, the analog is a **reactive data store** that:
1. Accepts changesets (insert, update, delete) — whether from props diffing or push API
2. Maintains derived state incrementally (scales, extents, aggregations, layout positions)
3. Emits a scene graph that the renderer consumes

This is what `TopologyStore` does for RealtimeNetworkFrame and what `RingBuffer + IncrementalExtent` do for RealtimeFrame. The legacy Frames do the same thing but eagerly and monolithically via their calculate functions. Unification means making the store pattern the single internal model.

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     HOC Chart Components                     │
│  LineChart  BarChart  SankeyDiagram  RealtimeSankey  ...    │
│  (thin wrappers with accessor normalization)                 │
├─────────────────────────────────────────────────────────────┤
│                     Unified Frame                            │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────────────┐ │
│  │  Source   │  │  Pipeline  │  │       Renderer          │ │
│  │ Adapter   │→ │   Store    │→ │  ┌───────┐ ┌────────┐  │ │
│  │          │  │            │  │  │Canvas │ │SVG     │  │ │
│  │ bounded  │  │ scales     │  │  │(data) │ │(annot) │  │ │
│  │ unbounded│  │ extents    │  │  └───────┘ └────────┘  │ │
│  │ hybrid   │  │ layout     │  │  ┌─────────────────┐   │ │
│  │          │  │ aggregation│  │  │  Interaction     │   │ │
│  │          │  │ scene graph│  │  │  (hover, brush,  │   │ │
│  └──────────┘  └────────────┘  │  │   tooltip, zoom) │   │ │
│                                │  └─────────────────┘   │ │
│                                └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Shared Infrastructure                    │
│  RingBuffer  IncrementalExtent  ParticlePool  BezierCache   │
│  ColorScale  AnnotationEngine  ExportEngine  ThemeContext   │
└─────────────────────────────────────────────────────────────┘
```

### Source Adapter

Normalizes all data inputs into a uniform changeset stream:

```typescript
interface Changeset<T> {
  inserts: T[]
  updates: Array<{ key: string; datum: T }>
  deletes: string[]
  watermark: number    // MAX_SAFE_INTEGER for bounded-complete
  bounded: boolean     // true if source has terminated
}
```

- **Props adapter**: Diffs `data` prop between renders → emits changeset of inserts/updates/deletes. On first render with a static array, emits all data as inserts with `watermark: MAX` and `bounded: true`.
- **Push adapter**: Wraps `push()` / `pushMany()` calls → emits changeset per call with advancing watermark and `bounded: false`.
- **Hybrid adapter**: First processes props (bounded backfill), then switches to push (unbounded live). The transition is seamless — the store doesn't care where changesets come from.

### Pipeline Store

Replaces both `useDerivedStateFromProps()` (legacy) and `TopologyStore` / `RingBuffer` (realtime) with a unified reactive store:

```typescript
interface PipelineStore<TDatum> {
  // Data management
  ingest(changeset: Changeset<TDatum>): void

  // Derived state (incrementally maintained)
  readonly extents: { x: [number, number]; y: [number, number] }
  readonly scales: { x: Scale; y: Scale }
  readonly layout: LayoutResult       // positions, paths, etc.
  readonly sceneGraph: SceneNode[]    // renderable primitives

  // Windowing (for time-series)
  readonly window: WindowState

  // Change tracking
  readonly version: number
  readonly dirtyRegions: DirtyRegion[]
}
```

The store processes changesets and incrementally updates derived state. For bounded data, this happens in a single synchronous pass (equivalent to today's calculate functions). For unbounded data, it happens on each push with optional batching.

Layout algorithms plug in here: `sankeyLayout`, `forceLayout`, `treemapLayout`, etc. are called by the store when the scene graph needs recomputation. The tension model from RealtimeNetworkFrame generalizes: any layout can accumulate "drift" from incremental changes and trigger full recomputation when a threshold is exceeded.

### Renderer

Canvas-first with SVG overlay:

```
┌──────────────────────────────────────┐
│  <div> (position: relative)          │
│                                      │
│    <canvas> — primary rendering      │
│      Data marks (lines, bars, nodes) │
│      Axes, gridlines                 │
│      Particle effects                │
│                                      │
│    <svg> — overlay (when needed)     │
│      Annotations (labels, callouts)  │
│      Brush rectangles                │
│      Custom HTML-positioned marks    │
│                                      │
│    <div> — tooltip layer             │
└──────────────────────────────────────┘
```

The renderer reads from the store's scene graph and paints to canvas. The rAF loop runs continuously for unbounded sources, or fires once-and-stops for bounded sources (canvas is still used — it's just a single frame).

SVG is used for:
- **Annotations** — text labels, callout lines, note boxes that need DOM layout
- **Brush interaction** — rectangle overlay with pointer events
- **Export** — `exportChart()` can composite canvas + SVG into a single static SVG for download
- **Server-side rendering** — `renderToStaticSVG()` bypasses canvas entirely and renders a pure SVG scene graph

The key insight: SVG becomes a rendering *target* (for export/SSR) and an *overlay* (for interaction/annotation), not the primary rendering surface.

### Interaction Layer

Interaction events (hover, click, brush) are handled on canvas via hit-testing against the scene graph, not via SVG DOM events. This is how RealtimeFrame already works. Benefits:

- No DOM event handler per mark (scales to millions of points)
- Consistent across bounded and unbounded modes
- Annotation positioning uses the same coordinate system as canvas rendering

The `LinkedCharts` coordination system, `useSelection`, and `useBrushSelection` hooks work unchanged — they operate on data predicates, not DOM elements.

---

## Migration Path

### Phase 0: Current State (Done)

- Legacy Frames: XYFrame, OrdinalFrame, NetworkFrame (SVG-first, props-driven)
- Realtime Frames: RealtimeFrame (canvas, push API, time-series)
- RealtimeNetworkFrame (canvas+SVG hybrid, push API, network topology)
- 27 HOC chart components wrapping the above

### Phase 1: Unified XY Stream Frame (DONE)

`StreamXYFrame` — canvas-first XY frame handling both bounded and unbounded data.

**Replaces:** XYFrame (for line, area, scatter, heatmap) + RealtimeFrame (for streaming line, bar, swarm, waterfall)

**Completed:**
- DataSourceAdapter: accepts `data` prop, `push()` API, or both; progressive chunking for large datasets
- PipelineStore: RingBuffer + IncrementalExtent + scene graph building for line, area, stackedarea, scatter, bubble, heatmap, bar, swarm, waterfall, candlestick
- Canvas renderers for all chart types
- SVG annotation overlay (axes, grid, legend, annotations)
- Canvas hit-testing for hover/tooltip
- Windowing via `windowSize` + `windowMode`
- Progressive rendering for large bounded datasets (>5K items chunked across rAFs)

**HOC migration (complete):** `LineChart`, `AreaChart`, `StackedAreaChart`, `Scatterplot`, `BubbleChart`, `Heatmap` use StreamXYFrame. `RealtimeLineChart`, `RealtimeHistogram`, `RealtimeSwarmChart`, `RealtimeWaterfallChart` use StreamXYFrame with `runtimeMode="streaming"`.

**Status:** XYFrame and RealtimeFrame still exist but are deprecated. All HOCs use StreamXYFrame.

### Phase 2: Unified Ordinal Stream Frame (DONE)

`StreamOrdinalFrame` — canvas-first ordinal frame.

**What it replaces:** OrdinalFrame

**Key work:**
- Source adapter for categorical data changesets
- Incremental aggregation (when a new row arrives for category "East", update that bar without recomputing all categories)
- Summary type renderers ported to canvas (violin, boxplot, histogram, swarm)
- Canvas-based column overlays for interaction

**Completed:**
- OrdinalPipelineStore: RingBuffer + category tracking + ScaleBand/ScaleLinear + scene graph building for bar, clusterbar, point, swarm, pie, donut, boxplot, violin, histogram
- Canvas renderers: wedge (pie/donut), boxplot, violin; reuses bar and point renderers from StreamXYFrame
- OrdinalSVGOverlay: band-scale category axis, value axis, grid, legend, annotations
- OrdinalCanvasHitTester: rect, point, wedge, boxplot, violin hit testing
- Radial projection for pie/donut with canvas centering and donut centerContent

**HOC migration (complete):** `BarChart`, `StackedBarChart`, `GroupedBarChart`, `SwarmPlot`, `BoxPlot`, `Histogram`, `ViolinPlot`, `DotPlot`, `PieChart`, `DonutChart` all use StreamOrdinalFrame.

**Status:** OrdinalFrame still exists but is deprecated. All ordinal HOCs use StreamOrdinalFrame.

**Future capability:** Streaming ordinal charts — push categorical observations and watch distributions update live. A streaming violin plot, streaming histogram, etc. The push API is already wired in StreamOrdinalFrame; category discovery is incremental. This is a differentiator.

**Marginal graphics (TODO):** XYFrame's `marginalSummaryType` axis prop renders ordinal summaries (ridgeline, heatmap, histogram, etc.) along scatter axes. This requires ordinal summary renderers inside an XY context. Now that StreamOrdinalFrame's canvas summary renderers exist, they can be extracted as shared utilities and imported by StreamXYFrame for marginal rendering. The cookbook/marginal-graphics page is currently broken pending this work.

### Phase 3: Unified Network Stream Frame

Build `StreamNetworkFrame` — generalizes RealtimeNetworkFrame to handle all network types.

**What it replaces:** NetworkFrame + RealtimeNetworkFrame

**Key work:**
- Generalize TopologyStore to handle all layout types (force, sankey, chord, tree, treemap, circlepack)
- Layout plugins: each layout type implements an `IncrementalLayout` interface
  - `initialLayout(nodes, edges, config)` — full layout from scratch
  - `ingestChange(changeset, currentLayout)` → tension/drift score
  - `incrementalUpdate(changeset, currentLayout)` — cheap in-place update
  - `fullRelayout(nodes, edges, config)` — expensive but accurate
- Force layout: naturally incremental (simulation ticks)
- Sankey: tension model (already built)
- Tree/treemap/circlepack: mark subtrees dirty on insertion, relayout dirty branches
- Chord: recompute matrix incrementally
- Particle system generalized (not just Sankey — force-directed particle flow, tree pulse animations)

**HOC migration:** `ForceDirectedGraph`, `SankeyDiagram`, `ChordDiagram`, `TreeDiagram`, `Treemap`, `CirclePack`, `RealtimeSankey` all switch.

**New capability:** Streaming force-directed graphs (push nodes/edges, watch simulation evolve). Streaming treemaps (push hierarchical data, watch rectangles repack). Every network chart becomes real-time capable.

### Phase 4: Deprecation and Cleanup

- Remove legacy XYFrame, OrdinalFrame, NetworkFrame
- Remove RealtimeFrame (absorbed by StreamXYFrame — already deprecated, no HOCs use it)
- Remove RealtimeNetworkFrame (absorbed by StreamNetworkFrame)
- Single codebase, single set of patterns
- `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/realtime` entry points still work but all resolve to unified internals

---

## What We Preserve

The stream-first rewrite changes internals. The external API stays stable:

- **HOC chart components** — same props, same imports, same behavior
- **`frameProps` escape hatch** — still works, now reaches the unified Frame
- **Annotation system** — same `svgAnnotationRules`, `htmlAnnotationRules` callbacks
- **`LinkedCharts` coordination** — same hooks, same selection model
- **Server-side rendering** — `renderToStaticSVG()` still works (renders scene graph to SVG instead of canvas)
- **`exportChart()`** — still works (composites canvas + SVG overlay)
- **ThemeProvider** — still works (CSS custom properties resolve in both canvas and SVG)

## What Changes

- **Rendering default flips from SVG to canvas.** Most users won't notice (HOCs abstract this). Users accessing Frames directly will see canvas output instead of SVG DOM.
- **`canvasLines`, `canvasPoints`, etc. become no-ops.** Everything is canvas by default. A new `svgMode: true` prop opts into full SVG rendering for accessibility or publication use.
- **Interaction events no longer bubble through SVG DOM.** Canvas hit-testing replaces `onMouseEnter` on SVG elements. Custom interaction handlers receive the same data objects but via a different mechanism.
- **Summary types render on canvas.** Violin plots, boxplots, etc. are canvas-drawn with SVG annotation overlay. Visual fidelity is identical; DOM inspector shows fewer elements.

---

## Risks and Open Questions

**Canvas accessibility.** SVG elements are accessible to screen readers; canvas is an opaque bitmap. Mitigation: render an invisible SVG "shadow DOM" with ARIA labels mirroring the scene graph, or use the SVG overlay for accessibility markup. This is solvable but requires explicit work.

**Canvas text rendering.** SVG text is crisp at all zoom levels; canvas text can be blurry on non-retina displays or at fractional DPR. Mitigation: render text in the SVG overlay layer (labels, axis ticks, annotations). Only simple marks (lines, bars, circles) go on canvas.

**SVG export fidelity.** `exportChart()` currently clones SVG DOM. With canvas-first, export needs to re-render the scene graph to SVG. This is more work but also more reliable (no computed-style cloning). The scene graph is the single source of truth for both canvas and SVG renderers.

**Migration surface area.** Three phases of Frame replacement means a long transition period with both old and new Frames in the codebase. HOCs insulate most users, but `frameProps` users may need migration. Strategy: maintain both for at least one major version, with deprecation warnings.

**Performance of bounded-mode canvas.** For simple static charts with <100 data points, canvas setup overhead (context creation, DPR handling) may be slower than SVG. Mitigation: the source adapter can detect small bounded datasets and route to an SVG fast path. Or: accept the overhead since it's imperceptible at that scale.

**Force layout convergence.** Force-directed graphs use iterative simulation that converges over hundreds of ticks. In bounded mode, run the simulation to convergence before rendering (as NetworkFrame does today with `iterations: 300`). In streaming mode, the simulation runs continuously with new nodes/edges injected. The transition between these modes needs careful handling.

---

## Timeline Estimate

This is a multi-quarter effort. Each phase is independently shippable and valuable.

| Phase | Scope | Dependencies |
|---|---|---|
| **Phase 1** | StreamXYFrame | None — can start immediately |
| **Phase 2** | StreamOrdinalFrame | Benefits from Phase 1 patterns but not blocked |
| **Phase 3** | StreamNetworkFrame | Benefits from Phase 1+2 patterns |
| **Phase 4** | Deprecation | All phases complete |

Phase 1 is the most impactful: it unifies the most-used chart types (line, area, scatter, bar) and eliminates the biggest code duplication between XYFrame and RealtimeFrame.

---

## References

- **Apache Flink** — "Batch as a Special Case of Streaming" ([Flink blog, 2019](https://flink.apache.org/2019/02/13/batch-as-a-special-case-of-streaming-and-alibabas-contribution-of-blink/))
- **FLIP-27** — Unified Source Interface ([Apache wiki](https://cwiki.apache.org/confluence/display/FLINK/FLIP-27:+Refactor+Source+Interface))
- **FLIP-134** — Batch Execution for DataStream API ([Apache wiki](https://cwiki.apache.org/confluence/display/FLINK/FLIP-134:+Batch+execution+for+the+DataStream+API))
- **Reactive Vega** — Streaming dataflow architecture for declarative visualization ([Satyanarayan et al., IEEE InfoVis 2016](https://vis.csail.mit.edu/pubs/reactive-vega/))
- **Vega-Lite streaming** — Changeset-based updates ([Vega-Lite tutorial](https://vega.github.io/vega-lite/tutorials/streaming.html))
