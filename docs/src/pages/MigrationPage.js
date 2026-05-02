import React from "react"
import { Link } from "react-router-dom"
import PageLayout from "../components/PageLayout"
import CodeBlock from "../components/CodeBlock"

// ---------------------------------------------------------------------------
// Migrating from Semiotic 1.x / 2.x to Semiotic 3
// ---------------------------------------------------------------------------

const installSnippet = `# React 18.1+ or 19 — Semiotic v3's peer-dep range is ^18.1.0 || ^19.0.0
npm install semiotic@latest react@^18.1.0 react-dom@^18.1.0
npm uninstall @types/semiotic   # built-in types ship with v3`

const aliasSnippet = `// Both work in v3 — XYFrame is aliased to StreamXYFrame
import { XYFrame } from "semiotic"
import { StreamXYFrame } from "semiotic"`

const lineFrameBefore = `import { XYFrame } from "semiotic"
import { curveMonotoneX } from "d3-shape"

<XYFrame
  lines={[{ coordinates: salesData }]}
  xAccessor="month"
  yAccessor="revenue"
  lineDataAccessor="coordinates"
  lineType={{ type: "line", interpolator: curveMonotoneX }}
  hoverAnnotation={true}
  size={[600, 400]}
/>`

const lineHocAfter = `import { LineChart } from "semiotic/xy"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  curve="monotoneX"
  width={600}
  height={400}
/>`

const lineStreamAfter = `import { StreamXYFrame } from "semiotic/xy"

<StreamXYFrame
  chartType="line"
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  curve="monotoneX"
  size={[600, 400]}
  enableHover
/>`

const networkBefore = `import { NetworkFrame } from "semiotic"

<NetworkFrame
  nodes={nodes}
  edges={edges}
  networkType={{ type: "force", iterations: 300 }}
  nodeIDAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  hoverAnnotation
  size={[800, 500]}
/>`

const networkAfter = `import { ForceDirectedGraph } from "semiotic/network"

<ForceDirectedGraph
  nodes={nodes}
  edges={edges}
  nodeIDAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  iterations={300}
  width={800}
  height={500}
/>`

const sankeyDiff = `- import { RealtimeSankey } from "semiotic"
- <RealtimeSankey ref={chartRef} size={[800, 400]} showParticles />
+ import { StreamNetworkFrame } from "semiotic/network"
+ <StreamNetworkFrame ref={chartRef} chartType="sankey" size={[800, 400]} showParticles />`

const facetDiff = `- import { FacetController } from "semiotic"
- <FacetController>
-   <XYFrame {...} />
-   <OrdinalFrame {...} />
- </FacetController>
+ import { LinkedCharts } from "semiotic"
+ <LinkedCharts>
+   <LineChart {...} linkedHover={{ name: "hl", fields: ["id"] }} selection={{ name: "hl" }} />
+   <BarChart {...} selection={{ name: "hl" }} />
+ </LinkedCharts>`

const baseMarkPropsDiff = `- <XYFrame baseMarkProps={{ transitionDuration: { fill: 500 } }} />
+ <LineChart animate={{ duration: 500 }} />`

const networkStyleBefore = `<NetworkFrame
  nodes={nodes}
  edges={edges}
  nodeStyle={d => ({ fill: d.cluster === "core" ? "#3b82f6" : "#94a3b8" })}
/>`

const networkStyleAfter = `<StreamNetworkFrame
  chartType="force"
  nodes={nodes}
  edges={edges}
  // d.data is the user-supplied node — d itself is a RealtimeNode wrapper
  nodeStyle={d => ({ fill: d.data.cluster === "core" ? "#3b82f6" : "#94a3b8" })}
/>`

const subpathDiff = `- import { LineChart } from "semiotic"             // full bundle (~165KB gz)
+ import { LineChart } from "semiotic/xy"           // XY only (~77KB gz)

- import { BarChart } from "semiotic"               // full bundle
+ import { BarChart } from "semiotic/ordinal"       // ordinal only (~64KB gz)

- import { SankeyDiagram } from "semiotic"          // full bundle
+ import { SankeyDiagram } from "semiotic/network"  // network only (~51KB gz)`

