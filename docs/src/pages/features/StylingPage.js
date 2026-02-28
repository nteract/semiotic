import React from "react"
import { OrdinalFrame, XYFrame } from "semiotic"

import PageLayout from "../../components/PageLayout"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const theme = [
  "#ac58e5",
  "#E0488B",
  "#9fd0cb",
  "#e0d33a",
  "#7566ff",
  "#533f82",
]

const barData = [5, 8, 2, 3, 10, 5, 8, 2, 3, 10]

const lineData = [
  {
    label: "Revenue",
    coordinates: [
      { month: 1, value: 12 },
      { month: 2, value: 18 },
      { month: 3, value: 14 },
      { month: 4, value: 22 },
      { month: 5, value: 19 },
      { month: 6, value: 27 },
      { month: 7, value: 24 },
      { month: 8, value: 31 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const stylingProps = [
  {
    name: "renderMode / pointRenderMode / lineRenderMode / summaryRenderMode",
    type: '"sketchy" | function',
    required: false,
    default: "undefined",
    description:
      'Set to "sketchy" to render marks in a hand-drawn style. Can be a function that receives each data item and returns "sketchy" selectively. Available on all Frame types with type-specific prop names.',
  },
  {
    name: "additionalDefs",
    type: "array",
    required: false,
    default: "[]",
    description:
      "Array of SVG <defs> elements (patterns, gradients, filters, etc.) to include in the frame's SVG. Reference them via url(#id) in style props.",
  },
  {
    name: "foregroundGraphics",
    type: "ReactNode | function",
    required: false,
    default: "null",
    description:
      "SVG elements rendered in front of all data visualization marks. Can be a function receiving { size, margin }.",
  },
  {
    name: "backgroundGraphics",
    type: "ReactNode | function",
    required: false,
    default: "null",
    description:
      "SVG elements rendered behind all data visualization marks. Can be a function receiving { size, margin }.",
  },
  {
    name: "style / lineStyle / pointStyle / nodeStyle / edgeStyle",
    type: "object | function",
    required: false,
    default: "{}",
    description:
      "Inline SVG style applied to marks. When a function, receives the data element and index. Use for fill, stroke, opacity, etc.",
  },
  {
    name: "className / lineClass / pointClass",
    type: "string | function",
    required: false,
    default: '""',
    description:
      "CSS class name applied to marks. When a function, receives the data element. Use for external CSS styling.",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StylingPage() {
  return (
    <PageLayout
      title="Styling"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Styling", path: "/features/styling" },
      ]}
      prevPage={{
        title: "Small Multiples",
        path: "/features/small-multiples",
      }}
      nextPage={{ title: "Legends", path: "/features/legends" }}
    >
      <p>
        Semiotic provides multiple layers of styling control, from simple inline
        style objects to SVG patterns, sketchy hand-drawn rendering, and
        foreground/background graphics layers. This page covers all the ways to
        customize the visual appearance of your data visualizations.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components provide high-level styling through props like{" "}
        <code>colorBy</code> and <code>colorScheme</code>. For advanced styling
        such as sketchy rendering, patterns, or custom SVG layers, use the{" "}
        <code>frameProps</code> escape hatch to pass Frame-level styling props.
      </p>

      <CodeBlock
        code={`import { BarChart } from "semiotic"

// Simple color styling via Chart API
<BarChart
  data={salesData}
  xAccessor="quarter"
  yAccessor="revenue"
  colorBy="region"
  colorScheme={["#ac58e5", "#E0488B", "#9fd0cb"]}
/>

// Advanced styling via frameProps escape hatch
<BarChart
  data={salesData}
  xAccessor="quarter"
  yAccessor="revenue"
  frameProps={{
    renderMode: "sketchy",
    additionalDefs: [
      <linearGradient key="grad" id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#ac58e5" offset="0%" />
        <stop stopColor="#7566ff" offset="100%" />
      </linearGradient>
    ],
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="sketchy-rendering">Sketchy / Hand-Drawn Rendering</h3>
      <p>
        Semiotic can render marks in a hand-drawn, "sketchy" style using the{" "}
        <code>renderMode</code> prop. This uses the{" "}
        <a
          href="https://github.com/emeeks/semiotic-mark"
          target="_blank"
          rel="noopener noreferrer"
        >
          semiotic-mark
        </a>{" "}
        library under the hood. The sketchy fill density reflects the{" "}
        <code>fillOpacity</code> of each element: higher opacity produces more
        fill lines.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          type: "bar",
          renderMode: "sketchy",
          style: (d, i) => ({
            fill: theme[i % theme.length],
            stroke: theme[i % theme.length],
            fillOpacity: 0.75,
          }),
          oPadding: 4,
          margin: { top: 20, bottom: 20, left: 40, right: 20 },
          title: "Sketchy Bar Chart",
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: "[5, 8, 2, 3, 10, 5, 8, 2, 3, 10]",
          style: `(d, i) => ({
  fill: theme[i % theme.length],
  stroke: theme[i % theme.length],
  fillOpacity: 0.75,
})`,
        }}
        functions={{
          style: (d, i) => ({
            fill: theme[i % theme.length],
            stroke: theme[i % theme.length],
            fillOpacity: 0.75,
          }),
        }}
        hiddenProps={{}}
        startHidden={false}
      />

      <p>
        Each frame type has its own render mode props:
      </p>
      <ul>
        <li>
          <strong>XYFrame:</strong> <code>pointRenderMode</code>,{" "}
          <code>lineRenderMode</code>, <code>summaryRenderMode</code>
        </li>
        <li>
          <strong>OrdinalFrame:</strong> <code>renderMode</code>,{" "}
          <code>summaryRenderMode</code>
        </li>
        <li>
          <strong>NetworkFrame:</strong> <code>nodeRenderMode</code>,{" "}
          <code>edgeRenderMode</code>
        </li>
      </ul>

      <p>
        You can also pass a function to selectively apply sketchy rendering:
      </p>

      <CodeBlock
        code={`// Only render items above a threshold as sketchy
<OrdinalFrame
  renderMode={d => d.value > 5 ? "sketchy" : undefined}
  // ...other props
/>`}
        language="jsx"
      />

      <h3 id="svg-patterns-and-gradients">SVG Patterns and Gradients</h3>
      <p>
        The <code>additionalDefs</code> prop lets you define SVG{" "}
        <code>&lt;pattern&gt;</code>, <code>&lt;linearGradient&gt;</code>,{" "}
        <code>&lt;radialGradient&gt;</code>, and{" "}
        <code>&lt;filter&gt;</code> elements inside the frame's SVG. Reference
        them via <code>url(#id)</code> in your style functions.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          type: "bar",
          style: (d, i) => ({
            fill: i < 5 ? "url(#gradient)" : "url(#dots)",
          }),
          additionalDefs: [
            <pattern
              key="dots"
              id="dots"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <rect fill={theme[1]} width="10" height="10" />
              <circle fill={theme[4]} r="3" cx="5" cy="5" />
            </pattern>,
            <linearGradient
              key="gradient"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
              id="gradient"
            >
              <stop stopColor={theme[0]} offset="0%" />
              <stop stopColor={theme[4]} offset="100%" />
            </linearGradient>,
          ],
          oPadding: 2,
          margin: 20,
          title: "Patterns and Gradients",
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: "[5, 8, 2, 3, 10, 5, 8, 2, 3, 10]",
          style: `(d, i) => ({
  fill: i < 5 ? "url(#gradient)" : "url(#dots)",
})`,
          additionalDefs: `[
  <pattern key="dots" id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
    <rect fill="#E0488B" width="10" height="10" />
    <circle fill="#7566ff" r="3" cx="5" cy="5" />
  </pattern>,
  <linearGradient key="gradient" x1="0" x2="0" y1="0" y2="1" id="gradient">
    <stop stopColor="#ac58e5" offset="0%" />
    <stop stopColor="#7566ff" offset="100%" />
  </linearGradient>,
]`,
        }}
        functions={{
          style: (d, i) => ({
            fill: i < 5 ? "url(#gradient)" : "url(#dots)",
          }),
        }}
        hiddenProps={{}}
        startHidden
      />

      <h3 id="foreground-background-graphics">
        Foreground and Background Graphics
      </h3>
      <p>
        Every Frame has two extra SVG layers: <code>backgroundGraphics</code>{" "}
        (rendered behind the data) and <code>foregroundGraphics</code> (rendered
        in front). You can pass raw SVG elements or a function that receives{" "}
        <code>{`{ size, margin }`}</code>.
      </p>

      <LiveExample
        frameProps={{
          lines: lineData,
          xAccessor: "month",
          yAccessor: "value",
          lineDataAccessor: "coordinates",
          lineStyle: () => ({ stroke: theme[0], strokeWidth: 2.5 }),
          axes: [
            { orient: "left" },
            { orient: "bottom", ticks: 8 },
          ],
          margin: { top: 30, bottom: 40, left: 50, right: 20 },
          backgroundGraphics: (
            <g>
              <rect
                x={50}
                y={30}
                width={430}
                height={230}
                fill="#f4f0ff"
                rx={4}
              />
              <text x={265} y={150} textAnchor="middle" fill="#d0c4ee" fontSize={48} fontWeight={700} opacity={0.5}>
                DRAFT
              </text>
            </g>
          ),
          foregroundGraphics: (
            <g>
              <line x1={50} y1={130} x2={480} y2={130} stroke="#E0488B" strokeWidth={1} strokeDasharray="4 4" />
              <text x={482} y={134} fill="#E0488B" fontSize={11} fontWeight={600}>
                Target
              </text>
            </g>
          ),
          title: "With Background & Foreground Layers",
        }}
        type={XYFrame}
        overrideProps={{
          lines: `[{
  label: "Revenue",
  coordinates: [
    { month: 1, value: 12 },
    { month: 2, value: 18 },
    // ...more data
  ],
}]`,
          lineStyle: `() => ({ stroke: "#ac58e5", strokeWidth: 2.5 })`,
          backgroundGraphics: `(
  <g>
    <rect x={50} y={30} width={430} height={230} fill="#f4f0ff" rx={4} />
    <text x={265} y={150} textAnchor="middle" fill="#d0c4ee"
          fontSize={48} fontWeight={700} opacity={0.5}>
      DRAFT
    </text>
  </g>
)`,
          foregroundGraphics: `(
  <g>
    <line x1={50} y1={130} x2={480} y2={130}
          stroke="#E0488B" strokeWidth={1} strokeDasharray="4 4" />
    <text x={482} y={134} fill="#E0488B" fontSize={11} fontWeight={600}>
      Target
    </text>
  </g>
)`,
          axes: `[{ orient: "left" }, { orient: "bottom", ticks: 8 }]`,
        }}
        functions={{
          lineStyle: () => ({ stroke: theme[0], strokeWidth: 2.5 }),
        }}
        hiddenProps={{}}
        startHidden
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <PropTable componentName="Styling" props={stylingProps} />

      <h3 id="style-functions-vs-objects">Style Functions vs. Objects</h3>
      <p>
        Style props accept either a plain object (applied uniformly) or a
        function (for data-driven styling). Functions receive the data item and
        its index:
      </p>

      <CodeBlock
        code={`// Static style object (same for all bars)
<OrdinalFrame
  style={{ fill: "#ac58e5", stroke: "white" }}
/>

// Dynamic style function (data-driven)
<OrdinalFrame
  style={(d, i) => ({
    fill: d.value > 10 ? "#E0488B" : "#9fd0cb",
    stroke: "white",
    strokeWidth: 1,
    opacity: d.active ? 1 : 0.5,
  })}
/>`}
        language="jsx"
      />

      <h3 id="css-classes">CSS Class Names</h3>
      <p>
        For external CSS styling, use the class name props. These also accept
        strings or functions:
      </p>

      <CodeBlock
        code={`// Static class
<XYFrame lineClass="revenue-line" />

// Dynamic class function
<XYFrame
  lineClass={d => \`line-\${d.category}\`}
  pointClass={d => d.highlighted ? "point-active" : "point-default"}
/>

/* In your CSS file */
.revenue-line { stroke: #ac58e5; stroke-width: 2; }
.point-active { fill: #E0488B; r: 6; }
.point-default { fill: #ccc; r: 3; }`}
        language="jsx"
      />

      <h3 id="graphics-as-functions">Graphics Layers as Functions</h3>
      <p>
        When you need to position background or foreground elements relative to
        the frame dimensions, pass a function instead of static JSX. The
        function receives <code>{`{ size, margin }`}</code>:
      </p>

      <CodeBlock
        code={`<XYFrame
  backgroundGraphics={({ size, margin }) => (
    <rect
      x={margin.left}
      y={margin.top}
      width={size[0] - margin.left - margin.right}
      height={size[1] - margin.top - margin.bottom}
      fill="#fafafa"
      rx={4}
    />
  )}
  foregroundGraphics={({ size, margin }) => (
    <text
      x={size[0] / 2}
      y={margin.top - 10}
      textAnchor="middle"
      fontSize={12}
      fill="#666"
    >
      Custom annotation layer
    </text>
  )}
/>`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="texture-libraries">Using Texture Libraries</h3>
      <p>
        For more sophisticated patterns, you can use libraries like{" "}
        <a
          href="https://riccardoscalco.it/textures/"
          target="_blank"
          rel="noopener noreferrer"
        >
          textures.js
        </a>{" "}
        or{" "}
        <a
          href="https://github.com/hshoff/vx"
          target="_blank"
          rel="noopener noreferrer"
        >
          vx/patterns
        </a>
        . Generate the pattern elements and add them to{" "}
        <code>additionalDefs</code>, then reference them by their ID in your
        style functions.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — lineStyle, pointStyle,
          summaryStyle, and render mode props
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — style,
          renderMode, summaryStyle, and pattern support
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — nodeStyle,
          edgeStyle, and render mode props
        </li>
        <li>
          <Link to="/features/canvas-rendering">Canvas Rendering</Link> —
          canvas post-processing for visual effects
        </li>
        <li>
          <Link to="/features/legends">Legends</Link> — styling legend items to
          match your visualization
        </li>
      </ul>
    </PageLayout>
  )
}
