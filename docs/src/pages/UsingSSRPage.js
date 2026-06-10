import React from "react"
import PageLayout from "../components/PageLayout"
import CodeBlock from "../components/CodeBlock"
import { Link } from "react-router-dom"

export default function UsingSSRPage() {
  return (
    <PageLayout
      title="Server-Side Rendering"
      breadcrumbs={[
        { label: "Server-Side Rendering", path: "/using-ssr" }
      ]}
      prevPage={{ title: "Isotype Chart", path: "/cookbook/isotype-chart" }}
      nextPage={{ title: "SSR Gallery", path: "/ssr-gallery" }}
    >
      <p>
        Semiotic works in server-side rendering environments like Next.js App
        Router, Remix, Astro, and any framework that uses React Server
        Components. All interactive components include{" "}
        <code>"use client"</code> directives, so they automatically run on the
        client where browser APIs are available. For situations where you need
        chart output without a browser at all — static site generation, email
        rendering, OG image previews — Semiotic also provides a dedicated server
        rendering API.
      </p>

      {/* -------------------------------------------------------------- */}
      <h2 id="client-components">Using Semiotic in Next.js App Router</h2>

      <p>
        Every Semiotic component that touches the browser (Frames, Charts,
        ResponsiveFrames, SparkFrames, tooltips, interaction layers) ships with
        a <code>"use client"</code> directive at the top of its module. This
        means you can import and render Semiotic components from your own client
        components without any special configuration:
      </p>

      <CodeBlock
        code={`"use client"

import { LineChart } from "semiotic"

export default function Dashboard() {
  return (
    <LineChart
      size={[800, 400]}
      data={revenueData}
      xAccessor="month"
      yAccessor="revenue"
    />
  )
}`}
        language="jsx"
      />

      <p>
        Your component file needs <code>"use client"</code> at the top because
        it renders a Semiotic chart — which is an interactive, browser-dependent
        component. This is standard Next.js App Router practice for any component
        that uses hooks, event handlers, or browser APIs.
      </p>

      <h3 id="turbopack-workaround">Bundler note: Turbopack subpath resolution</h3>

      <p>
        At time of writing, Turbopack (Next.js's default dev bundler in
        recent versions) intermittently fails to resolve Semiotic's
        sub-path exports — <code>{`Module not found: Can't resolve 'semiotic/xy'`}</code>{" "}
        from a Server Component, even though Node, webpack, esbuild, and
        Vite all resolve them correctly. The package's <code>exports</code>{" "}
        map is well-formed; the issue is in Turbopack's exports
        resolution path.
      </p>

      <p>
        Until that's resolved upstream, opt out of Turbopack with the{" "}
        <code>--webpack</code> flag on both <code>dev</code> and{" "}
        <code>build</code>:
      </p>

      <CodeBlock
        code={`{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start"
  }
}`}
        language="json"
      />

      <p>
        Webpack handles Semiotic's exports map with no special config.
        If you're testing against a local copy of Semiotic via{" "}
        <code>file:</code> in <code>package.json</code>, also pass{" "}
        <code>--install-links</code> to <code>npm install</code> so the
        package is copied rather than symlinked — npm's default symlink
        behavior breaks resolution under both bundlers.
      </p>

      <h3 id="importing-from-server-components">Importing from Server Components</h3>

      <p>
        You cannot import Semiotic charts directly in a Server Component (a file
        without <code>"use client"</code>). Instead, create a thin client
        wrapper and import that:
      </p>

      <CodeBlock
        code={`// app/dashboard/Chart.tsx — client component
"use client"

import { BarChart } from "semiotic"

export default function Chart({ data }) {
  return (
    <BarChart
      size={[600, 400]}
      data={data}
      oAccessor="category"
      rAccessor="value"
    />
  )
}`}
        language="jsx"
      />

      <CodeBlock
        code={`// app/dashboard/page.tsx — server component
import Chart from "./Chart"

export default async function DashboardPage() {
  const data = await fetchMetrics()
  return (
    <main>
      <h1>Dashboard</h1>
      <Chart data={data} />
    </main>
  )
}`}
        language="jsx"
      />

      <p>
        This is the standard pattern for using any client-side library in the
        App Router. Your server component handles data fetching and layout, then
        passes serializable data as props to the client component that renders
        the chart.
      </p>

      <h3 id="sub-path-imports">Tree-Shakeable Sub-Path Imports</h3>

      <p>
        When bundle size matters, import from Semiotic's sub-path exports to
        avoid pulling in frame types you don't use:
      </p>

      <CodeBlock
        code={`// Only includes StreamXYFrame and its dependencies
import { StreamXYFrame } from "semiotic/xy"

// Only includes StreamOrdinalFrame
import { StreamOrdinalFrame } from "semiotic/ordinal"

// Only includes StreamNetworkFrame
import { StreamNetworkFrame } from "semiotic/network"`}
        language="jsx"
      />

      <p>
        Each sub-path bundle includes the <code>"use client"</code> directive,
        so they work in App Router the same way as the main import.
      </p>

      {/* -------------------------------------------------------------- */}
      <h2 id="auto-hydration">Isomorphic Auto-Hydration</h2>

      <p>
        Every non-streaming chart HOC in Semiotic participates in React's
        hydration boundary directly. The same chart component that
        renders interactively on the client also renders server-side as
        inline SVG when called from a React Server Component — no
        separate placeholder, no <code>next/dynamic</code> scaffolding,
        no <code>"use client"</code> ceremony for the chart itself.
      </p>

      <p>
        Covered HOCs:
      </p>

      <ul>
        <li>
          <strong>XY:</strong> <code>LineChart</code>, <code>AreaChart</code>,{" "}
          <code>StackedAreaChart</code>, <code>Scatterplot</code>,{" "}
          <code>ConnectedScatterplot</code>, <code>BubbleChart</code>,{" "}
          <code>Heatmap</code>, <code>ScatterplotMatrix</code>,{" "}
          <code>QuadrantChart</code>, <code>MultiAxisLineChart</code>,{" "}
          <code>CandlestickChart</code>, <code>MinimapChart</code>,{" "}
          <code>XYCustomChart</code>.
        </li>
        <li>
          <strong>Ordinal:</strong> <code>BarChart</code>,{" "}
          <code>StackedBarChart</code>, <code>GroupedBarChart</code>,{" "}
          <code>SwarmPlot</code>, <code>BoxPlot</code>,{" "}
          <code>Histogram</code>, <code>ViolinPlot</code>,{" "}
          <code>RidgelinePlot</code>, <code>DotPlot</code>,{" "}
          <code>PieChart</code>, <code>DonutChart</code>,{" "}
          <code>GaugeChart</code>, <code>FunnelChart</code>,{" "}
          <code>SwimlaneChart</code>, <code>LikertChart</code>,{" "}
          <code>OrdinalCustomChart</code>.
        </li>
        <li>
          <strong>Network:</strong> <code>ForceDirectedGraph</code>,{" "}
          <code>ChordDiagram</code>, <code>SankeyDiagram</code>,{" "}
          <code>TreeDiagram</code>, <code>Treemap</code>,{" "}
          <code>CirclePack</code>, <code>OrbitDiagram</code>,{" "}
          <code>NetworkCustomChart</code>.
        </li>
        <li>
          <strong>Geo:</strong> <code>ChoroplethMap</code>,{" "}
          <code>ProportionalSymbolMap</code>, <code>FlowMap</code>,{" "}
          <code>DistanceCartogram</code>.
        </li>
      </ul>

      <p>
        Streaming charts (<code>RealtimeLineChart</code>,{" "}
        <code>RealtimeHistogram</code>, <code>RealtimeSwarmChart</code>,{" "}
        <code>RealtimeWaterfallChart</code>, <code>RealtimeHeatmap</code>)
        deliberately stay canvas-only — they're designed for live
        push-driven data, not pre-rendered output. Render them as client
        components.
      </p>

      <CodeBlock
        code={`// app/dashboard/page.tsx — server component
// No "use client" needed. The chart emits SVG server-side, hydrates to
// canvas + interactivity on the client, with no hydration mismatch.
import { LineChart } from "semiotic/xy"

export default async function DashboardPage() {
  const data = await fetchRevenue()
  return (
    <main>
      <h1>Revenue</h1>
      <LineChart
        data={data}
        xAccessor="month"
        yAccessor="revenue"
        width={800}
        height={400}
      />
    </main>
  )
}`}
        language="tsx"
      />

      <p>
        How it works: <code>StreamXYFrame</code> uses an internal{" "}
        <code>useHydration()</code> hook that returns <code>false</code>{" "}
        on the server and during the first client render after hydration,
        then flips to <code>true</code> after the first commit. While
        false, the frame's existing SSR-mode SVG branch fires; once true,
        the frame upgrades to canvas + interactivity in the same DOM
        subtree. React's reconciler handles the swap as a normal update.
        Server output and first-client-render output are byte-identical,
        so hydration succeeds without mismatch warnings.
      </p>

      <p>
        Tradeoffs:
      </p>

      <ul>
        <li>
          <strong>SVG paint is slower than canvas past ~5k marks.</strong>{" "}
          For dense scatter or streaming charts, the SVG-first approach
          adds a measurable cost. Streaming and realtime charts opt out
          of the SVG layer (they're canvas-only by design — see below).
        </li>
        <li>
          <strong>First interaction waits on canvas mount.</strong> Hover
          and click handlers attach to the canvas, which exists only
          after hydration completes. In practice that's a single rAF
          frame from when the page becomes interactive.
        </li>
        <li>
          <strong>Theme CSS variables resolve via the canvas DOM context.</strong>{" "}
          On the server there's no canvas to read computed styles from,
          so <code>var(--semiotic-*)</code> values fall back to whatever{" "}
          fallback is declared in the CSS or to the theme preset. Use
          explicit theme-prop values when you need tighter SSR/client
          color parity.
        </li>
        <li>
          <strong>Responsive charts re-layout once on hydration.</strong>{" "}
          The server doesn't know the consumer's container dimensions,
          so charts with <code>responsiveWidth</code> or{" "}
          <code>responsiveHeight</code> render server-side at their{" "}
          <code>width</code> / <code>height</code> defaults. On
          hydration, the <code>ResizeObserver</code> attaches and
          measures the actual container — if it differs from the
          default, the chart re-lays out once. Pin{" "}
          <code>width</code> / <code>height</code> explicitly when
          you can predict the layout, or accept the single-frame
          re-layout as the cost of doing responsive sizing under SSR.
        </li>
      </ul>

      <p>
        Hydration parity is enforced by a regression test{" "}
        (<code>StreamXYFrame.hydration.test.tsx</code>) that calls{" "}
        <code>renderToString</code> + <code>hydrateRoot</code> against the
        same component and asserts no React hydration mismatch warnings.
        If a future change makes the server output diverge from the first
        client render, the test fails before the regression ships.
      </p>

      <p>
        <strong>Animations behave correctly across the boundary.</strong>{" "}
        When a chart with <code>animate</code> enabled is hydrated from
        SSR, the intro animation is skipped — the server already
        painted the chart in its final state, and re-animating from
        blank when the canvas takes over would look like a regression.
        Pure client mounts (no SSR) keep their intro animation because
        the SVG render is overwritten before the browser paints, so the
        canvas's first paint is the user's first sight of the chart.
        Subsequent data-change transitions animate normally in both
        modes.
      </p>

      {/* -------------------------------------------------------------- */}
      <h2 id="server-placeholder-pattern">Manual Placeholder Pattern (for streaming charts)</h2>

      <p>
        Streaming charts (<code>RealtimeLineChart</code> et al.) and any
        chart you've deliberately wrapped in <code>{`{ ssr: false }`}</code>{" "}
        don't participate in auto-hydration. For these, pair{" "}
        <code>next/dynamic</code> with <code>semiotic/server</code>'s{" "}
        <code>renderChart</code> as the placeholder. The server emits a
        static SVG that's part of the initial HTML; the client wrapper
        renders the same placeholder until it has mounted, then swaps in
        the interactive chart in the same slot. This is also the
        emergency fallback if you ever hit a hydration regression in an
        auto-hydrating chart — wrap it manually until the regression is
        fixed.
      </p>

      <p>
        This is the cheap, working SSR story today. It's deliberately not
        rehydration — the placeholder SVG and the client canvas are
        produced by separate code paths, so the client mount swaps the
        DOM out rather than picking up where the server left off. That
        means fast initial paint, indexable static SVG, and zero
        hydration warnings, with the cost that the first interaction has
        to wait on client mount + the chart's initial layout pass.
      </p>

      <p>
        The shape is two files: a server component that pre-renders the
        placeholder SVG and passes it down, and a client wrapper that
        gates on a <code>mounted</code> flag so the placeholder renders
        on the server (and on the first client render) and the
        interactive chart renders thereafter.
      </p>

      <CodeBlock
        code={`// app/dashboard/RevenueChart.tsx — client wrapper
"use client"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Lazy-load the interactive chart on the client only.
const InteractiveChart = dynamic(
  () => import("semiotic/xy").then((m) => m.LineChart),
  { ssr: false },
)

interface Props {
  chartProps: { data: Array<{ month: string; revenue: number }>; xAccessor: string; yAccessor: string; width: number; height: number }
  placeholderSvg: string
}

export default function RevenueChart({ chartProps, placeholderSvg }: Props) {
  // \`mounted\` is false on the server and during the first client
  // render — the SVG placeholder is what gets emitted in both cases,
  // so React's hydration sees identical markup. After mount, swap to
  // the interactive chart in the same slot.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <div
        style={{ width: chartProps.width, height: chartProps.height }}
        dangerouslySetInnerHTML={{ __html: placeholderSvg }}
      />
    )
  }
  return <InteractiveChart {...chartProps} />
}`}
        language="tsx"
      />

      <CodeBlock
        code={`// app/dashboard/page.tsx — server component
import { renderChart } from "semiotic/server"
import RevenueChart from "./RevenueChart"

export default async function DashboardPage() {
  const data = await fetchRevenue()
  const chartProps = { data, xAccessor: "month", yAccessor: "revenue", width: 800, height: 400 }

  // Server-render the static SVG once. The wrapper renders it inline
  // during SSR and during the first client render, then replaces it
  // with the interactive chart on mount.
  const placeholderSvg = renderChart("LineChart", chartProps)

  return (
    <main>
      <h1>Revenue</h1>
      <RevenueChart chartProps={chartProps} placeholderSvg={placeholderSvg} />
    </main>
  )
}`}
        language="tsx"
      />

      <p>
        A few details worth knowing:
      </p>

      <ul>
        <li>
          The <code>mounted</code> flag is what gives you in-place
          replacement. The server bundle and the first client render
          emit the same SVG markup (so hydration matches), and the
          post-effect render swaps the subtree to the interactive
          chart. Only one of the two is in the DOM at any time.
        </li>
        <li>
          The placeholder <code>div</code> uses the same{" "}
          <code>width</code> and <code>height</code> as the chart so the
          interactive mount doesn't trigger a layout shift.
        </li>
        <li>
          Pass identical props to <code>renderChart</code> and{" "}
          <code>InteractiveChart</code>. Mismatch and the chart "jumps"
          on swap.
        </li>
        <li>
          For static / build-time pages this gives indexable chart SVG
          with no interactivity penalty. For dynamically-rendered pages
          the server pass runs on every request — fine for moderate
          traffic, but cache the SVG output if you're rendering the
          same chart many times.
        </li>
      </ul>

      <p>
        This pattern is a one-piece fit: replace the server-rendered SVG
        with future Semiotic isomorphic-rehydration support (when it
        ships) by removing the <code>placeholderSvg</code>{" "}
        prop and the <code>mounted</code> gate. No data shape or other
        prop changes required.
      </p>

      {/* -------------------------------------------------------------- */}
      <h2 id="static-svg-rendering">Static SVG Rendering on the Server</h2>

      <p>
        Sometimes you need chart output with no browser, no React runtime, and
        no client JavaScript at all. Common use cases include:
      </p>

      <ul>
        <li>
          <strong>Static site generation</strong> — pre-render charts at build
          time for pages that don't need interactivity.
        </li>
        <li>
          <strong>OG / social preview images</strong> — generate an SVG chart,
          convert it to PNG with Sharp or Satori for social cards.
        </li>
        <li>
          <strong>Email</strong> — inline an SVG chart in an HTML email where
          JavaScript doesn't run.
        </li>
        <li>
          <strong>PDF reports</strong> — embed chart SVGs in server-generated
          PDF documents.
        </li>
        <li>
          <strong>API endpoints</strong> — return chart SVG from an API route
          for consumption by other services.
        </li>
      </ul>

      <p>
        Semiotic provides a <code>semiotic/server</code> entry point that runs
        the full data pipeline on the server and returns a plain SVG string.
        It uses the same calculation code as the client components, so the
        output matches what you'd see in the browser — minus interactivity.
      </p>

      <h3 id="installation">Setup</h3>

      <p>
        The server entry point ships with the main <code>semiotic</code>{" "}
        package. No additional installation is needed. Just import from{" "}
        <code>semiotic/server</code>:
      </p>

      <CodeBlock
        code={`import {
  renderToStaticSVG,
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
} from "semiotic/server"`}
        language="js"
      />

      <h3 id="rendering-an-xy-chart">Rendering an XY Chart</h3>

      <CodeBlock
        code={`import { renderXYToStaticSVG } from "semiotic/server"

const svg = renderXYToStaticSVG({
  size: [600, 400],
  lines: [
    {
      label: "Revenue",
      coordinates: [
        { month: 1, revenue: 120 },
        { month: 2, revenue: 210 },
        { month: 3, revenue: 180 },
        { month: 4, revenue: 350 },
      ],
    },
  ],
  xAccessor: "month",
  yAccessor: "revenue",
  lineStyle: () => ({ stroke: "#ac58e5", strokeWidth: 2 }),
  axes: [
    { orient: "left" },
    { orient: "bottom" },
  ],
})

// svg is a string like: "<svg xmlns=\\"http://www.w3.org/2000/svg\\" ...>...</svg>"
console.log(svg)`}
        language="js"
      />

      <p>
        The returned string is a complete, self-contained SVG document that can
        be written to a file, embedded in HTML, or piped to an image converter.
      </p>

      <h3 id="rendering-an-ordinal-chart">Rendering an Ordinal Chart</h3>

      <CodeBlock
        code={`import { renderOrdinalToStaticSVG } from "semiotic/server"

const svg = renderOrdinalToStaticSVG({
  size: [500, 300],
  data: [
    { region: "North", sales: 420 },
    { region: "South", sales: 310 },
    { region: "East", sales: 580 },
    { region: "West", sales: 290 },
  ],
  oAccessor: "region",
  rAccessor: "sales",
  type: "bar",
  style: () => ({ fill: "#E0488B" }),
  axes: [{ orient: "left" }],
})`}
        language="js"
      />

      <h3 id="rendering-a-network-chart">Rendering a Network Chart</h3>

      <CodeBlock
        code={`import { renderNetworkToStaticSVG } from "semiotic/server"

const svg = renderNetworkToStaticSVG({
  size: [500, 500],
  nodes: [
    { id: "A" }, { id: "B" }, { id: "C" }, { id: "D" },
  ],
  edges: [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "D" },
    { source: "A", target: "D" },
  ],
  networkType: { type: "force", iterations: 300 },
  nodeStyle: () => ({ fill: "#ac58e5", stroke: "#fff" }),
  edgeStyle: () => ({ stroke: "#ccc" }),
})`}
        language="js"
      />

      <h3 id="generic-entry-point">Generic Entry Point</h3>

      <p>
        If you're building a dynamic system that renders different chart types
        based on configuration, use the generic <code>renderToStaticSVG</code>{" "}
        function. It accepts a frame type string as the first argument:
      </p>

      <CodeBlock
        code={`import { renderToStaticSVG } from "semiotic/server"

// chartConfig.type is "xy" | "ordinal" | "network"
const svg = renderToStaticSVG(chartConfig.type, chartConfig.props)`}
        language="js"
      />

      <h3 id="render-evidence">Render Evidence</h3>

      <p>
        <code>renderChartWithEvidence</code> returns the SVG <em>plus</em> a
        machine-readable account of what actually rendered, computed from the
        same scene graph the SVG converter walks: mark counts by scene type,
        resolved axis domains, an <code>empty</code> flag, category/node/edge
        counts, the annotation count, and the accessible name. A non-visual
        caller — an agent repair loop, a CI assertion, a report pipeline —
        checks <code>evidence.empty</code> or <code>evidence.markCount</code>{" "}
        instead of parsing SVG, and a chart that silently rendered zero data
        marks becomes a detectable condition rather than a blank image. The
        MCP <code>renderChart</code> tool returns the same block alongside its
        SVG/PNG output.
      </p>

      <CodeBlock
        code={`import { renderChartWithEvidence } from "semiotic/server"

const { svg, evidence } = renderChartWithEvidence("BarChart", {
  data, categoryAccessor: "product", valueAccessor: "units", title: "Sales",
})

evidence.markCount        // 3 — data marks in the rendered scene
evidence.markCountByType  // { rect: 3 }
evidence.empty            // false — EMPTY_SCENE appears in warnings when true
evidence.categories       // ["Widget", "Gadget", "Sprocket"]
evidence.yDomain          // [0, 682] — the resolved scale domain
evidence.ariaLabel        // "Sales"`}
        language="js"
      />

      {/* -------------------------------------------------------------- */}
      <h2 id="nextjs-examples">Next.js Integration Examples</h2>

      <h3 id="static-chart-in-page">Pre-Rendered Chart in a Page</h3>

      <p>
        Use <code>renderToStaticSVG</code> inside a Server Component to embed a
        chart that loads with zero client JavaScript:
      </p>

      <CodeBlock
        code={`// app/report/page.tsx — Server Component (no "use client")
import { renderOrdinalToStaticSVG } from "semiotic/server"

export default async function ReportPage() {
  const metrics = await db.getQuarterlyMetrics()

  const chartSvg = renderOrdinalToStaticSVG({
    size: [600, 300],
    data: metrics,
    oAccessor: "quarter",
    rAccessor: "revenue",
    type: "bar",
    style: () => ({ fill: "#4e79a7" }),
    axes: [{ orient: "left", tickFormat: d => "$" + d }],
  })

  return (
    <main>
      <h1>Q4 Report</h1>
      <div dangerouslySetInnerHTML={{ __html: chartSvg }} />
    </main>
  )
}`}
        language="jsx"
      />

      <p>
        The chart renders during build (for static pages) or on each request
        (for dynamic pages) with no client-side hydration cost.
      </p>

      <h3 id="og-image-route">OG Image API Route</h3>

      <p>
        Generate social preview images from chart SVGs in an API route. Combine
        with a library like <code>sharp</code> or <code>@vercel/og</code> to
        convert the SVG to PNG:
      </p>

      <CodeBlock
        code={`// app/api/chart-image/route.ts
import { renderXYToStaticSVG } from "semiotic/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const metric = searchParams.get("metric") || "pageviews"

  const data = await fetchTimeSeries(metric)

  const svg = renderXYToStaticSVG({
    size: [1200, 630],
    lines: [{ coordinates: data }],
    xAccessor: "date",
    yAccessor: "value",
    lineStyle: () => ({
      stroke: "#4e79a7",
      strokeWidth: 3,
      fill: "none",
    }),
    margin: { top: 40, right: 40, bottom: 60, left: 80 },
  })

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  })
}`}
        language="tsx"
      />

      {/* -------------------------------------------------------------- */}
      <h2 id="what-is-included">What's Included in Static Output</h2>

      <p>
        The server renderer runs the exact same data pipeline as the client
        components. The output SVG includes:
      </p>

      <ul>
        <li>
          All data marks — lines, areas, bars, points, nodes, edges, summaries,
          connectors
        </li>
        <li>Axes and tick marks</li>
        <li>Frame title</li>
        <li>SVG filter definitions (matte, clip paths)</li>
      </ul>

      <h3 id="what-is-excluded">What's Excluded</h3>

      <p>
        Static SVG rendering intentionally excludes browser-dependent features
        that have no meaning in a static context:
      </p>

      <ul>
        <li>
          <strong>Tooltips and hover behavior</strong> — no mouse events in
          static SVG.
        </li>
        <li>
          <strong>Interaction layer</strong> — brushing, clicking, voronoi hover
          regions.
        </li>
        <li>
          <strong>Canvas rendering</strong> — use SVG-mode props only; canvas
          marks are skipped.
        </li>
        <li>
          <strong>Annotations</strong> — annotation layout can depend on DOM
          measurement; planned for a future release.
        </li>
        <li>
          <strong>Responsive sizing</strong> — you must provide an explicit{" "}
          <code>size</code> prop; <code>StreamXYFrame</code> responsive mode and friends are
          client-only.
        </li>
        <li>
          <strong>Keyboard navigation</strong> — accessibility features that
          require focus management.
        </li>
      </ul>

      <p>
        If you need interactivity, use the standard client components.
        The server renderer is designed for the "static snapshot" use case.
      </p>

      {/* -------------------------------------------------------------- */}
      <h2 id="props-reference">Props</h2>

      <p>
        The server rendering functions accept the same props as their
        corresponding Frame components. You can pass any prop that{" "}
        <code>StreamXYFrame</code>, <code>StreamOrdinalFrame</code>, or{" "}
        <code>StreamNetworkFrame</code> accepts — the data pipeline is identical.
      </p>

      <p>
        A few props behave differently or are ignored in server rendering:
      </p>

      <ul>
        <li>
          <code>size</code> — <strong>required</strong>. There is no DOM to
          measure, so you must provide explicit dimensions.
        </li>
        <li>
          <code>hoverAnnotation</code>, <code>customHoverBehavior</code>,{" "}
          <code>customClickBehavior</code> — ignored (no interaction layer).
        </li>
        <li>
          <code>canvasLines</code>, <code>canvasPoints</code>,{" "}
          <code>canvasNodes</code>, etc. — ignored (no canvas element
          available).
        </li>
        <li>
          <code>tooltipContent</code> — ignored (no tooltip layer).
        </li>
      </ul>

      {/* -------------------------------------------------------------- */}
      <h2 id="api-summary">API Summary</h2>

      <CodeBlock
        code={`import {
  renderToStaticSVG,
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
} from "semiotic/server"

// Generic — pass frame type as first argument
renderToStaticSVG("xy", xyFrameProps)        // => string
renderToStaticSVG("ordinal", ordinalProps)   // => string
renderToStaticSVG("network", networkProps)   // => string

// Convenience — typed, no frame type argument needed
renderXYToStaticSVG(xyFrameProps)            // => string
renderOrdinalToStaticSVG(ordinalProps)       // => string
renderNetworkToStaticSVG(networkProps)       // => string`}
        language="ts"
      />

      <p>
        All functions are synchronous and return a complete SVG string.
      </p>

      {/* -------------------------------------------------------------- */}
      <h2 id="ssr-gallery">SSR Output Gallery</h2>

      <p>
        See the <Link to="/ssr-gallery">SSR Gallery</Link> for live examples of
        every chart type rendered using <code>renderToStaticSVG</code>. Each
        chart includes the exact code that produced it, so you can copy and
        adapt for your own server rendering needs.
      </p>

      {/* -------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — full API reference for
          XY chart props
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — full API
          reference for ordinal chart props
        </li>
        <li>
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> — full API
          reference for network chart props
        </li>
        <li>
          <Link to="/features/responsive">Responsive</Link> — client-side
          responsive sizing (not available in server rendering)
        </li>
      </ul>
    </PageLayout>
  )
}
