import React from "react"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

export default function PerformancePage() {
  return (
    <PageLayout title="Performance" subtitle="Accessor stability, memoization, and rendering efficiency">
      <section>
        <h2>Accessor Stability</h2>
        <p>
          Semiotic's canvas-based rendering pipeline rebuilds the scene graph when chart
          configuration changes. Every time a parent component re-renders, React creates
          new prop values — including new function objects for inline accessors like{" "}
          <code>{"xAccessor={d => d.time}"}</code>. Without mitigation, each re-render
          triggers a full scene rebuild even when nothing meaningful changed.
        </p>
        <p>
          Semiotic handles this automatically via <strong>accessor equivalence checking</strong>.
          When <code>updateConfig</code> receives new accessor values, it compares them to the
          previous values using <code>accessorsEquivalent()</code>:
        </p>
        <ul>
          <li><strong>String accessors</strong> — compared by value (<code>"x" === "x"</code>)</li>
          <li><strong>Same function reference</strong> — identical (<code>fn === fn</code>)</li>
          <li><strong>Inline arrows with identical source</strong> — compared via <code>.toString()</code></li>
          <li><strong>Different types</strong> — always treated as changed</li>
        </ul>
        <p>
          This means <code>{"xAccessor={d => d.time}"}</code> written inline in JSX will
          <em>not</em> trigger a scene rebuild on re-render, as long as the source code
          is identical each time. However, string accessors remain the most reliable and
          efficient option.
        </p>

        <h3>Accessor preference order</h3>
        <p>From most stable to least:</p>
        <CodeBlock>{`// 1. String accessor (best) — always stable
<LineChart xAccessor="time" yAccessor="value" />

// 2. Function defined outside the component — stable reference
const getX = (d) => d.timestamp / 1000
function MyChart() {
  return <LineChart xAccessor={getX} yAccessor="value" />
}

// 3. useCallback — stable across re-renders
function MyChart({ divisor }) {
  const getX = useCallback((d) => d.timestamp / divisor, [divisor])
  return <LineChart xAccessor={getX} yAccessor="value" />
}

// 4. Inline arrow (OK) — caught by .toString() heuristic
<LineChart xAccessor={d => d.timestamp / 1000} yAccessor="value" />`}
        </CodeBlock>

        <h3>When .toString() does not help</h3>
        <p>
          The <code>.toString()</code> comparison catches inline arrows with identical source text.
          It does <strong>not</strong> help when the function body is the same but it closes over a
          changing variable:
        </p>
        <CodeBlock>{`// WARNING: multiplier changes but the source text is always "d => d.value * multiplier"
// .toString() sees them as equal even though behavior changed
function MyChart({ multiplier }) {
  return <LineChart yAccessor={d => d.value * multiplier} />
}

// FIX: use useCallback with multiplier in the dependency array
function MyChart({ multiplier }) {
  const getY = useCallback((d) => d.value * multiplier, [multiplier])
  return <LineChart yAccessor={getY} />
}`}
        </CodeBlock>

        <h3>diagnoseConfig warning</h3>
        <p>
          The <code>diagnoseConfig</code> utility (and <code>npx semiotic-ai --doctor</code>)
          emits a <code>FUNCTION_ACCESSOR</code> warning when it detects function accessors in
          your props. This is informational — function accessors work fine, but string accessors
          are preferred for maximum stability and clarity.
        </p>
        <CodeBlock>{`import { diagnoseConfig } from "semiotic/ai"

const result = diagnoseConfig("LineChart", {
  data: myData,
  xAccessor: d => d.time,
  yAccessor: "value",
})
// result.diagnoses includes:
// { code: "FUNCTION_ACCESSOR", severity: "warning",
//   message: "Function accessor detected: xAccessor. ..." }`}
        </CodeBlock>
      </section>

      <section>
        <h2>MCP Rasterized Output</h2>
        <p>
          The Semiotic MCP server's <code>renderChart</code> tool supports both SVG and PNG
          output formats. SVG is the default. PNG output requires the optional{" "}
          <code>sharp</code> package.
        </p>
        <CodeBlock>{`// MCP tool call with format parameter
{
  "component": "LineChart",
  "props": {
    "data": [{ "x": 1, "y": 10 }, { "x": 2, "y": 20 }],
    "xAccessor": "x",
    "yAccessor": "y"
  },
  "format": "png"  // "svg" (default) or "png"
}`}
        </CodeBlock>

        <h3>Installing sharp</h3>
        <p>
          PNG output uses <a href="https://sharp.pixelplumbing.com/">sharp</a> for SVG-to-PNG
          conversion. It's listed as an optional dependency — install it when you need PNG:
        </p>
        <CodeBlock>{`npm install sharp`}</CodeBlock>
        <p>
          If <code>sharp</code> is not installed and <code>format: "png"</code> is requested,
          the tool returns the SVG output with an installation hint instead of failing.
        </p>

        <h3>Output format</h3>
        <p>
          PNG output is returned as a Base64 data URI string:{" "}
          <code>data:image/png;base64,...</code>. This can be embedded directly in HTML
          or saved to a file by decoding the Base64 payload.
        </p>
      </section>

      <section>
        <h2>General Tips</h2>
        <ul>
          <li>
            <strong>Use sub-entries for smaller bundles.</strong>{" "}
            Import from <code>semiotic/xy</code>, <code>semiotic/ordinal</code>, etc. instead
            of the main <code>semiotic</code> entry to tree-shake unused chart types.
            See <Link to="/getting-started">Getting Started</Link>.
          </li>
          <li>
            <strong>Canvas rendering is default.</strong> All Stream Frames and HOC charts
            render to <code>&lt;canvas&gt;</code> with SVG overlays for annotations and tooltips.
            This gives better performance than pure SVG for large datasets.
          </li>
          <li>
            <strong>Streaming data uses ring buffers.</strong> The{" "}
            <code>windowSize</code> prop controls how many points are kept in memory.
            Older points are evicted automatically.
          </li>
          <li>
            <strong>Push API avoids re-render overhead.</strong> Use{" "}
            <code>ref.current.push(datum)</code> instead of updating a state array.
            See <Link to="/features/realtime-encoding">Realtime Encoding</Link>.
          </li>
        </ul>
      </section>
    </PageLayout>
  )
}
