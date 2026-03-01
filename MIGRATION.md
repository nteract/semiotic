# Migrating to Semiotic v3

This guide covers upgrading from Semiotic v1.x or v2.x to v3.

## Quick Summary

| Area | Impact |
|---|---|
| Core Frame APIs | **No breaking changes** — `XYFrame`, `OrdinalFrame`, `NetworkFrame` props are unchanged |
| React version | **React 18.1+** required (was 16+ in v1, 17+ in v2) |
| Removed props | `baseMarkProps` removed from all Frames |
| Removed components | `ProcessViz`, `Mark`, `SpanOrDiv` removed |
| New features | 24 chart HOCs, RealtimeFrame, SSR, code splitting |
| TypeScript | Built-in types ship with the package |
| Bundle size | 62% smaller (minified), up to 78% smaller with code splitting |

**For most users:** install v3 and your existing code works as-is. Then
optionally adopt the new chart components for simpler code.

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
npm install semiotic@3
```

## Step 3: Check for Removed APIs

### `baseMarkProps` (removed)

**Before (v1/v2):**
```jsx
<XYFrame
  baseMarkProps={{ transitionDuration: { fill: 500 } }}
  // ...
/>
```

**After (v3):**
Use `lineStyle`, `pointStyle`, or `summaryStyle` props instead:
```jsx
<XYFrame
  lineStyle={{ transition: "fill 500ms" }}
  // ...
/>
```

### `ProcessViz` (removed)

This was a development/debugging component. Remove any imports:
```diff
- import { ProcessViz } from "semiotic"
```

### `Mark` component (removed)

Use direct SVG elements:
```diff
- import { Mark } from "semiotic"
- <Mark markType="rect" width={10} height={20} />
+ <rect width={10} height={20} />
```

## Step 4: Adopt New Features (Optional)

### Use Chart Components Instead of Frames

The biggest v3 addition is 24 chart components with simplified APIs. These
are optional — Frames continue to work — but they dramatically reduce code
for common chart types.

**Before (Frame):**
```jsx
import { XYFrame } from "semiotic"

<XYFrame
  lines={[{ coordinates: salesData }]}
  xAccessor="month"
  yAccessor="revenue"
  lineDataAccessor="coordinates"
  lineType={{ type: "line", interpolator: curveMonotoneX }}
  showLinePoints={true}
  pointStyle={{ fill: "#6366f1", r: 3 }}
  lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
  axes={[
    { orient: "left", label: "Revenue" },
    { orient: "bottom", label: "Month" },
  ]}
  hoverAnnotation={true}
  size={[600, 400]}
/>
```

**After (Chart):**
```jsx
import { LineChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  curve="monotoneX"
  showPoints={true}
  xLabel="Month"
  yLabel="Revenue"
/>
```

Both approaches continue to work. Use `frameProps` on any chart component
to access the full Frame API without giving up the simpler interface:

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

**Available chart components:**

| Category | Components |
|---|---|
| XY | `LineChart`, `AreaChart`, `StackedAreaChart`, `Scatterplot`, `BubbleChart`, `Heatmap` |
| Ordinal | `BarChart`, `StackedBarChart`, `GroupedBarChart`, `SwarmPlot`, `BoxPlot`, `DotPlot`, `PieChart`, `DonutChart` |
| Network | `ForceDirectedGraph`, `ChordDiagram`, `SankeyDiagram`, `TreeDiagram`, `Treemap`, `CirclePack` |
| Realtime | `RealtimeLineChart`, `RealtimeBarChart`, `RealtimeSwarmChart`, `RealtimeWaterfallChart` |

### Use Granular Imports for Smaller Bundles

If you only use one type of visualization, import from the specific entry
point to reduce your bundle by 36-43%:

```diff
- import { XYFrame, LineChart } from "semiotic"      // 218 KB
+ import { XYFrame, LineChart } from "semiotic/xy"    // 125 KB
```

```diff
- import { OrdinalFrame, BarChart } from "semiotic"           // 218 KB
+ import { OrdinalFrame, BarChart } from "semiotic/ordinal"   // 140 KB
```

```diff
- import { NetworkFrame } from "semiotic"                  // 218 KB
+ import { NetworkFrame } from "semiotic/network"          // 133 KB
```

Each granular entry point includes the relevant Frame, its chart components,
and shared utilities (Axis, Legend, Annotation, Brush).

### Use Server-Side Rendering

For static SVG generation (email, OG images, PDF, static sites):

```jsx
import { renderToStaticSVG } from "semiotic/server"

const svg = renderToStaticSVG("xy", {
  lines: [{ coordinates: data }],
  xAccessor: "date",
  yAccessor: "value",
  size: [600, 400],
  axes: [{ orient: "left" }, { orient: "bottom" }],
})

// svg is a string of static SVG markup
```

### Use RealtimeFrame for Streaming Data

For high-frequency data (monitoring, IoT, financial):

```jsx
import { RealtimeLineChart } from "semiotic"

const chartRef = useRef()

// Push data imperatively
useEffect(() => {
  const interval = setInterval(() => {
    chartRef.current.push({ time: Date.now(), value: Math.random() })
  }, 100)
  return () => clearInterval(interval)
}, [])

<RealtimeLineChart
  ref={chartRef}
  timeAccessor="time"
  valueAccessor="value"
  windowSize={200}
  size={[600, 300]}
/>
```

## Step 5: TypeScript (Optional)

Semiotic v3 ships its own type definitions. Remove any community types:

```diff
- npm uninstall @types/semiotic
```

All components support generics:

```tsx
import { LineChart, LineChartProps } from "semiotic"

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

## Step 6: Next.js / SSR Frameworks

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

---

## FAQ

### Do I need to change my existing Frame code?

No. `XYFrame`, `OrdinalFrame`, and `NetworkFrame` have the same prop API as
v1/v2. Your existing code should work without changes (minus the three
removed features listed above).

### Should I switch from Frames to Chart components?

For new code, yes — the chart components handle data transformation, axis
configuration, legends, and hover interactions automatically. For existing
Frame code that works well, there is no urgency to migrate.

### Can I mix Frames and Chart components?

Yes. They are independent components that can coexist on the same page.

### What happened to v2?

Version 2 was a series of release candidates (up to `2.0.0-rc.12`) that
began the internal refactoring to functional components and TypeScript. It
was never promoted to a stable release. v3 completes that work and adds
the chart components, RealtimeFrame, SSR, and code splitting.