const streamingSnippet = `import { useRef, useEffect } from "react"
import { RealtimeLineChart } from "semiotic/realtime"

function LiveMetrics() {
  const ref = useRef()

  useEffect(() => {
    const interval = setInterval(() => {
      ref.current?.push({ time: Date.now(), value: Math.random() })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return <RealtimeLineChart ref={ref} stroke="#6366f1" windowSize={200} />
}`

const tsSnippet = `import { LineChart } from "semiotic/xy"
import type { LineChartProps } from "semiotic/xy"

interface SalesPoint {
  month: number
  revenue: number
}

<LineChart<SalesPoint>
  data={salesData}
  xAccessor="month"   // typechecked against keys of SalesPoint
  yAccessor="revenue"
/>`

const ssrSnippet = `// app/dashboard/Chart.tsx — client component
"use client"
import { LineChart } from "semiotic/xy"

export default function Chart({ data }) {
  return <LineChart data={data} xAccessor="month" yAccessor="revenue" />
}

// app/dashboard/page.tsx — server component
import Chart from "./Chart"

export default async function DashboardPage() {
  const data = await fetchMetrics()
  return <Chart data={data} />
}`

const staticSvgSnippet = `import { renderChart } from "semiotic/server"

const svg = renderChart("LineChart", {
  data: salesData,
  xAccessor: "month",
  yAccessor: "revenue",
  width: 600,
  height: 400,
  theme: "tufte",
})`

// ---------------------------------------------------------------------------

const calloutStyle = {
  padding: "12px 16px",
  borderRadius: "6px",
  marginBottom: "16px",
  borderLeft: "3px solid var(--accent, #4f46e5)",
  backgroundColor: "var(--surface-2, #f9fafb)",
  fontSize: "14px",
  lineHeight: "1.55",
}

function Tip({ children }) {
  return (
    <div style={calloutStyle}>
      <strong style={{ display: "block", marginBottom: "4px", color: "var(--accent, #4f46e5)" }}>
        Tip
      </strong>
      {children}
    </div>
  )
}

function BreakingChange({ children }) {
  return (
    <div
      style={{
        ...calloutStyle,
        borderLeftColor: "var(--semiotic-danger, #ef4444)",
      }}
    >
      <strong style={{ display: "block", marginBottom: "4px", color: "var(--semiotic-danger, #ef4444)" }}>
        Breaking change
      </strong>
      {children}
    </div>
  )
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: "24px",
  fontSize: "14px",
}
const thStyle = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid var(--border, #e5e7eb)",
  fontWeight: 600,
}
const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid var(--border, #e5e7eb)",
  verticalAlign: "top",
}

// ---------------------------------------------------------------------------

