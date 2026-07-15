import React, { useState, useEffect, useMemo } from "react"
import { BarChart, StackedBarChart, LineChart, Scatterplot, ForceDirectedGraph } from "semiotic"
import { ChoroplethMap, resolveReferenceGeography } from "semiotic/geo"

import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

// Simple bars whose values cross the 10 and 15 thresholds — for the
// "last-applicable-rule-wins" demo.
const bandData = [
  { region: "Alpha", value: 6 },
  { region: "Bravo", value: 9 },
  { region: "Charlie", value: 12 },
  { region: "Delta", value: 14 },
  { region: "Echo", value: 17 },
  { region: "Foxtrot", value: 11 },
]

// eCKU-style capacity usage: a constant "Fast scaling" base (10) plus a
// variable "Fixed-rate" burst that stacks on top. The fixed-rate burst is
// split at the Max line (15) so a rule can hatch only the portion ABOVE max
// in red — a stacked-bar rule styles a whole segment, so "the part over the
// ceiling" has to be its own segment.
const MAX = 15
const BASE = 10
const usageData = (() => {
  const bursts = [2, 0, 4, 3, 0, 5, 3, 4, 6, 3, 2, 6, 4, 5, 3, 7, 5, 6, 4, 8, 5, 7, 8, 5]
  const rows = []
  bursts.forEach((b, i) => {
    const t = `12:${String(i).padStart(2, "0")}`
    rows.push({ t, tier: "Fast scaling", value: BASE })
    // Fixed-rate up to the Max line, then the overage split off on top.
    const withinLimit = Math.min(b, MAX - BASE)
    const overMax = Math.max(0, BASE + b - MAX)
    rows.push({ t, tier: "Fixed-rate", value: withinLimit })
    if (overMax > 0) rows.push({ t, tier: "Over max", value: overMax })
  })
  return rows
})()

const capacityScheme = { "Fast scaling": "#3fa34d", "Fixed-rate": "#f0b429", "Over max": "#d7263d" }

// Threshold line + box-label demo data
const latencyData = Array.from({ length: 40 }, (_, i) => ({
  t: i,
  ms: 120 + Math.sin(i * 0.4) * 40 + (i > 26 ? (i - 26) * 12 : 0),
}))

// ---------------------------------------------------------------------------
// Interactive playground — controls that mutate a styleRules array so you can
// experiment across families and confirm nothing breaks.
// ---------------------------------------------------------------------------

const RULE_COLORS = [
  { label: "Danger", value: "#d7263d" },
  { label: "Warning", value: "#e0a92a" },
  { label: "Info", value: "#4589ff" },
  { label: "Success", value: "#3fa34d" },
]
const OPERATORS = [
  { label: "≥ (gte)", value: "gte" },
  { label: "> (gt)", value: "gt" },
  { label: "≤ (lte)", value: "lte" },
  { label: "< (lt)", value: "lt" },
]

/** hex → rgba string, for a light hatch background tint of the rule color. */
function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Deterministic 0–100 value per key (so the geo map is stable across renders). */
function seededValue(key) {
  let hash = 0
  const s = String(key)
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return hash % 101
}

/** Build a styleRules array from control state. `field` targets a datum field
 *  (network); omit it for charts whose `ctx.value` is the resolved value (geo). */
function buildPlaygroundRules(state, field) {
  const styleFor = (color, fillMode) =>
    fillMode === "hatch"
      ? { fill: { type: "hatch", background: hexToRgba(color, 0.18), stroke: color, spacing: 6 } }
      : { fill: color }
  const cond = (op, val) => (field ? { field, [op]: val } : { [op]: val })
  const rules = [{ when: cond(state.op, state.threshold), style: styleFor(state.color, state.fillMode) }]
  if (state.second) {
    rules.push({ when: cond(state.op, state.threshold2), style: styleFor(state.color2, state.fillMode2) })
  }
  return rules
}

