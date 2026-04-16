import React, { useState } from "react"
import { BarChart, StackedBarChart, PieChart, DonutChart, LineChart, Scatterplot, ForceDirectedGraph, SankeyDiagram, Treemap } from "semiotic"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ---------------------------------------------------------------------------
// Shared controls
// ---------------------------------------------------------------------------

function AnimateControls({ config, onChange }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
      padding: "12px 16px", borderRadius: 8, marginBottom: 16,
      background: "var(--semiotic-bg, #f8f9fa)", border: "1px solid var(--semiotic-border, #e2e4e8)",
    }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        <input
          type="checkbox" checked={config.intro}
          onChange={e => onChange({ ...config, intro: e.target.checked })}
        />
        Intro animation
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        Duration
        <input
          type="range" min={100} max={1500} step={50} value={config.duration}
          onChange={e => onChange({ ...config, duration: Number(e.target.value) })}
          style={{ width: 100 }}
        />
        <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 40 }}>{config.duration}ms</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        Easing
        <select
          value={config.easing}
          onChange={e => onChange({ ...config, easing: e.target.value })}
          style={{ fontSize: 13 }}
        >
          <option value="ease-out">ease-out</option>
          <option value="linear">linear</option>
        </select>
      </label>
    </div>
  )
}

function SwapButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginBottom: 12, padding: "6px 16px", borderRadius: 4,
        border: "1px solid var(--semiotic-border, #ccc)",
        background: "var(--semiotic-bg, #fff)",
        color: "var(--semiotic-text, #333)", cursor: "pointer", fontSize: 13,
      }}
    >
      {label}
    </button>
  )
}

function ResetButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginBottom: 12, marginLeft: 8, padding: "6px 16px", borderRadius: 4,
        border: "1px solid var(--semiotic-border, #ccc)",
        background: "var(--semiotic-bg, #fff)",
        color: "var(--semiotic-text-secondary, #888)", cursor: "pointer", fontSize: 13,
      }}
    >
      Replay intro
    </button>
  )
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const barA = [
  { category: "Electronics", value: 12400 },
  { category: "Clothing", value: 8700 },
  { category: "Grocery", value: 15300 },
  { category: "Furniture", value: 6200 },
  { category: "Toys", value: 4100 },
  { category: "Books", value: 3800 },
]

const barB = [
  { category: "Electronics", value: 9200 },
  { category: "Clothing", value: 14500 },
  { category: "Grocery", value: 7800 },
  { category: "Furniture", value: 11600 },
  { category: "Toys", value: 8900 },
  { category: "Books", value: 12100 },
]

const stackedA = [
  { category: "Q1", product: "Widgets", value: 12000 },
  { category: "Q1", product: "Gadgets", value: 8000 },
  { category: "Q2", product: "Widgets", value: 15000 },
  { category: "Q2", product: "Gadgets", value: 11000 },
  { category: "Q3", product: "Widgets", value: 18000 },
  { category: "Q3", product: "Gadgets", value: 9000 },
]

const stackedB = [
  { category: "Q1", product: "Widgets", value: 8000 },
  { category: "Q1", product: "Gadgets", value: 14000 },
  { category: "Q2", product: "Widgets", value: 10000 },
  { category: "Q2", product: "Gadgets", value: 16000 },
  { category: "Q3", product: "Widgets", value: 7000 },
  { category: "Q3", product: "Gadgets", value: 18000 },
]

const pieA = [
  { category: "Chrome", value: 65 },
  { category: "Safari", value: 18 },
  { category: "Firefox", value: 10 },
  { category: "Edge", value: 7 },
]

const pieB = [
  { category: "Chrome", value: 50 },
  { category: "Safari", value: 25 },
  { category: "Firefox", value: 15 },
  { category: "Edge", value: 10 },
]

const pieC = [
  { category: "Chrome", value: 45 },
  { category: "Safari", value: 20 },
  { category: "Firefox", value: 12 },
  { category: "Edge", value: 8 },
  { category: "Opera", value: 15 },
]

const lineA = [
  { month: 1, revenue: 12 }, { month: 2, revenue: 18 },
  { month: 3, revenue: 14 }, { month: 4, revenue: 22 },
  { month: 5, revenue: 19 }, { month: 6, revenue: 27 },
]