export default function MigrationPage() {
  return (
    <PageLayout
      title="Migrating to Semiotic 3"
      breadcrumbs={[{ label: "Migration", path: "/migration" }]}
      prevPage={{ title: "Getting Started", path: "/getting-started" }}
      nextPage={{ title: "Charts", path: "/charts" }}
    >
      <p>
        This guide walks you through upgrading an existing Semiotic 1.x or 2.x
        codebase to Semiotic 3. The legacy frame names (<code>XYFrame</code>,{" "}
        <code>OrdinalFrame</code>, <code>NetworkFrame</code>) are still
        exported — most apps compile after a single <code>npm install</code>{" "}
        bump. Past that, the work is incremental: pick up the chart HOCs as you
        touch each chart, switch to sub-path imports for smaller bundles, and
        adopt streaming or SSR features when you need them.
      </p>

      <Tip>
        If you only have a handful of charts, start with{" "}
        <a href="#tldr">the TL;DR</a>. If you have a large legacy app, read{" "}
        <a href="#whats-changed">What's changed</a> first so the prop diffs
        below make sense in context.
      </Tip>

      {/* ---------------------------------------------------------------- */}
      <h2 id="tldr">TL;DR</h2>

      <p>For most apps, three commands and one Frame rename are enough:</p>

      <CodeBlock code={installSnippet} language="bash" />

      <Tip>
        <strong style={{ display: "block", marginBottom: "4px" }}>
          Run the codemods.
        </strong>
        Most of the mechanical rewrites below — pure renames, JSX prop
        additions, and the sub-path import split — are automated by{" "}
        <a
          href="https://github.com/emeeks/semiotic-codemod"
          target="_blank"
          rel="noreferrer"
        >
          <code>semiotic-codemod</code>
        </a>
        . Run the full recipe before reading the rest of this guide:
        <CodeBlock
          code={`npx semiotic-codemod migration-recipe ./src`}
          language="bash"
        />
        See <a href="#codemods">the codemod section</a> below for the
        individual transforms and what's left to do by hand.
      </Tip>

      <p>
        The legacy <code>XYFrame</code>, <code>OrdinalFrame</code>, and{" "}
        <code>NetworkFrame</code> names still resolve, so existing imports
        compile:
      </p>

      <CodeBlock code={aliasSnippet} language="jsx" />

      <p>
        New code should use the chart HOCs (<code>LineChart</code>,{" "}
        <code>BarChart</code>, <code>SankeyDiagram</code>, etc.). They wrap the
        Stream Frames and ship with sensible defaults; you'll write a fraction
        of the boilerplate you wrote against legacy frames.
      </p>

      <BreakingChange>
        Three frame APIs and a handful of components were removed in v3:{" "}
        <code>RealtimeSankey</code>, <code>RealtimeNetworkFrame</code>,{" "}
        <code>FacetController</code>, <code>ProcessViz</code>, <code>Mark</code>,{" "}
        <code>SpanOrDiv</code>, and the <code>baseMarkProps</code> prop. See{" "}
        <a href="#removed-apis">Removed APIs</a> for the migration path on
        each.
      </BreakingChange>

      {/* ---------------------------------------------------------------- */}
      <h2 id="whats-changed">What's changed</h2>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Area</th>
            <th style={thStyle}>v1 / v2</th>
            <th style={thStyle}>v3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>React</td>
            <td style={tdStyle}>16+ (v1) / 17+ (v2-rc)</td>
            <td style={tdStyle}>18.1+ or 19 (peer-dep range <code>^18.1.0 || ^19.0.0</code>)</td>
          </tr>
          <tr>
            <td style={tdStyle}>Frames</td>
            <td style={tdStyle}>SVG-based <code>XYFrame</code>, <code>OrdinalFrame</code>, <code>NetworkFrame</code></td>
            <td style={tdStyle}>Canvas-first <code>StreamXYFrame</code>, <code>StreamOrdinalFrame</code>, <code>StreamNetworkFrame</code> (legacy names aliased)</td>
          </tr>
          <tr>
            <td style={tdStyle}>Rendering</td>
            <td style={tdStyle}>SVG marks + SVG chrome</td>
            <td style={tdStyle}>Canvas marks + SVG overlay (axes, labels, annotations)</td>
          </tr>
          <tr>
            <td style={tdStyle}>Chart catalog</td>
            <td style={tdStyle}>Build everything from frames</td>
            <td style={tdStyle}>40+ chart HOCs (<code>LineChart</code>, <code>BarChart</code>, …)</td>
          </tr>
          <tr>
            <td style={tdStyle}>Streaming</td>
            <td style={tdStyle}>Bespoke realtime components (<code>RealtimeSankey</code>, …)</td>
            <td style={tdStyle}>Ref-based <code>push()</code> on every frame and HOC</td>
          </tr>
          <tr>
            <td style={tdStyle}>SSR</td>
            <td style={tdStyle}>Not officially supported</td>
            <td style={tdStyle}>First-class — <code>"use client"</code> on every interactive component, plus a <code>semiotic/server</code> static-render entry point</td>
          </tr>
          <tr>
            <td style={tdStyle}>TypeScript</td>
            <td style={tdStyle}>Community <code>@types/semiotic</code></td>
            <td style={tdStyle}>Built-in types</td>
          </tr>
          <tr>
            <td style={tdStyle}>Bundle</td>
            <td style={tdStyle}>~440KB minified, no tree-shaking</td>
            <td style={tdStyle}>~165KB full bundle, ~50–80KB sub-path bundles</td>
          </tr>
          <tr>
            <td style={tdStyle}>Coordination</td>
            <td style={tdStyle}><code>FacetController</code></td>
            <td style={tdStyle}><code>LinkedCharts</code> + <code>linkedHover</code> / <code>selection</code> props</td>
          </tr>
        </tbody>
      </table>

      <p>
        The most consequential change is the move from SVG marks to canvas
        marks. Axes, labels, legends, and annotations still render as SVG (so
        they remain inspectable, themable via CSS, and accessible), but data
        marks are painted on a canvas. This is what makes streaming, large
        datasets, and 60fps interaction feasible — but it does mean a few
        SVG-only patterns (CSS selectors targeting marks, MutationObserver,
        screenshot pipelines that ignored canvas) need adjustment.
      </p>

      {/* ---------------------------------------------------------------- */}
      <h2 id="step-by-step">Step-by-step upgrade</h2>

      <h3 id="step-1">1. Update React to 18.1+ or 19</h3>

      <p>
        Semiotic 3 uses concurrent rendering features (transitions,
        deferred values) and ships with <code>"use client"</code> directives
        recognized by Next.js App Router and similar frameworks. The peer-dep
        range is <code>^18.1.0 || ^19.0.0</code>; React 16 and 17 are not
        supported, and 18.0.x is below the floor.
      </p>

      <CodeBlock code={`npm install react@^18.1.0 react-dom@^18.1.0`} language="bash" />

      <p>
        See the{" "}
        <a
          href="https://react.dev/blog/2022/03/08/react-18-upgrade-guide"
          target="_blank"
          rel="noreferrer"
        >
          React 18 upgrade guide
        </a>{" "}
        if you're coming from 16/17.
      </p>

      <h3 id="step-2">2. Install Semiotic 3</h3>

      <CodeBlock code={`npm install semiotic@latest`} language="bash" />

      <p>
        If you previously installed <code>@types/semiotic</code>, remove it —
        types now ship with the package.
      </p>

      <CodeBlock code={`npm uninstall @types/semiotic`} language="bash" />

      <h3 id="step-3">3. Re-run your app</h3>

      <p>
        Most v1/v2 codebases compile and render at this point. The legacy
        Frame names are aliased, prop signatures are largely backwards
        compatible, and existing chart code continues to work.
      </p>

      <Tip>
        If you hit an error referencing <code>RealtimeSankey</code>,{" "}
        <code>FacetController</code>, <code>baseMarkProps</code>,{" "}
        <code>ProcessViz</code>, <code>Mark</code>, or <code>SpanOrDiv</code>{" "}
        — those were removed. Skip to{" "}
        <a href="#removed-apis">Removed APIs</a> for the replacement.
      </Tip>

      <h3 id="step-4">4. Adopt chart HOCs (recommended)</h3>

      <p>
        v3 ships 40+ chart HOC components that wrap the Stream Frames with
        sensible defaults, automatic legends, hover handling, and TypeScript
        generics. New code is dramatically shorter than the equivalent legacy
        Frame:
      </p>

      <p>
        <strong>Before</strong> — legacy <code>XYFrame</code> with{" "}
        <code>lines</code> array and <code>lineType</code>:
      </p>
      <CodeBlock code={lineFrameBefore} language="jsx" />

      <p>
        <strong>After</strong> — <code>LineChart</code> HOC with flat data and
        a string <code>curve</code>:
      </p>
      <CodeBlock code={lineHocAfter} language="jsx" />

      <p>
        If you'd rather stay closer to the frame API (full control, no HOC
        defaults), use <code>StreamXYFrame</code> directly:
      </p>
      <CodeBlock code={lineStreamAfter} language="jsx" />

      <p>
        The same pattern applies to network charts —{" "}
        <code>NetworkFrame</code> with a <code>networkType</code> object
        becomes a single-purpose HOC like <code>ForceDirectedGraph</code>:
      </p>

      <p>
        <strong>Before:</strong>
      </p>
      <CodeBlock code={networkBefore} language="jsx" />

      <p>
        <strong>After:</strong>
      </p>
      <CodeBlock code={networkAfter} language="jsx" />

      <p>
        Each HOC accepts a <code>frameProps</code> escape hatch for advanced
        configuration that doesn't fit the prop API. See the{" "}
        <Link to="/charts">Charts catalog</Link> for the full list of HOCs and
        their props.
      </p>

      <h3 id="step-5">5. Switch to sub-path imports</h3>

      <p>
        v3 ships entry points per chart family. If you only render XY charts,
        importing from <code>semiotic/xy</code> drops the ordinal and network
        bundles entirely.
      </p>

      <CodeBlock code={subpathDiff} language="diff" />

      <p>
        Available entry points: <code>semiotic/xy</code>,{" "}
        <code>semiotic/ordinal</code>, <code>semiotic/network</code>,{" "}
        <code>semiotic/geo</code>, <code>semiotic/realtime</code>,{" "}
        <code>semiotic/server</code>, <code>semiotic/recipes</code>,{" "}
        <code>semiotic/utils</code>, <code>semiotic/themes</code>,{" "}
        <code>semiotic/data</code>.
      </p>

      {/* ---------------------------------------------------------------- */}
      <h2 id="codemods">Codemods</h2>

      <p>
        <a
          href="https://github.com/emeeks/semiotic-codemod"
          target="_blank"
          rel="noreferrer"
        >
          <code>semiotic-codemod</code>
        </a>{" "}
        ships automated transforms for the mechanical parts of the upgrade.
        Run the full recipe, or apply individual transforms one at a time.
        Every transform is idempotent — re-running produces no further
        changes — so it's safe to re-apply after manual edits.
      </p>

      <CodeBlock
        code={`# Run every transform, in order
npx semiotic-codemod migration-recipe ./src

# Or pick individual transforms
npx semiotic-codemod realtime-network-frame ./src
npx semiotic-codemod realtime-sankey ./src
npx semiotic-codemod subpath-imports ./src

# Preview without writing
npx semiotic-codemod migration-recipe ./src --dry --print`}
        language="bash"
      />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Transform</th>
            <th style={thStyle}>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}><code>realtime-network-frame</code></td>
            <td style={tdStyle}>
              Pure rename: <code>RealtimeNetworkFrame</code> →{" "}
              <code>StreamNetworkFrame</code> across imports, JSX, and
              identifier references.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}><code>realtime-sankey</code></td>
            <td style={tdStyle}>
              Renames <code>RealtimeSankey</code> →{" "}
              <code>StreamNetworkFrame</code> and adds{" "}
              <code>chartType="sankey"</code> to each JSX usage.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}><code>subpath-imports</code></td>
            <td style={tdStyle}>
              Splits bare <code>from "semiotic"</code> named imports into
              the appropriate sub-path entry points
              (<code>semiotic/xy</code>, <code>semiotic/ordinal</code>,{" "}
              <code>semiotic/network</code>, <code>semiotic/realtime</code>,{" "}
              <code>semiotic/geo</code>, <code>semiotic/themes</code>,{" "}
              <code>semiotic/recipes</code>). Symbols not in the manifest
              stay on the original <code>"semiotic"</code> import.
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        After running, format with your usual tool — codemods emit
        jscodeshift's default style on touched lines (semicolons on new
        statements; original style preserved on untouched ones):
      </p>

      <CodeBlock
        code={`npx semiotic-codemod migration-recipe ./src
npx prettier --write ./src`}
        language="bash"
      />

      <Tip>
        Some migrations aren't automated because they're context-dependent —
        replacing <code>baseMarkProps</code> with the right per-mark style
        prop varies per chart, and rewriting <code>FacetController</code>{" "}
        children needs new <code>linkedHover</code> / <code>selection</code>{" "}
        props that the codemod can't infer. Those are documented below.
      </Tip>

      {/* ---------------------------------------------------------------- */}
      <h2 id="removed-apis">Removed APIs</h2>

      <p>
        These components and props are not exported in v3. Each has a direct
        replacement.
      </p>

      <h3 id="realtime-sankey"><code>RealtimeSankey</code> → <code>StreamNetworkFrame</code></h3>

      <p>
        The bespoke realtime sankey was folded into{" "}
        <code>StreamNetworkFrame</code>'s sankey chart type. The push API and
        particle behavior are identical:
      </p>

      <CodeBlock code={sankeyDiff} language="diff" />

      <h3 id="realtime-network-frame"><code>RealtimeNetworkFrame</code> → <code>StreamNetworkFrame</code></h3>

      <p>
        Direct rename. The export still works as an alias if you prefer not to
        touch existing files; new code should use <code>StreamNetworkFrame</code>{" "}
        for clarity.
      </p>

      <h3 id="facet-controller"><code>FacetController</code> → <code>LinkedCharts</code></h3>

      <p>
        The cross-chart coordination model was rebuilt around explicit{" "}
        <code>linkedHover</code>, <code>linkedBrush</code>, and{" "}
        <code>selection</code> props that name what's being shared, plus a{" "}
        <code>LinkedCharts</code> wrapper that hosts the shared state.
      </p>

      <CodeBlock code={facetDiff} language="diff" />

      <h3 id="base-mark-props"><code>baseMarkProps</code> (removed)</h3>

      <p>
        Two replacements depending on what you used <code>baseMarkProps</code>{" "}
        for:
      </p>
      <ul>
        <li>
          For <strong>per-mark styling</strong> (fill, stroke, opacity), use
          the per-mark style props — <code>lineStyle</code>,{" "}
          <code>pointStyle</code>, <code>pieceStyle</code>, etc. Each accepts
          either a static style object or a function returning one.
        </li>
        <li>
          For <strong>transition / animation timing</strong>, use the{" "}
          <code>animate</code> prop on the HOC. v3 marks render to canvas, so
          CSS transitions on style objects do not animate mark updates —{" "}
          <code>animate</code> wires the duration/easing into the canvas
          transition pipeline, which is what produces the actual smooth
          interpolation.
        </li>
      </ul>

      <CodeBlock code={baseMarkPropsDiff} language="diff" />

      <p>
        <code>animate</code> accepts <code>true</code>, a number of
        milliseconds, or <code>{`{ duration, easing, intro }`}</code>. The{" "}
        <Link to="/api/charts">chart API reference</Link> lists per-chart
        defaults.
      </p>

      <h3 id="process-viz"><code>ProcessViz</code>, <code>Mark</code>, <code>SpanOrDiv</code> (removed)</h3>

      <p>
        These low-level building blocks are gone. <code>ProcessViz</code> was a
        debugging aid; <code>Mark</code> and <code>SpanOrDiv</code> were
        primitives no longer needed once frames switched to canvas. If you
        depended on them, replace with direct SVG/HTML elements or scene
        primitives via the <Link to="/features/custom-charts">custom layout
        APIs</Link>.
      </p>

      {/* ---------------------------------------------------------------- */}
      <h2 id="behavioral-changes">Behavioral changes</h2>

      <h3 id="canvas-marks">Canvas marks (not SVG)</h3>

      <p>
        Data marks are painted on a canvas in v3. Existing code that reaches
        into the DOM to inspect or manipulate marks (CSS selectors,{" "}
        <code>MutationObserver</code>, screenshot tools that walk the SVG
        tree) won't see marks anymore. Style overrides should move to the
        per-mark style props (<code>lineStyle</code>,{" "}
        <code>pieceStyle</code>, <code>pointStyle</code>, etc.) or to
        theme-level CSS variables.
      </p>

      <Tip>
        Axes, labels, legends, annotations, and tooltips remain SVG/HTML in
        v3. Theming and accessibility tools targeting those layers continue to
        work without changes.
      </Tip>

      <h3 id="network-style-callbacks">Network style callbacks see <code>RealtimeNode</code></h3>

      <p>
        On <code>StreamNetworkFrame</code> (and the network HOCs),{" "}
        <code>nodeStyle</code> and <code>edgeStyle</code> functions receive a{" "}
        <code>RealtimeNode</code>/<code>RealtimeEdge</code> wrapper. Your
        original data lives on <code>d.data</code> instead of directly on{" "}
        <code>d</code>.
      </p>

      <p>
        <strong>Before:</strong>
      </p>
      <CodeBlock code={networkStyleBefore} language="jsx" />

      <p>
        <strong>After:</strong>
      </p>
      <CodeBlock code={networkStyleAfter} language="jsx" />

      <h3 id="responsive-frames">Responsive sizing is built in</h3>

      <p>
        <code>ResponsiveXYFrame</code>, <code>ResponsiveOrdinalFrame</code>,
        and <code>ResponsiveNetworkFrame</code> are aliased to the base Stream
        Frames. Pass <code>responsiveWidth</code> /{" "}
        <code>responsiveHeight</code> on a frame, or omit dimensions on an HOC
        — both measure the container automatically.
      </p>

      {/* ---------------------------------------------------------------- */}
      <h2 id="streaming">Adding streaming (optional)</h2>

      <p>
        Every chart HOC and Stream Frame in v3 accepts a forwarded ref. Call{" "}
        <code>ref.current.push()</code> to ingest live data; the frame handles
        windowing, decay, transitions, and re-paint. Omit the{" "}
        <code>data</code> prop entirely when streaming — passing an empty
        array clears the chart on every render.
      </p>

      <CodeBlock code={streamingSnippet} language="jsx" />

      <p>
        See the <Link to="/features/push-api">Push API</Link> page for the
        full ref shape (<code>push</code>, <code>pushMany</code>,{" "}
        <code>remove</code>, <code>update</code>, <code>clear</code>,{" "}
        <code>getData</code>, <code>getScales</code>) and the streaming
        encodings (<code>decay</code>, <code>pulse</code>,{" "}
        <code>staleness</code>, <code>transition</code>) you can compose on
        top.
      </p>

      {/* ---------------------------------------------------------------- */}
      <h2 id="typescript">TypeScript</h2>

      <p>
        v3 ships its own type definitions. Remove any{" "}
        <code>@types/semiotic</code> from your dependencies. Every chart HOC
        accepts a generic for the row type so accessor strings are validated
        against your data:
      </p>

      <CodeBlock code={tsSnippet} language="tsx" />

      <p>
        Frame and HOC prop types are exported from each entry point — e.g.{" "}
        <code>{`import type { LineChartProps } from "semiotic/xy"`}</code>.
      </p>

      {/* ---------------------------------------------------------------- */}
      <h2 id="ssr">Next.js, Remix, and SSR frameworks</h2>

      <p>
        v3 charts include a <code>"use client"</code> directive at the top of
        each module, so the App Router treats them as client components
        automatically. The standard pattern is a thin client wrapper that the
        server component imports:
      </p>

      <CodeBlock code={ssrSnippet} language="tsx" />

      <p>
        For static SVG output that doesn't require a browser at all (email,
        OG images, PDFs, dashboards rendered into static sites), use the{" "}
        <code>semiotic/server</code> entry point:
      </p>

      <CodeBlock code={staticSvgSnippet} language="ts" />

      <p>
        See <Link to="/using-ssr">Server-side rendering</Link> for the full
        SSR story.
      </p>

      {/* ---------------------------------------------------------------- */}
      <h2 id="faq">FAQ</h2>

      <h3 id="faq-keep-frames">Do I have to migrate off the legacy Frame imports?</h3>

      <p>
        No. <code>XYFrame</code>, <code>OrdinalFrame</code>,{" "}
        <code>NetworkFrame</code>, and the responsive variants are aliased to
        the v3 Stream Frames. Existing imports compile, existing prop names
        keep working, and existing accessors still resolve. The recommendation
        is to switch to the chart HOCs as you touch each chart — not to do a
        big-bang rewrite.
      </p>

      <h3 id="faq-mix">Can I mix legacy frames and v3 HOCs?</h3>

      <p>
        Yes. The HOCs wrap Stream Frames internally, and Stream Frames live
        alongside any aliased legacy frame on the same page. There's no
        runtime conflict.
      </p>

      <h3 id="faq-v2">What happened to v2?</h3>

      <p>
        v2 was a series of release candidates (up to <code>2.0.0-rc.12</code>)
        that began the internal refactoring to functional components and
        TypeScript. It never promoted to a stable release. v3 completes that
        work and adds the chart HOCs, the stream-first Frames, SSR, sub-path
        imports, and built-in types.
      </p>

      <h3 id="faq-stuck">Where do I file bugs about migration issues?</h3>

      <p>
        Open an issue at{" "}
        <a
          href="https://github.com/nteract/semiotic/issues"
          target="_blank"
          rel="noreferrer"
        >
          github.com/nteract/semiotic/issues
        </a>
        . Include the legacy snippet you're migrating from and what the v3
        equivalent should produce.
      </p>
    </PageLayout>
  )
}