const DEFAULT_RULE_STATE = {
  op: "gte",
  threshold: 6,
  fillMode: "hatch",
  color: "#d7263d",
  second: false,
  threshold2: 8,
  color2: "#e0a92a",
  fillMode2: "solid",
}

const ctrlRow = { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 10 }
const ctrlLabel = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary, #667)" }
const ctrlField = { fontSize: 13, padding: "4px 6px" }

function StyleRuleControls({ state, setState, min, max, valueLabel }) {
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  return (
    <div
      style={{
        background: "var(--surface-1, rgba(127,127,127,0.06))",
        border: "1px solid var(--semiotic-border, #ddd)",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div style={ctrlRow}>
        <label style={ctrlLabel}>
          Match where {valueLabel}
          <select style={ctrlField} value={state.op} onChange={(e) => set({ op: e.target.value })}>
            {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={ctrlLabel}>
          Threshold: <strong>{state.threshold}</strong>
          <input type="range" min={min} max={max} value={state.threshold} onChange={(e) => set({ threshold: +e.target.value })} />
        </label>
        <label style={ctrlLabel}>
          Fill
          <select style={ctrlField} value={state.fillMode} onChange={(e) => set({ fillMode: e.target.value })}>
            <option value="hatch">hatch</option>
            <option value="solid">solid</option>
          </select>
        </label>
        <label style={ctrlLabel}>
          Color
          <select style={ctrlField} value={state.color} onChange={(e) => set({ color: e.target.value })}>
            {RULE_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label style={{ ...ctrlLabel, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end" }}>
          <input type="checkbox" checked={state.second} onChange={(e) => set({ second: e.target.checked })} />
          Layer a 2nd rule
        </label>
      </div>
      {state.second && (
        <div style={{ ...ctrlRow, marginBottom: 0, paddingTop: 8, borderTop: "1px dashed var(--semiotic-border, #ddd)" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary, #667)" }}>2nd rule (same operator — later rule wins on overlap):</span>
          <label style={ctrlLabel}>
            Threshold: <strong>{state.threshold2}</strong>
            <input type="range" min={min} max={max} value={state.threshold2} onChange={(e) => set({ threshold2: +e.target.value })} />
          </label>
          <label style={ctrlLabel}>
            Fill
            <select style={ctrlField} value={state.fillMode2} onChange={(e) => set({ fillMode2: e.target.value })}>
              <option value="hatch">hatch</option>
              <option value="solid">solid</option>
            </select>
          </label>
          <label style={ctrlLabel}>
            Color
            <select style={ctrlField} value={state.color2} onChange={(e) => set({ color2: e.target.value })}>
              {RULE_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}

function RulePreview({ rules }) {
  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-secondary, #667)" }}>
        Live <code>styleRules</code> config
      </summary>
      <pre style={{ fontSize: 12, overflowX: "auto", background: "var(--surface-1, rgba(127,127,127,0.06))", padding: 10, borderRadius: 6, marginTop: 6 }}>
        {JSON.stringify(rules, null, 2)}
      </pre>
    </details>
  )
}

// Network demo data — a small graph with a numeric `weight` + categorical `kind`.
const NETWORK_NODES = [
  { id: "api", kind: "service", weight: 8 },
  { id: "auth", kind: "service", weight: 5 },
  { id: "cache", kind: "cache", weight: 3 },
  { id: "queue", kind: "queue", weight: 4 },
  { id: "db-users", kind: "database", weight: 9 },
  { id: "db-orders", kind: "database", weight: 7 },
  { id: "worker-1", kind: "worker", weight: 2 },
  { id: "worker-2", kind: "worker", weight: 6 },
  { id: "gateway", kind: "service", weight: 10 },
  { id: "search", kind: "service", weight: 4 },
]
const NETWORK_EDGES = [
  { source: "gateway", target: "api" }, { source: "api", target: "auth" },
  { source: "api", target: "cache" }, { source: "api", target: "db-users" },
  { source: "api", target: "queue" }, { source: "queue", target: "worker-1" },
  { source: "queue", target: "worker-2" }, { source: "worker-1", target: "db-orders" },
  { source: "worker-2", target: "db-orders" }, { source: "api", target: "search" },
  { source: "search", target: "cache" }, { source: "auth", target: "db-users" },
]

function NetworkStyleRulesDemo() {
  const [state, setState] = useState({ ...DEFAULT_RULE_STATE, threshold: 6, threshold2: 9 })
  const rules = useMemo(() => buildPlaygroundRules(state, "weight"), [state])
  return (
    <div>
      <StyleRuleControls state={state} setState={setState} min={0} max={10} valueLabel="node weight is" />
      <div style={{ border: "1px solid var(--semiotic-border, #ddd)", borderRadius: 8, overflow: "hidden" }}>
        <ForceDirectedGraph
          nodes={NETWORK_NODES}
          edges={NETWORK_EDGES}
          nodeIDAccessor="id"
          colorBy="kind"
          nodeSize="weight"
          nodeSizeRange={[8, 26]}
          showLabels
          nodeLabel="id"
          styleRules={rules}
          width={680}
          height={380}
        />
      </div>
      <RulePreview rules={rules} />
    </div>
  )
}

function GeoStyleRulesDemo() {
  const [areas, setAreas] = useState(null)
  useEffect(() => {
    let alive = true
    resolveReferenceGeography("world-110m")
      .then((features) => {
        if (!alive) return
        // Assign a deterministic 0–100 value to each country so the map is stable.
        const enriched = features.map((f) => ({
          ...f,
          properties: { ...f.properties, value: seededValue(f.id ?? f.properties?.name ?? "") },
        }))
        setAreas(enriched)
      })
      .catch((err) => console.error("Failed to load world map:", err))
    return () => { alive = false }
  }, [])
  const [state, setState] = useState({ ...DEFAULT_RULE_STATE, threshold: 70, threshold2: 88 })
  const rules = useMemo(() => buildPlaygroundRules(state, undefined), [state])
  if (!areas) {
    return (
      <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary, #667)", border: "1px solid var(--semiotic-border, #ddd)", borderRadius: 8 }}>
        Loading world map…
      </div>
    )
  }
  return (
    <div>
      <StyleRuleControls state={state} setState={setState} min={0} max={100} valueLabel="feature value is" />
      <div style={{ border: "1px solid var(--semiotic-border, #ddd)", borderRadius: 8, overflow: "hidden" }}>
        <ChoroplethMap
          areas={areas}
          valueAccessor="value"
          colorScheme="blues"
          projection="equalEarth"
          styleRules={rules}
          tooltip
          width={680}
          height={400}
        />
      </div>
      <RulePreview rules={rules} />
    </div>
  )
}

export default function StyleRulesPage() {
  return (
    <PageLayout
      title="Style Rules, Hatch Fills & Label Backgrounds"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Style Rules & Labels", path: "/features/style-rules" },
      ]}
      prevPage={{ title: "Legends", path: "/features/legends" }}
      nextPage={null}
    >
      <p>
        Three composable capabilities for turning a plain chart into a
        decision-ready one: <strong>threshold-based style rules</strong> that
        recolor or re-texture marks by value, <strong>declarative hatch
        fills</strong> that read identically on canvas and in exported SVG, and
        <strong> annotation label backgrounds</strong> (a stroke halo or a
        semitransparent box) that keep reference-line labels legible over dense
        marks. They were built to reproduce dashboards like the capacity chart
        below — but each works on its own.
      </p>

      <h2 id="flagship">Putting it together: a capacity chart</h2>
      <p>
        A stacked bar with a solid <em>Fast scaling</em> base and a
        yellow-hatched <em>Fixed-rate</em> burst on top. Wherever a bar breaks
        the <code>Max · 15</code> ceiling, the portion above the line is split
        into its own segment and hatched <strong>red</strong> — the overage
        reads as a distinct, alarming texture. Plus two reference lines: the red{" "}
        <code>Max · 15</code> ceiling with the default halo label, and a green{" "}
        <code>Fast-scaling · 10</code> line whose label sits in a
        semitransparent box so it stays readable where it crosses the bars.
      </p>
      <LiveExample
        type={StackedBarChart}
        title="eCKU usage — hatch fill + over-max highlight + threshold lines"
        startHidden={false}
        frameProps={{
          data: usageData,
          categoryAccessor: "t",
          stackBy: "tier",
          valueAccessor: "value",
          colorScheme: capacityScheme,
          valueExtent: [0, 20],
          height: 360,
          barPadding: 24,
          showLegend: true,
          legendPosition: "bottom",
          styleRules: [
            {
              // Texture the Fixed-rate segment yellow — `ctx.category` is the stack key.
              when: (d, ctx) => ctx.category === "Fixed-rate",
              style: { fill: { type: "hatch", background: "#f7d774", stroke: "#e0a92a", spacing: 6 } },
            },
            {
              // The portion above Max · 15 is its own segment — hatch it red.
              when: (d, ctx) => ctx.category === "Over max",
              style: { fill: { type: "hatch", background: "#f8b4b4", stroke: "#d7263d", spacing: 6 } },
            },
          ],
          annotations: [
            { type: "y-threshold", value: 15, label: "Max · 15", color: "#d7263d", strokeDasharray: "6,4" },
            {
              type: "y-threshold",
              value: 10,
              label: "Fast-scaling · 10",
              color: "#2f7d32",
              strokeDasharray: "5,4",
              labelPosition: "left",
              labelBackground: { type: "box", fill: "var(--semiotic-bg)", opacity: 0.9 },
            },
          ],
        }}
        overrideProps={{ data: "usageData" }}
      />
      <p>
        A stacked-bar rule styles a whole <em>segment</em>, so "the part over
        the ceiling" has to be its own segment — the sample data splits each
        fixed-rate burst at 15 into a <code>Fixed-rate</code> piece (up to the
        line) and an <code>Over max</code> piece (above it), and two rules hatch
        them yellow and red respectively.
      </p>

      <h2 id="style-rules">Threshold style rules</h2>
      <p>
        <code>styleRules</code> on <code>BarChart</code>,{" "}
        <code>StackedBarChart</code>, and <code>GroupedBarChart</code> is an
        ordered list of <code>{"{ when, style }"}</code> pairs. Every rule whose{" "}
        <code>when</code> condition matches a bar contributes its{" "}
        <code>style</code>, and the styles are merged in list order — so for any
        single property, <strong>the last applicable rule wins</strong>. It is
        the CSS-cascade model: send as many rules as you like; the last one that
        applies to a property is the one you see. Bars that match no rule keep
        the chart's resolved base color.
      </p>
      <LiveExample
        type={BarChart}
        title="Bars recolored by value band — last applicable rule wins"
        startHidden={false}
        frameProps={{
          data: bandData,
          categoryAccessor: "region",
          valueAccessor: "value",
          height: 320,
          color: "#3fa34d",
          styleRules: [
            { when: { gte: 10 }, style: { fill: "#f0b429" } },
            { when: { gte: 15 }, style: { fill: "#d7263d" } },
          ],
        }}
        overrideProps={{ data: "bandData" }}
      />
      <p>
        A bar of value 12 matches the first rule (≥ 10) → amber. A bar of value
        17 matches both rules; the second (≥ 15) wins → red. Bars below 10 match
        nothing and keep the base <code>color</code>. Because merging is
        per-property, an early rule can set <code>stroke</code> and a later rule
        can override just the <code>fill</code> without touching the stroke.
      </p>

      <h3 id="when">The <code>when</code> condition</h3>
      <p>
        <code>when</code> accepts three forms. Omit it (or pass <code>true</code>)
        for an unconditional base layer; pass <code>false</code> to disable a
        rule without deleting it.
      </p>
      <table className="reference-table">
        <thead>
          <tr><th>Form</th><th>Example</th><th>Use for</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Declarative threshold</td>
            <td><code>{"{ gte: 10, lt: 15 }"}</code></td>
            <td>Numeric/categorical matching with no code. Compares the bar's value unless <code>field</code> is set.</td>
          </tr>
          <tr>
            <td>Predicate function</td>
            <td><code>{"(d, ctx) => ctx.category === 'burst'"}</code></td>
            <td>Full control. <code>ctx</code> is <code>{"{ value, category, index }"}</code>; <code>d</code> is the raw datum.</td>
          </tr>
          <tr>
            <td>Boolean</td>
            <td><code>true</code> / <code>false</code></td>
            <td>Always / never — an unconditional layer, or a toggled-off rule.</td>
          </tr>
        </tbody>
      </table>
      <p>Threshold operators (all present operators are AND-ed together):</p>
      <CodeBlock language="ts" code={`interface StyleRuleThreshold {
  field?: string          // datum field to read; defaults to the bar value
  gt?: number             // value > n
  gte?: number            // value >= n
  lt?: number             // value < n
  lte?: number            // value <= n
  eq?: number | string    // value === n   (categorical or numeric)
  ne?: number | string    // value !== n
  within?: [number, number]  // min <= value <= max
  outside?: [number, number] // value < min OR value > max
  in?: Array<number | string> // value is one of these
}`} />

      <h2 id="hatch">Declarative hatch fills</h2>
      <p>
        A rule's (or any <code>pieceStyle</code>'s) <code>fill</code> can be a
        <code> HatchFill</code> descriptor — a plain object that resolves to a{" "}
        <code>CanvasPattern</code> when drawn to canvas in the browser and to an
        SVG <code>{"<pattern>"}</code> when serialized on the server. One
        declaration, both backends, so a hatched bar looks the same live and in
        an exported PNG/SVG.
      </p>
      <CodeBlock language="ts" code={`interface HatchFill {
  type: "hatch"
  background?: string   // tile background (default "transparent")
  stroke?: string       // diagonal line color (default "#000")
  lineWidth?: number    // line width in px (default 1.5)
  spacing?: number      // gap between lines in px (default 6)
  angle?: number        // line angle in degrees (default 45)
  lineOpacity?: number  // SVG line opacity (default 1)
}`} />
      <LiveExample
        type={BarChart}
        title="Projected bars textured with a hatch fill"
        startHidden={false}
        frameProps={{
          data: [
            { q: "Q1", revenue: 120, projected: false },
            { q: "Q2", revenue: 145, projected: false },
            { q: "Q3", revenue: 160, projected: true },
            { q: "Q4", revenue: 175, projected: true },
          ],
          categoryAccessor: "q",
          valueAccessor: "revenue",
          height: 300,
          color: "#4e79a7",
          styleRules: [
            {
              when: (d) => d.projected === true,
              style: { fill: { type: "hatch", background: "#cdddef", stroke: "#4e79a7" } },
            },
          ],
        }}
        overrideProps={{ data: "quarterlyData" }}
      />
      <p>
        The same descriptor works as a <em>region</em> fill on <code>band</code>{" "}
        and <code>x-band</code> annotations (<code>fill: {"{ type: 'hatch', … }"}</code>),
        so an uncertainty or "projected" region can be hatched rather than
        flat-shaded. For a hand-built <code>CanvasPattern</code> (canvas only),{" "}
        <code>createHatchPattern()</code> is still available — see{" "}
        <Link to="/theming/styling">Styling</Link>.
      </p>

      <h2 id="label-backgrounds">Annotation label backgrounds</h2>
      <p>
        Region-bounding annotations — <code>y-threshold</code>,{" "}
        <code>x-threshold</code>, <code>band</code>, <code>x-band</code>,{" "}
        <code>enclose</code>, <code>rect-enclose</code>, and{" "}
        <code>category-highlight</code> — accept a <code>labelBackground</code>{" "}
        that puts a legibility backdrop behind the label text. It works on every
        frame (XY, ordinal, network, geo) and in server SVG, because all of them
        share one label renderer.
      </p>
      <table className="reference-table">
        <thead>
          <tr><th><code>labelBackground</code></th><th>Result</th></tr>
        </thead>
        <tbody>
          <tr><td><code>"halo"</code> / <code>true</code></td><td>Stroke halo (a thick outline in the plot background color) — the default for threshold and band labels.</td></tr>
          <tr><td><code>"box"</code></td><td>A filled, semitransparent rounded panel behind the text.</td></tr>
          <tr><td><code>"none"</code> / <code>false</code></td><td>Plain text, no backdrop.</td></tr>
          <tr><td><code>{"{ type, fill, opacity, padding, radius, stroke, haloWidth }"}</code></td><td>Fine-grained control over either treatment.</td></tr>
        </tbody>
      </table>
      <LiveExample
        type={LineChart}
        title="A latency SLO line with a boxed threshold label"
        startHidden={false}
        frameProps={{
          data: latencyData,
          xAccessor: "t",
          yAccessor: "ms",
          height: 300,
          color: "#4e79a7",
          annotations: [
            {
              type: "y-threshold",
              value: 200,
              label: "SLO · 200ms",
              color: "#d7263d",
              labelBackground: { type: "box", fill: "var(--semiotic-bg)", opacity: 0.9, radius: 4 },
            },
            {
              type: "x-band",
              x0: 27,
              x1: 39,
              label: "incident window",
              fill: { type: "hatch", background: "#fdecec", stroke: "#d7263d", spacing: 7 },
              // 50% transparent so the latency line stays visible through the band.
              fillOpacity: 0.5,
              color: "#d7263d",
            },
          ],
        }}
        overrideProps={{ data: "latencyData" }}
      />

      <h2 id="families">Across every chart family</h2>
      <p>
        <code>styleRules</code> uses the <strong>same API</strong> on every
        family — only the <code>ctx</code> channels differ. Bars expose{" "}
        <code>value</code>; XY marks expose <code>value</code> (= y),{" "}
        <code>x</code>, and <code>y</code> (target either axis with{" "}
        <code>{'{ axis: "x" }'}</code>); network nodes, geo features, and
        physics particles expose <code>value</code> plus <code>category</code>{" "}
        (the <code>colorBy</code> group).
      </p>

      <h3 id="xy-points">XY — per-point, either axis</h3>
      <p>
        Scatterplot rules see the raw datum, so an x <em>and</em> y threshold
        both resolve. Here points in the top-right quadrant are flagged and the
        far outliers hatched.
      </p>
      <LiveExample
        type={Scatterplot}
        title="Scatter points styled by x/y thresholds"
        startHidden={false}
        frameProps={{
          data: Array.from({ length: 40 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100 })),
          xAccessor: "x",
          yAccessor: "y",
          height: 320,
          color: "#4e79a7",
          pointRadius: 6,
          styleRules: [
            { when: { axis: "x", gte: 60 }, style: { fill: "#f0b429" } },
            { when: (d) => d.x >= 60 && d.y >= 60, style: { fill: "#d7263d" } },
            { when: (d) => d.x >= 85 && d.y >= 85, style: { fill: { type: "hatch", background: "#d7263d", stroke: "#fff", spacing: 5 } } },
          ],
        }}
        overrideProps={{ data: "scatterData" }}
      />

      <h3 id="network-playground">Network nodes — interactive</h3>
      <p>
        Rules see the raw node; <code>ctx.value</code> is the node's{" "}
        <code>weight</code> here. Drag the threshold, switch solid/hatch, and
        toggle a second rule to watch <em>last-applicable-rule-wins</em> repaint
        the overlapping nodes. The layout re-settles on data change but a rule
        change only restyles — a good way to confirm nothing breaks.
      </p>
      <NetworkStyleRulesDemo />

      <h3 id="geo-playground">Geo features — interactive</h3>
      <p>
        The same controls over a <code>ChoroplethMap</code> (each country is
        seeded with a 0–100 value). Rules layer over the sequential base fill,
        so unmatched countries keep their scale color while matched ones flip to
        your rule's solid color or hatch.
      </p>
      <GeoStyleRulesDemo />

      <h3 id="physics-family">Physics particles</h3>
      <p>
        Physics particles use the identical API — <code>ctx.value</code> is the
        body's value. (Shown as code to keep the <code>semiotic/physics</code>{" "}
        kernel out of this page's bundle.)
      </p>
      <CodeBlock language="tsx" code={`// Physics — recolor particles over a threshold (ctx.value = the body's value)
<GaltonBoardChart
  data={samples} valueAccessor="value"
  styleRules={[{ when: { gte: 15 }, style: { fill: "var(--semiotic-danger)" } }]}
/>`} />
      <p className="callout">
        Coverage notes: line/area rules resolve per-series (against the series'
        first point), not per-vertex. Network hierarchy charts (Tree, Treemap,
        CirclePack, Orbit) are not wired — their <code>colorByDepth</code> owns
        the fill. MultiAxisLineChart, MinimapChart, and CandlestickChart are
        also not wired.
      </p>

      <h2 id="ai">For agents & server rendering</h2>
      <p>
        <code>styleRules</code>, hatch fills, and <code>labelBackground</code> all
        work through <code>renderChart()</code> and the MCP <code>renderChart</code>{" "}
        tool — the props are plain JSON, so an agent can emit them directly. The
        capacity chart above, rendered server-side:
      </p>
      <CodeBlock language="ts" code={`import { renderChart } from "semiotic/server"

const svg = renderChart("StackedBarChart", {
  data: usageData, // Fast scaling / Fixed-rate / Over max (split at 15)
  categoryAccessor: "t",
  stackBy: "tier",
  valueAccessor: "value",
  colorScheme: { "Fast scaling": "#3fa34d", "Fixed-rate": "#f0b429", "Over max": "#d7263d" },
  valueExtent: [0, 20],
  // Declarative { field, eq } thresholds are JSON-serializable — an agent can
  // emit these directly (a predicate function can't cross a JSON boundary).
  styleRules: [
    { when: { field: "tier", eq: "Fixed-rate" },
      style: { fill: { type: "hatch", background: "#f7d774", stroke: "#e0a92a" } } },
    { when: { field: "tier", eq: "Over max" },
      style: { fill: { type: "hatch", background: "#f8b4b4", stroke: "#d7263d" } } },
  ],
  annotations: [
    { type: "y-threshold", value: 15, label: "Max · 15", color: "#d7263d" },
    { type: "y-threshold", value: 10, label: "Fast-scaling · 10", color: "#2f7d32",
      labelBackground: "box" },
  ],
})`} />
      <p className="callout">
        Note: on the server path, prefer the declarative threshold form
        (<code>{"{ field, eq }"}</code>) over a predicate function when the
        config must be serialized as JSON — predicate functions can't cross a
        JSON boundary.
      </p>

      <h2 id="precedence">Precedence</h2>
      <p>
        For bar marks, fill resolution runs base → rules → user override, with
        primitives last:
      </p>
      <CodeBlock language="text" code={`top-level stroke / strokeWidth / opacity   (always win)
  > frameProps.pieceStyle  (imperative escape hatch)
    > styleRules           (declarative, last-applicable rule per property)
      > colorBy / color / colorScheme / theme   (resolved base)`} />

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/bar-chart">Bar Chart</Link> — the base chart and its other styling props.</li>
        <li><Link to="/theming/styling">Styling</Link> — primitive styling, gradients, and the canvas <code>createHatchPattern()</code> helper.</li>
        <li><Link to="/annotations/overview">Annotations</Link> — the full annotation type reference.</li>
      </ul>
    </PageLayout>
  )
}