const lineB = [
  { month: 1, revenue: 20 }, { month: 2, revenue: 11 },
  { month: 3, revenue: 25 }, { month: 4, revenue: 15 },
  { month: 5, revenue: 30 }, { month: 6, revenue: 18 },
]

const scatterA = Array.from({ length: 20 }, (_, i) => ({
  x: 10 + Math.cos(i * 0.5) * 30 + i * 3,
  y: 20 + Math.sin(i * 0.5) * 25 + i * 2,
}))

const scatterB = Array.from({ length: 20 }, (_, i) => ({
  x: 80 - Math.cos(i * 0.5) * 30 - i * 2,
  y: 60 - Math.sin(i * 0.5) * 25 + i * 1.5,
}))

const graphNodes = [
  { id: "Alice" }, { id: "Bob" }, { id: "Carol" }, { id: "Dave" }, { id: "Eve" },
]

const graphEdgesA = [
  { source: "Alice", target: "Bob" },
  { source: "Alice", target: "Carol" },
  { source: "Bob", target: "Dave" },
  { source: "Carol", target: "Dave" },
  { source: "Dave", target: "Eve" },
  { source: "Eve", target: "Alice" },
]

const graphEdgesB = [
  { source: "Alice", target: "Dave" },
  { source: "Bob", target: "Carol" },
  { source: "Bob", target: "Eve" },
  { source: "Carol", target: "Eve" },
  { source: "Dave", target: "Bob" },
  { source: "Eve", target: "Alice" },
]

const sankeyEdgesA = [
  { source: "Budget", target: "Engineering", value: 45 },
  { source: "Budget", target: "Marketing", value: 28 },
  { source: "Budget", target: "Sales", value: 32 },
  { source: "Engineering", target: "Product", value: 30 },
  { source: "Engineering", target: "Infra", value: 15 },
  { source: "Marketing", target: "Product", value: 18 },
  { source: "Sales", target: "Product", value: 22 },
]

const sankeyEdgesB = [
  { source: "Budget", target: "Engineering", value: 55 },
  { source: "Budget", target: "Marketing", value: 15 },
  { source: "Budget", target: "Sales", value: 35 },
  { source: "Engineering", target: "Product", value: 40 },
  { source: "Engineering", target: "Infra", value: 15 },
  { source: "Marketing", target: "Product", value: 10 },
  { source: "Sales", target: "Product", value: 25 },
]

const treemapA = {
  id: "root",
  children: [
    { id: "Engineering", value: 45 },
    { id: "Marketing", value: 28 },
    { id: "Sales", value: 32 },
    { id: "Operations", value: 18 },
    { id: "HR", value: 12 },
  ],
}

const treemapB = {
  id: "root",
  children: [
    { id: "Engineering", value: 55 },
    { id: "Marketing", value: 15 },
    { id: "Sales", value: 40 },
    { id: "Operations", value: 25 },
    { id: "HR", value: 8 },
  ],
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, id, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h3 id={id} style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart wrappers with key-based remount for intro replay
// ---------------------------------------------------------------------------

function AnimatedBarChart({ animConfig }) {
  const [useB, setUseB] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <Section title="Bar Chart" id="bar">
      <p>Bars grow from the baseline on intro and interpolate height on data change.</p>
      <SwapButton onClick={() => setUseB(v => !v)} label={`Swap data ${useB ? "\u2190 A" : "\u2192 B"}`} />
      <ResetButton onClick={() => { setKey(k => k + 1); setUseB(false) }} />
      <BarChart
        key={key}
        data={useB ? barB : barA}
        categoryAccessor="category"
        valueAccessor="value"
        animate={animConfig}
        width={500}
        height={300}
      />
    </Section>
  )
}

function AnimatedStackedBarChart({ animConfig }) {
  const [useB, setUseB] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <Section title="Stacked Bar Chart" id="stacked-bar">
      <p>Stacked segments grow from baseline on intro. Only the topmost segment is rounded when <code>roundedTop</code> is set.</p>
      <SwapButton onClick={() => setUseB(v => !v)} label={`Swap data ${useB ? "\u2190 A" : "\u2192 B"}`} />
      <ResetButton onClick={() => { setKey(k => k + 1); setUseB(false) }} />
      <StackedBarChart
        key={key}
        data={useB ? stackedB : stackedA}
        categoryAccessor="category"
        stackBy="product"
        valueAccessor="value"
        animate={animConfig}
        roundedTop={5}
        width={500}
        height={300}
      />
    </Section>
  )
}

