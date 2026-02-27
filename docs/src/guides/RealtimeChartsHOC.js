import React, { useRef, useEffect } from "react"
import {
  RealtimeLineChart,
  RealtimeBarChart,
  RealtimeSwarmChart,
  RealtimeWaterfallChart
} from "semiotic"
import MarkdownText from "../MarkdownText"

const CodeBlock = ({ code }) => (
  <pre style={{
    background: "#f5f5f5",
    padding: "16px",
    borderRadius: "4px",
    overflow: "auto",
    fontSize: "14px",
    lineHeight: "1.5"
  }}>
    <code>{code}</code>
  </pre>
)

const ExampleContainer = ({ title, children, code }) => (
  <div style={{ marginBottom: "60px" }}>
    <h3>{title}</h3>
    <div style={{
      border: "1px solid #ddd",
      padding: "20px",
      marginBottom: "16px",
      background: "white"
    }}>
      {children}
    </div>
    <CodeBlock code={code} />
  </div>
)

function generatePoint(index) {
  return {
    time: index,
    value: Math.sin(index * 0.05) * 50 + 100 + (Math.random() - 0.5) * 20,
  }
}

function LineChartDemo() {
  const ref = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (ref.current) ref.current.push(generatePoint(indexRef.current++))
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeLineChart
      ref={ref}
      stroke="#007bff"
      strokeWidth={2}
      windowSize={200}
      size={[700, 300]}
      enableHover
    />
  )
}

function DarkLineChartDemo() {
  const ref = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (ref.current) ref.current.push(generatePoint(indexRef.current++))
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeLineChart
      ref={ref}
      stroke="#50fa7b"
      strokeWidth={1.5}
      windowSize={100}
      size={[700, 250]}
      showAxes={false}
      background="#1e1e2e"
      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
    />
  )
}

function BarChartDemo() {
  const ref = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (!ref.current) return
      ref.current.push({
        time: indexRef.current++,
        value: Math.floor(Math.random() * 10) + 1,
      })
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeBarChart
      ref={ref}
      binSize={20}
      fill="#007bff"
      windowSize={300}
      size={[700, 300]}
      enableHover
    />
  )
}

function StackedBarChartDemo() {
  const ref = useRef()
  const indexRef = useRef(0)
  const categories = ["errors", "warnings", "info"]

  useEffect(() => {
    const id = setInterval(() => {
      if (!ref.current) return
      const cat = categories[Math.floor(Math.random() * categories.length)]
      ref.current.push({
        time: indexRef.current++,
        value: Math.floor(Math.random() * 8) + 1,
        category: cat,
      })
    }, 20)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeBarChart
      ref={ref}
      binSize={25}
      windowSize={400}
      size={[700, 300]}
      categoryAccessor="category"
      colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
      enableHover
    />
  )
}

function SwarmChartDemo() {
  const ref = useRef()
  const indexRef = useRef(0)
  const categories = ["sensor1", "sensor2", "sensor3"]

  useEffect(() => {
    const id = setInterval(() => {
      if (!ref.current) return
      const cat = categories[Math.floor(Math.random() * categories.length)]
      ref.current.push({
        time: indexRef.current++,
        value: Math.random() * 100,
        category: cat,
      })
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeSwarmChart
      ref={ref}
      windowSize={400}
      size={[700, 300]}
      categoryAccessor="category"
      colors={{ sensor1: "#007bff", sensor2: "#28a745", sensor3: "#dc3545" }}
      radius={3}
      opacity={0.7}
    />
  )
}

function WaterfallDemo() {
  const ref = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (!ref.current) return
      ref.current.push({
        time: indexRef.current++,
        value: (Math.random() - 0.45) * 20,
      })
    }, 40)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeWaterfallChart
      ref={ref}
      windowSize={300}
      size={[700, 300]}
      positiveColor="#28a745"
      negativeColor="#dc3545"
      connectorStroke="#999"
      connectorWidth={1}
      gap={1}
    />
  )
}

function DatetimeLineDemo() {
  const ref = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      if (!ref.current) return
      ref.current.push({
        time: new Date(),
        value: Math.sin(Date.now() * 0.001) * 50 + 100 + (Math.random() - 0.5) * 20,
      })
    }, 50)
    return () => clearInterval(id)
  }, [])

  const formatTime = (ms) => {
    const d = new Date(ms)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
  }

  return (
    <RealtimeLineChart
      ref={ref}
      stroke="#6f42c1"
      strokeWidth={2}
      windowSize={200}
      size={[700, 300]}
      tickFormatTime={formatTime}
      tickFormatValue={(v) => v.toFixed(1)}
      enableHover
    />
  )
}

