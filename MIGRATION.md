# Migrating to Semiotic v3

This guide covers upgrading from Semiotic v1.x or v2.x to v3.

## Quick Summary

| Area | Impact |
|---|---|
| Core Frames | `StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame` replace the legacy SVG frames. Legacy names (`XYFrame`, `OrdinalFrame`, `NetworkFrame`) are aliased for backwards compatibility. |
| React version | **React 18.1+** required (was 16+ in v1, 17+ in v2) |
| Rendering | All frames are **canvas-first** with SVG overlays for axes, labels, and annotations |
| Streaming | Every frame supports a ref-based push API for high-frequency data |
| Removed components | `RealtimeSankey`, `RealtimeNetworkFrame`, `ProcessViz`, `Mark`, `SpanOrDiv`, `FacetController` |
| Removed props | `baseMarkProps` removed from all Frames |
| New features | 27 chart HOCs, streaming support on all chart types, SSR, code splitting |
| TypeScript | Built-in types ship with the package |
| Bundle size | 62% smaller (minified), up to 78% smaller with code splitting |

**For most users:** install v3, replace bare Frame imports with the Stream versions (or use the chart HOCs), and your code works. The legacy `XYFrame`, `OrdinalFrame`, and `NetworkFrame` names are aliased to the Stream versions for backwards compatibility.

---

## Step 1: Update React

Semiotic v3 requires React 18.1 or later.

```bash
npm install react@18 react-dom@18
```

If you are on React 16 or 17, you must upgrade first. See the
[React 18 upgrade guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide).

## Step 2: Install Semiotic v3

```bash
npm install semiotic@3.0.0-beta.7
```

## Step 3: Understand the Frame Changes

### Stream-First Architecture

All frames are now canvas-first:

| Legacy (aliased) | Current | Purpose |
|---|---|---|
| `StreamXYFrame` | Line, area, scatter, heatmap, candlestick charts |
| `StreamOrdinalFrame` | Bar, pie, boxplot, violin, swarm charts |
| `StreamNetworkFrame` | Force, sankey, chord, tree, treemap, circlepack |

The legacy names are exported as aliases, so existing imports continue to work:

```jsx
// Both of these work — they resolve to the same component
import { XYFrame } from "semiotic"
import { StreamXYFrame } from "semiotic"
```

### What Changed in the Frames

- **Canvas rendering** — data marks are drawn on canvas instead of SVG. Axes, labels, annotations, and legends remain in an SVG overlay.
- **Push API** — every frame exposes `ref.current.push(datum)` for streaming data.
- **No more `ResponsiveXYFrame`** — all frames handle responsive sizing via container measurement. `ResponsiveXYFrame` is aliased to `StreamXYFrame`.

### NetworkFrame → StreamNetworkFrame

`StreamNetworkFrame` is the biggest change. It unifies the old `NetworkFrame` (SVG, all layout types) and `RealtimeNetworkFrame` (streaming sankey only) into a single canvas-first frame with layout plugins:

```jsx
import { StreamNetworkFrame } from "semiotic"

// Bounded sankey (replaces NetworkFrame with networkType="sankey")
<StreamNetworkFrame
  chartType="sankey"
  nodes={nodes}
  edges={edges}
  nodeIDAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  valueAccessor="value"
  showLabels
  enableHover
/>

// Streaming sankey with particles (replaces RealtimeSankey/RealtimeNetworkFrame)
<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  showParticles
  enableHover
/>
// chartRef.current.push({ source: "A", target: "B", value: 100 })

// Force-directed graph
<StreamNetworkFrame chartType="force" nodes={nodes} edges={edges} />

// Hierarchy (tree, treemap, circlepack, partition)
<StreamNetworkFrame chartType="treemap" data={hierarchyRoot} />
```

**Prop mapping from legacy NetworkFrame:**

| Legacy NetworkFrame | StreamNetworkFrame |
|---|---|
| `networkType: { type: "force" }` | `chartType="force"` |
| `networkType: { type: "sankey" }` | `chartType="sankey"` |
| `hoverAnnotation` | `enableHover` |
| `edges` (single object for hierarchy) | `data` (hierarchy root) |
| `nodeStyle` / `edgeStyle` | Same — but `d` is a `RealtimeNode` with user data on `d.data` |

## Step 4: Check for Removed APIs