function AnimatedPieChart({ animConfig }) {
  const [dataIdx, setDataIdx] = useState(0)
  const [key, setKey] = useState(0)
  const datasets = [pieA, pieB, pieC]
  const labels = ["4 slices (A)", "4 slices (B)", "5 slices (C)"]
  return (
    <Section title="Pie / Donut Chart" id="pie">
      <p>
        Wedge angles interpolate smoothly on data change. New slices sweep open from
        zero; removed slices collapse and fade. Try swapping to dataset C to see a
        new slice enter.
      </p>
      <SwapButton
        onClick={() => setDataIdx(i => (i + 1) % 3)}
        label={`Next dataset \u2192 ${labels[(dataIdx + 1) % 3]}`}
      />
      <ResetButton onClick={() => { setKey(k => k + 1); setDataIdx(0) }} />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #888)", marginBottom: 4 }}>PieChart</div>
          <PieChart
            key={`pie-${key}`}
            data={datasets[dataIdx]}
            categoryAccessor="category"
            valueAccessor="value"
            colorBy="category"
            cornerRadius={4}
            animate={animConfig}
            width={280}
            height={280}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #888)", marginBottom: 4 }}>DonutChart</div>
          <DonutChart
            key={`donut-${key}`}
            data={datasets[dataIdx]}
            categoryAccessor="category"
            valueAccessor="value"
            colorBy="category"
            cornerRadius={4}
            innerRadius={50}
            animate={animConfig}
            width={280}
            height={280}
          />
        </div>
      </div>
    </Section>
  )
}

function AnimatedLineChart({ animConfig }) {
  const [useB, setUseB] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <Section title="Line Chart" id="line">
      <p>Lines draw from left to right on intro and interpolate vertex positions on data change.</p>
      <SwapButton onClick={() => setUseB(v => !v)} label={`Swap data ${useB ? "\u2190 A" : "\u2192 B"}`} />
      <ResetButton onClick={() => { setKey(k => k + 1); setUseB(false) }} />
      <LineChart
        key={key}
        data={useB ? lineB : lineA}
        xAccessor="month"
        yAccessor="revenue"
        animate={animConfig}
        showPoints
        curve="monotoneX"
        width={500}
        height={250}
        xLabel="Month"
        yLabel="Revenue"
      />
    </Section>
  )
}

function AnimatedScatterplot({ animConfig }) {
  const [useB, setUseB] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <Section title="Scatterplot" id="scatter">
      <p>Points scale up from r=0 on intro and move to new positions on data change.</p>
      <SwapButton onClick={() => setUseB(v => !v)} label={`Swap data ${useB ? "\u2190 A" : "\u2192 B"}`} />
      <ResetButton onClick={() => { setKey(k => k + 1); setUseB(false) }} />
      <Scatterplot
        key={key}
        data={useB ? scatterB : scatterA}
        xAccessor="x"
        yAccessor="y"
        animate={animConfig}
        pointRadius={5}
        pointOpacity={0.7}
        width={500}
        height={300}
      />
    </Section>
  )
}

function AnimatedForceGraph({ animConfig }) {
  const [useB, setUseB] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <Section title="Force-Directed Graph" id="force">
      <p>
        Force layouts use the simulation as their natural animation.
        Swap edges to see the graph re-settle into a new arrangement.
      </p>
      <SwapButton onClick={() => setUseB(v => !v)} label={`Swap edges ${useB ? "\u2190 A" : "\u2192 B"}`} />
      <ResetButton onClick={() => { setKey(k => k + 1); setUseB(false) }} />
      <ForceDirectedGraph
        key={key}
        nodes={graphNodes}
        edges={useB ? graphEdgesB : graphEdgesA}
        nodeIDAccessor="id"
        sourceAccessor="source"
        targetAccessor="target"
        animate={animConfig}
        showLabels
        width={500}
        height={300}
      />
    </Section>
  )
}