export default function RealtimeChartsHOC() {
  return (
    <div>
      <h1>Realtime Chart Components</h1>

      <MarkdownText
        text={`
Higher-order realtime chart components provide simplified APIs for common streaming chart types based on \`RealtimeFrame\`. These components handle the complexity of RealtimeFrame configuration while providing intuitive prop names — no need to assemble \`lineStyle\`, \`barStyle\`, or \`waterfallStyle\` objects yourself.

## Benefits

- **Flat Props**: Use \`stroke\`, \`fill\`, \`radius\` instead of nested style objects
- **Smart Defaults**: Pre-configured sizing, window modes, and styling
- **Same Imperative API**: \`push()\`, \`pushMany()\`, \`clear()\`, \`getData()\` via ref
- **Full TypeScript Support**: Dedicated prop interfaces for each chart type
- **Passthrough**: All RealtimeFrame capabilities remain accessible

All four components share the same base props (\`size\`, \`margin\`, \`arrowOfTime\`, \`windowMode\`, \`windowSize\`, \`data\`, \`timeAccessor\`, \`valueAccessor\`, \`enableHover\`, etc.) and differ only in their chart-specific styling props.

---
`}
      />

      <ExampleContainer
        title="RealtimeLineChart"
        code={`import { RealtimeLineChart } from "semiotic"

const ref = useRef()

useEffect(() => {
  const id = setInterval(() => {
    ref.current?.push({ time: Date.now(), value: Math.random() * 100 })
  }, 50)
  return () => clearInterval(id)
}, [])

<RealtimeLineChart
  ref={ref}
  stroke="#007bff"
  strokeWidth={2}
  windowSize={200}
  size={[700, 300]}
  enableHover
/>`}
      >
        <LineChartDemo />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`stroke\`: Line color (default: \`"#007bff"\`)
- \`strokeWidth\`: Line width (default: \`2\`)
- \`strokeDasharray\`: Dash pattern (e.g. \`"4,2"\`)
- \`enableHover\`: Enable tooltip + crosshair
- \`tooltipContent\`: Custom tooltip renderer
- \`onHover\`: Hover callback

**Equivalent RealtimeFrame:**
\`\`\`jsx
<RealtimeFrame chartType="line" lineStyle={{ stroke: "#007bff", strokeWidth: 2 }} ... />
\`\`\`

---
`}
      />

      <ExampleContainer
        title="Dark Theme Sparkline"
        code={`<RealtimeLineChart
  ref={ref}
  stroke="#50fa7b"
  strokeWidth={1.5}
  windowSize={100}
  size={[700, 250]}
  showAxes={false}
  background="#1e1e2e"
  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
/>`}
      >
        <DarkLineChartDemo />
      </ExampleContainer>

      <MarkdownText text={`---`} />

      <ExampleContainer
        title="RealtimeBarChart"
        code={`import { RealtimeBarChart } from "semiotic"

<RealtimeBarChart
  ref={ref}
  binSize={20}
  fill="#007bff"
  windowSize={300}
  size={[700, 300]}
  enableHover
/>`}
      >
        <BarChartDemo />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`binSize\` (required): Time interval for binning
- \`fill\`: Bar fill color (non-stacked mode)
- \`stroke\`, \`strokeWidth\`: Bar border
- \`gap\`: Gap between bars (pixels)
- \`categoryAccessor\`: Field for stacked bars
- \`colors\`: Category-to-color map (keys set stack order)
- \`enableHover\`: Enable tooltip + highlight

Edge bins that only partially fall within the visible time window render at proportionally narrower widths — e.g., if only 25% of a bin's time range is visible, it renders at 25% of the normal bar width.

**Equivalent RealtimeFrame:**
\`\`\`jsx
<RealtimeFrame
  chartType="bar"
  binSize={20}
  barStyle={{ fill: "#007bff" }}
  ...
/>
\`\`\`

---
`}
      />

      <ExampleContainer
        title="Stacked RealtimeBarChart"
        code={`import { RealtimeBarChart } from "semiotic"

<RealtimeBarChart
  ref={ref}
  binSize={25}
  windowSize={400}
  size={[700, 300]}
  categoryAccessor="category"
  colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
  enableHover
/>`}
      >
        <StackedBarChartDemo />
      </ExampleContainer>

      <MarkdownText text={`---`} />

      <ExampleContainer
        title="RealtimeSwarmChart"
        code={`import { RealtimeSwarmChart } from "semiotic"

<RealtimeSwarmChart
  ref={ref}
  windowSize={400}
  size={[700, 300]}
  categoryAccessor="category"
  colors={{ sensor1: "#007bff", sensor2: "#28a745", sensor3: "#dc3545" }}
  radius={3}
  opacity={0.7}
/>`}
      >
        <SwarmChartDemo />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`radius\`: Dot radius (default: \`3\`)
- \`fill\`: Dot color (when no \`categoryAccessor\`)
- \`opacity\`: Dot opacity (default: \`0.7\`)
- \`stroke\`, \`strokeWidth\`: Dot border
- \`categoryAccessor\`: Field for color-coding dots
- \`colors\`: Category-to-color map

Supports threshold coloring via \`annotations\` — dots crossing a value boundary are recolored automatically.

**Equivalent RealtimeFrame:**
\`\`\`jsx
<RealtimeFrame
  chartType="swarm"
  swarmStyle={{ radius: 3, opacity: 0.7 }}
  barColors={{ sensor1: "#007bff", ... }}
  categoryAccessor="category"
  ...
/>
\`\`\`

---
`}
      />

      <ExampleContainer
        title="RealtimeWaterfallChart"
        code={`import { RealtimeWaterfallChart } from "semiotic"

<RealtimeWaterfallChart
  ref={ref}
  windowSize={300}
  size={[700, 300]}
  positiveColor="#28a745"
  negativeColor="#dc3545"
  connectorStroke="#999"
  connectorWidth={1}
  gap={1}
/>`}
      >
        <WaterfallDemo />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`positiveColor\`: Color for gain bars (default: \`"#28a745"\`)
- \`negativeColor\`: Color for loss bars (default: \`"#dc3545"\`)
- \`connectorStroke\`: Connector line color (omit to hide)
- \`connectorWidth\`: Connector line width
- \`gap\`: Gap between bars (pixels)
- \`stroke\`, \`strokeWidth\`: Bar border

**Equivalent RealtimeFrame:**
\`\`\`jsx
<RealtimeFrame
  chartType="waterfall"
  waterfallStyle={{
    positiveColor: "#28a745",
    negativeColor: "#dc3545",
    connectorStroke: "#999",
    connectorWidth: 1,
    gap: 1
  }}
  ...
/>
\`\`\`

---
`}
      />

      <ExampleContainer
        title="Date/Time Values"
        code={`import { RealtimeLineChart } from "semiotic"

const formatTime = (ms) => {
  const d = new Date(ms)
  return \`\${String(d.getHours()).padStart(2, "0")}:\${String(d.getMinutes()).padStart(2, "0")}:\${String(d.getSeconds()).padStart(2, "0")}\`
}

<RealtimeLineChart
  ref={ref}
  stroke="#6f42c1"
  strokeWidth={2}
  windowSize={200}
  size={[700, 300]}
  tickFormatTime={formatTime}
  tickFormatValue={(v) => v.toFixed(1)}
  enableHover
/>`}
      >
        <DatetimeLineDemo />
      </ExampleContainer>

      <MarkdownText
        text={`
## Shared Props

All realtime chart components accept these common props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`size\` | \`[number, number]\` | \`[500, 300]\` | Chart dimensions |
| \`margin\` | \`object\` | auto | Chart margins |
| \`arrowOfTime\` | \`"right" \\| "left" \\| "up" \\| "down"\` | \`"right"\` | Direction time flows |
| \`windowMode\` | \`"sliding" \\| "growing"\` | \`"sliding"\` | Data retention strategy |
| \`windowSize\` | \`number\` | \`200\` | Ring buffer capacity |
| \`data\` | \`object[]\` | — | Controlled data array |
| \`timeAccessor\` | \`string \\| function\` | \`"time"\` | Time value accessor |
| \`valueAccessor\` | \`string \\| function\` | \`"value"\` | Value accessor |
| \`timeExtent\` | \`[number, number]\` | — | Fixed time domain |
| \`valueExtent\` | \`[number, number]\` | — | Fixed value domain |
| \`showAxes\` | \`boolean\` | \`true\` | Show canvas-drawn axes |
| \`background\` | \`string\` | — | Background fill color |
| \`enableHover\` | \`boolean \\| object\` | — | Enable hover + tooltip |
| \`tooltipContent\` | \`function\` | — | Custom tooltip renderer |
| \`onHover\` | \`function\` | — | Hover callback |
| \`annotations\` | \`array\` | — | Annotation objects |
| \`tickFormatTime\` | \`function\` | — | Time axis tick formatter |
| \`tickFormatValue\` | \`function\` | — | Value axis tick formatter |

### Imperative API (via ref)

| Method | Description |
|--------|-------------|
| \`push(point)\` | Add a single data point |
| \`pushMany(points)\` | Add multiple data points |
| \`clear()\` | Clear all data |
| \`getData()\` | Get current data as array |

## When to Use HOC vs RealtimeFrame

Use **HOC components** when you want:
- Flat, intuitive props for a single chart type
- Quick setup with sensible defaults
- Cleaner JSX without nested style objects

Use **RealtimeFrame directly** when you need:
- Dynamic chart type switching at runtime
- Custom renderers
- Access to internal renderer options not exposed by HOCs
- Multiple chart types in the same component

## Next Steps

- [RealtimeFrame →](/guides/realtime-frame) for the full low-level API
- [XY Chart Components →](/guides/xy-charts-hoc) for static XY charts
- [Ordinal Chart Components →](/guides/ordinal-charts-hoc) for categorical data
`}
      />
    </div>
  )
}