### `RealtimeSankey` (removed)

Use `StreamNetworkFrame` with `chartType="sankey"` directly:

```diff
- import { RealtimeSankey } from "semiotic"
- <RealtimeSankey ref={chartRef} size={[800, 400]} showParticles />
+ import { StreamNetworkFrame } from "semiotic"
+ <StreamNetworkFrame ref={chartRef} chartType="sankey" size={[800, 400]} showParticles />
```

The push API is identical: `ref.current.push({ source, target, value })`.

### `RealtimeNetworkFrame` (removed)

Alias for `StreamNetworkFrame` — the export still works but the component is gone:

```diff
- import { RealtimeNetworkFrame } from "semiotic"
+ import { StreamNetworkFrame } from "semiotic"
```

### `FacetController` (removed)

Replaced by `LinkedCharts`:

```diff
- import { FacetController } from "semiotic"
- <FacetController>
-   <XYFrame ... />
-   <OrdinalFrame ... />
- </FacetController>
+ import { LinkedCharts } from "semiotic"
+ <LinkedCharts>
+   <LineChart ... linkedHover={{ name: "hl", fields: ["id"] }} selection={{ name: "hl" }} />
+   <BarChart ... selection={{ name: "hl" }} />
+ </LinkedCharts>
```

### `baseMarkProps` (removed)

```diff
- <XYFrame baseMarkProps={{ transitionDuration: { fill: 500 } }} />
+ <StreamXYFrame lineStyle={{ transition: "fill 500ms" }} />
```

### `ProcessViz`, `Mark`, `SpanOrDiv` (removed)

Remove any imports. Use direct SVG/HTML elements instead.

## Step 5: Adopt Chart HOCs (Recommended)

The simplest way to use Semiotic v3 is through the chart HOC components.
They wrap the Stream frames with sensible defaults.

**Before (legacy Frame):**
```jsx
import { XYFrame } from "semiotic"

<XYFrame
  lines={[{ coordinates: salesData }]}
  xAccessor="month"
  yAccessor="revenue"
  lineDataAccessor="coordinates"
  lineType={{ type: "line", interpolator: curveMonotoneX }}
  hoverAnnotation={true}
  size={[600, 400]}
/>
```

**After (Chart HOC):**
```jsx
import { LineChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  curve="monotoneX"
  xLabel="Month"
  yLabel="Revenue"
/>
```

**Available chart components:**

| Category | Components |
|---|---|
| XY | `LineChart`, `AreaChart`, `StackedAreaChart`, `Scatterplot`, `BubbleChart`, `Heatmap`, `ScatterplotMatrix` |
| Ordinal | `BarChart`, `StackedBarChart`, `GroupedBarChart`, `SwarmPlot`, `BoxPlot`, `Histogram`, `ViolinPlot`, `DotPlot`, `PieChart`, `DonutChart` |
| Network | `ForceDirectedGraph`, `ChordDiagram`, `SankeyDiagram`, `TreeDiagram`, `Treemap`, `CirclePack` |
| Streaming XY | `RealtimeLineChart`, `RealtimeTemporalHistogram`, `RealtimeSwarmChart`, `RealtimeWaterfallChart` |

Every chart HOC accepts a `frameProps` escape hatch for full frame control:

```jsx
<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  frameProps={{
    annotations: [{ type: "x", month: 6, label: "Mid-year" }],
  }}
/>
```

## Step 6: Use Streaming (Optional)

Every chart type supports streaming via the ref push API:

```jsx
import { RealtimeLineChart } from "semiotic"

const chartRef = useRef()

useEffect(() => {
  const interval = setInterval(() => {
    chartRef.current.push({ time: Date.now(), value: Math.random() })
  }, 100)
  return () => clearInterval(interval)
}, [])

<RealtimeLineChart
  ref={chartRef}
  stroke="#6366f1"
  windowSize={200}
/>
```

For streaming network charts, use `StreamNetworkFrame` directly:

```jsx
import { StreamNetworkFrame } from "semiotic"

const chartRef = useRef()

// Push edges to grow the topology
chartRef.current.push({ source: "A", target: "B", value: 100 })

<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  showParticles
/>
```

### Threshold Annotations

Streaming line charts support threshold-based line coloring — the line changes color when it crosses a threshold value:

