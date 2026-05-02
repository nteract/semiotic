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
      <h2 id="server-placeholder-pattern">SEO and First-Paint with a Server-Rendered Placeholder</h2>

      <p>
        The standard <code>"use client"</code> pattern works, but it skips
        server rendering entirely — the client mount is what produces the
        first paint. For pages that need indexable chart content, faster
        first contentful paint, or accessible chart output for non-JS
        clients, pair <code>next/dynamic</code> with{" "}
        <code>semiotic/server</code>'s <code>renderChart</code> as the
        placeholder. The server emits a static SVG that's part of the
        initial HTML; on hydration, the interactive client chart mounts in
        place of it.
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

      <CodeBlock
        code={`// app/dashboard/RevenueChart.tsx — client wrapper
"use client"
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"

// Lazy-load the interactive chart on the client only. The placeholder
// the server sends down comes from the parent server component below.
const InteractiveChart = dynamic(
  () => import("semiotic/xy").then((m) => m.LineChart),
  { ssr: false },
)

export default function RevenueChart(props: ComponentProps<typeof InteractiveChart>) {
  return <InteractiveChart {...props} />
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

  // Server-render a static SVG placeholder. Inline it as the initial
  // markup; the client wrapper above replaces it on hydration.
  const placeholder = renderChart("LineChart", chartProps)

  return (
    <main>
      <h1>Revenue</h1>
      <div
        // Same dimensions as the chart so layout doesn't shift on hydration.
        style={{ width: 800, height: 400 }}
        // The interactive chart will mount inside this div, replacing the SVG.
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: placeholder }}
      >
      </div>
      {/* Hydrate the interactive version. Pass the same props so the visual
          continuity is exact. */}
      <RevenueChart {...chartProps} />
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
          <code>suppressHydrationWarning</code> on the placeholder div is
          load-bearing — without it React complains about the SVG content
          differing between server and client. Hand-waved away here because
          the client takes ownership of that subtree on mount.
        </li>
        <li>
          The placeholder div needs the same dimensions as the chart so
          there's no layout shift when the client component mounts.
          Match <code>width</code> and <code>height</code>.
        </li>
        <li>
          Pass the same props to both the server <code>renderChart</code>{" "}
          call and the client <code>InteractiveChart</code>. Mismatch and
          you'll see the chart "jump" on hydration.
        </li>
        <li>
          For static / build-time pages this gives indexable chart SVG with
          no interactivity penalty (interactivity attaches on hydration).
          For dynamically-rendered pages on Node 18 or 19, the server pass
          runs on every request — fine for moderate traffic, but cache the
          result if you're rendering the same chart many times.
        </li>
      </ul>

      <p>
        This pattern is a one-piece fit: replace the server-rendered SVG
        with future Semiotic isomorphic-rehydration support (when it
        ships) by removing the <code>renderChart</code>{" "}
        / <code>dangerouslySetInnerHTML</code>{" "}
        scaffolding. No data shape or prop changes required.
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