function AnimatedSankey({ animConfig }) {
  const [useB, setUseB] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <Section title="Sankey Diagram" id="sankey">
      <p>Nodes expand from the chart center on intro. Edge widths and node positions transition smoothly on data change.</p>
      <SwapButton onClick={() => setUseB(v => !v)} label={`Swap data ${useB ? "\u2190 A" : "\u2192 B"}`} />
      <ResetButton onClick={() => { setKey(k => k + 1); setUseB(false) }} />
      <SankeyDiagram
        key={key}
        edges={useB ? sankeyEdgesB : sankeyEdgesA}
        valueAccessor="value"
        sourceAccessor="source"
        targetAccessor="target"
        animate={animConfig}
        showLabels
        width={500}
        height={300}
      />
    </Section>
  )
}

function AnimatedTreemap({ animConfig }) {
  const [useB, setUseB] = useState(false)
  const [key, setKey] = useState(0)
  return (
    <Section title="Treemap" id="treemap">
      <p>Cells expand from the center on intro and resize smoothly when values change.</p>
      <SwapButton onClick={() => setUseB(v => !v)} label={`Swap data ${useB ? "\u2190 A" : "\u2192 B"}`} />
      <ResetButton onClick={() => { setKey(k => k + 1); setUseB(false) }} />
      <Treemap
        key={key}
        data={useB ? treemapB : treemapA}
        valueAccessor="value"
        colorBy="id"
        showLabels
        animate={animConfig}
        width={500}
        height={300}
      />
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnimationPlayground() {
  const [config, setConfig] = useState({
    intro: true,
    duration: 500,
    easing: "ease-out",
  })

  const animConfig = {
    duration: config.duration,
    easing: config.easing,
    intro: config.intro,
  }

  return (
    <PageLayout
      title="Animation Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Animation", path: "/playground/animation" },
      ]}
      prevPage={{ title: "Playground", path: "/playground" }}
      nextPage={{ title: "Line Chart Playground", path: "/playground/line-chart" }}
    >
      <p>
        Explore Semiotic's declarative <code>animate</code> prop across chart types.
        All charts share the controls below. Click <strong>Swap data</strong> to
        trigger a data-change transition or <strong>Replay intro</strong> to
        remount and watch the chart draw itself.
      </p>

      <AnimateControls config={config} onChange={setConfig} />

      <CodeBlock code={`// Shared animation config
<BarChart
  data={data}
  categoryAccessor="category"
  valueAccessor="value"
  animate={${JSON.stringify(animConfig, null, 2).replace(/\n/g, "\n  ")}}
/>`} />

      <h2 id="charts">Charts</h2>

      <h3 id="ordinal">Ordinal Charts</h3>
      <AnimatedBarChart animConfig={animConfig} />
      <AnimatedStackedBarChart animConfig={animConfig} />
      <AnimatedPieChart animConfig={animConfig} />

      <h3 id="xy">XY Charts</h3>
      <AnimatedLineChart animConfig={animConfig} />
      <AnimatedScatterplot animConfig={animConfig} />

      <h3 id="network">Network Charts</h3>
      <AnimatedForceGraph animConfig={animConfig} />
      <AnimatedSankey animConfig={animConfig} />
      <AnimatedTreemap animConfig={animConfig} />

      <h2 id="how-it-works">How It Works</h2>

      <h3>Intro Animation</h3>
      <p>
        When <code>animate</code> is enabled (intro defaults to <code>true</code>),
        the first render synthesizes a "zero state" and transitions to the computed
        positions:
      </p>
      <ul>
        <li><strong>Bars</strong> grow from the baseline (height 0)</li>
        <li><strong>Pie/Donut wedges</strong> sweep from a collapsed arc</li>
        <li><strong>Lines/Areas</strong> draw from left to right (canvas clip reveal)</li>
        <li><strong>Points</strong> scale up from radius 0</li>
      </ul>
      <p>
        Disable intro with <code>{`animate={{ intro: false }}`}</code> to only
        animate data changes.
      </p>

      <h3>Data-Change Transitions</h3>
      <p>
        When data changes, the scene graph diffs by identity (category for ordinal,
        x/y for XY) and interpolates positions, dimensions, and angles from old to
        new values. Entering elements fade in; exiting elements fade out.
      </p>

      <h3>Configuration</h3>
      <CodeBlock code={`// Boolean — 300ms ease-out, intro enabled
<BarChart animate />

// Custom duration and easing
<BarChart animate={{ duration: 800, easing: "linear" }} />

// Data-change only, no intro
<BarChart animate={{ intro: false }} />

// Disable animation entirely
<BarChart animate={false} />`} />
    </PageLayout>
  )
}