```jsx
<RealtimeLineChart
  ref={chartRef}
  stroke="#f59e0b"
  annotations={[
    { type: "threshold", value: 80, label: "High", color: "#ef4444" },
    { type: "threshold", value: 20, label: "Low", color: "#6366f1", thresholdType: "lesser" }
  ]}
  svgAnnotationRules={(annotation, i, context) => {
    if (annotation.type === "threshold" && context?.scales) {
      const y = context.scales.value(annotation.value)
      return (
        <g key={`threshold-${i}`}>
          <line x1={0} x2={context.width} y1={y} y2={y}
                stroke={annotation.color} strokeDasharray="6,3" />
          <text x={context.width - 4} y={y - 6}
                textAnchor="end" fill={annotation.color}
                fontSize={11} fontWeight="bold">
            {annotation.label}: {annotation.value}
          </text>
        </g>
      )
    }
    return null
  }}
/>
```

## Step 7: Use Granular Imports for Smaller Bundles

If you only use one type of visualization, import from the specific entry
point to reduce your bundle:

```diff
- import { LineChart } from "semiotic"             // full bundle
+ import { LineChart } from "semiotic/xy"           // XY charts only
```

```diff
- import { BarChart } from "semiotic"               // full bundle
+ import { BarChart } from "semiotic/ordinal"       // ordinal charts only
```

```diff
- import { SankeyDiagram } from "semiotic"          // full bundle
+ import { SankeyDiagram } from "semiotic/network"  // network charts only
```

```diff
- import { RealtimeLineChart } from "semiotic"            // full bundle
+ import { RealtimeLineChart } from "semiotic/realtime"   // realtime charts only
```

## Step 8: TypeScript (Optional)

Semiotic v3 ships its own type definitions. Remove any community types:

```diff
- npm uninstall @types/semiotic
```

All components support generics:

```tsx
import { LineChart } from "semiotic"
import type { LineChartProps } from "semiotic"

interface SalesPoint {
  month: number
  revenue: number
}

<LineChart<SalesPoint>
  data={salesData}
  xAccessor="month"    // TypeScript validates this is a key of SalesPoint
  yAccessor="revenue"
/>
```

## Step 9: Next.js / SSR Frameworks

Semiotic v3 includes `"use client"` directives on all interactive components.
No special configuration is needed for Next.js App Router, Remix, or other
React Server Component frameworks.

```jsx
// app/dashboard/page.tsx (Next.js App Router)
import { LineChart } from "semiotic"

// Works — LineChart is marked "use client" internally
export default function DashboardPage() {
  return <LineChart data={data} xAccessor="x" yAccessor="y" />
}
```

For static SVG generation (email, OG images, PDF):

```jsx
import { renderToStaticSVG } from "semiotic/server"

const svg = renderToStaticSVG("xy", {
  lines: [{ coordinates: data }],
  xAccessor: "date",
  yAccessor: "value",
  size: [600, 400],
})
```

---

## FAQ

### Do I need to change my existing Frame code?

The legacy names (`XYFrame`, `OrdinalFrame`, `NetworkFrame`) are aliased to the Stream versions, so existing imports work. However, there are behavioral differences:

- Rendering is now canvas-based (marks are painted on canvas, not SVG elements)
- Custom `nodeStyle`/`edgeStyle` functions on network charts receive `RealtimeNode` objects where user data is on `d.data` instead of directly on `d`
- `ResponsiveXYFrame` and similar responsive wrappers are aliased to the base Stream frames (responsive sizing is built in)

### Should I switch from Frames to Chart components?

For new code, yes — the chart components handle data transformation, axis
configuration, legends, and hover interactions automatically. For existing
Frame code that works well, migrate at your own pace.

### Can I mix Frames and Chart components?

Yes. They are independent components that can coexist on the same page.
Chart HOCs wrap Stream frames internally.

### What happened to RealtimeSankey?

Removed. Use `StreamNetworkFrame` with `chartType="sankey"` and `showParticles`. The push API is identical. Streaming sankey examples are in the SankeyDiagram docs page.

### What happened to v2?

Version 2 was a series of release candidates (up to `2.0.0-rc.12`) that
began the internal refactoring to functional components and TypeScript. It
was never promoted to a stable release. v3 completes that work and adds
the chart components, stream-first frames, SSR, and code splitting.
