import React, { useEffect, useRef, useState } from "react"
import { BigNumber } from "semiotic/value"
import { ThemeProvider } from "semiotic/utils"
import { THEME_PRESETS } from "semiotic/themes"
// These chart families are imported *only here in the docs* to demo
// dropping a real Semiotic chart into BigNumber's `trendSlot` (wide /
// rectangular) or `chartSlot` (square). The `semiotic/value` bundle
// itself ships with no chart-family dependency.
import { LineChart, AreaChart, Scatterplot } from "semiotic/xy"
import { DonutChart, PieChart } from "semiotic/ordinal"

import ComponentMeta from "../../components/ComponentMeta"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const bigNumberProps = [
  { name: "value", type: "number", required: true, description: "The focal value to display." },
  { name: "label", type: "string", description: "Short caption above the value." },
  { name: "caption", type: "string", description: "Secondary caption below the value." },
  { name: "format", type: '"number" | "currency" | "percent" | "compact" | "duration" | function', default: '"number"', description: "Value formatter; pass a function for full control." },
  { name: "locale", type: "string", description: "BCP-47 locale for number/currency formatting." },
  { name: "currency", type: "string", description: "ISO currency code when format is \"currency\"." },
  { name: "precision", type: "number", description: "Fraction-digit count for the formatted value." },
  { name: "prefix", type: "string", description: "Text rendered before the value." },
  { name: "suffix", type: "string", description: "Text rendered after the value." },
  { name: "unit", type: "string", description: "Unit appended to the value and the aria-label." },
  { name: "comparison", type: "object", description: "{ value, label?, format?, direction? } — drives the delta row." },
  { name: "target", type: "object", description: "{ value, label?, format?, direction? } — drives the % -of-target readout." },
  { name: "delta", type: "number", description: "Explicit delta override (otherwise derived from comparison)." },
  { name: "showDeltaPercent", type: "boolean", default: "true", description: "Show the percent change alongside the signed delta." },
  { name: "direction", type: '"higher-is-better" | "lower-is-better" | "neutral"', default: '"higher-is-better"', description: "How delta sign maps to sentiment." },
  { name: "sentiment", type: '"auto" | "positive" | "negative" | "neutral"', default: '"auto"', description: "Force the sentiment color instead of deriving it." },
  { name: "thresholds", type: "array", description: "[{ at, level, color?, label? }] — resolved by highest at ≤ value, painted via --semiotic-{level}." },
  { name: "mode", type: '"tile" | "presentation" | "inline" | "thumbnail"', default: '"tile"', description: "Layout/typography preset." },
  { name: "windowSize", type: "number", default: "60", description: "Caps the push buffer surfaced via getData() / slot context." },
  { name: "animate", type: "boolean | object", description: "Tween between value changes ({ duration?, easing?, intro? })." },
  { name: "stalenessThreshold", type: "number", description: "Milliseconds without a push after which the card dims." },
  { name: "staleLabel", type: "string", description: "Label shown when the value is stale." },
  { name: "trendSlot", type: "ReactNode | function", description: "Wide chart slot beneath the value (sparkline-aspect charts)." },
  { name: "chartSlot", type: "ReactNode | function", description: "Square chart slot beside the value (donut/pie/scatter)." },
  { name: "chartSize", type: "number", description: "Pixels reserved for chartSlot; defaults to 44px in tile mode and 80px in presentation mode." },
]

// ---------------------------------------------------------------------------
// Shared styles for this page
// ---------------------------------------------------------------------------

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
  margin: "16px 0",
}

const sectionNote = {
  fontSize: 13,
  color: "var(--text-secondary, #6b7280)",
  margin: "4px 0 12px",
}

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Theming preset cycler
// ---------------------------------------------------------------------------

const THEMING_PRESETS = [
  "light",
  "dark",
  "tufte",
  "tufte-dark",
  "carbon",
  "carbon-dark",
  "journalist",
  "playful-dark",
  "italian",
  "high-contrast",
]

function ThemingBigNumberDemo() {
  const [preset, setPreset] = useState("light")
  const active = THEME_PRESETS[preset]
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        {THEMING_PRESETS.map((name) => {
          const t = THEME_PRESETS[name]
          const isActive = name === preset
          return (
            <button
              key={name}
              onClick={() => setPreset(name)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${isActive ? "var(--accent, #6366f1)" : t.colors.border}`,
                background: isActive ? "var(--accent, #6366f1)" : t.colors.surface || t.colors.background,
                color: isActive ? "#fff" : t.colors.text,
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                fontFamily: t.typography.fontFamily,
                cursor: "pointer",
              }}
            >
              {name}
            </button>
          )
        })}
      </div>

      <ThemeProvider theme={preset}>
        <div
          style={{
            padding: 20,
            borderRadius: 8,
            background: active.colors.background,
            border: `1px solid ${active.colors.border}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <BigNumber
            value={1284900}
            label="Q3 Revenue"
            caption="Year-to-date bookings"
            format="currency"
            precision={0}
            comparison={{ value: 980000, label: "vs Q2" }}
            target={{ value: 1500000, label: "Q3 plan" }}
            thresholds={[
              { at: -Infinity, level: "danger" },
              { at: 1000000, level: "warning" },
              { at: 1300000, level: "success" },
            ]}
            width={300}
            height={210}
            trendSlot={(ctx) => (
              <LineChart
                data={[820000, 870000, 920000, 1010000, 1120000, 1284900].map((y, x) => ({ x, y }))}
                xAccessor="x"
                yAccessor="y"
                mode="sparkline"
                width={268}
                height={32}
                color={ctx.color}
                showPoints={false}
                animate={false}
                margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                accessibleTable={false}
                emptyContent={false}
              />
            )}
          />
          <BigNumber
            value={486}
            label="P99 latency"
            caption="value rose — danger because lower-is-better"
            suffix=" ms"
            comparison={{ value: 410, label: "vs last week", direction: "lower-is-better" }}
            thresholds={[
              { at: -Infinity, level: "success" },
              { at: 300, level: "warning" },
              { at: 450, level: "danger" },
            ]}
            width={300}
            height={210}
            trendSlot={(ctx) => (
              <AreaChart
                data={[392, 405, 418, 442, 461, 486].map((y, x) => ({ x, y }))}
                xAccessor="x"
                yAccessor="y"
                mode="sparkline"
                width={268}
                height={32}
                color={ctx.color}
                areaOpacity={0.25}
                animate={false}
                margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                accessibleTable={false}
                emptyContent={false}
              />
            )}
          />
        </div>
      </ThemeProvider>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

function StreamingBigNumberDemo() {
  const ref = useRef(null)
  useEffect(() => {
    let last = 1280000
    const id = setInterval(() => {
      const drift = (Math.random() - 0.4) * 30000
      last = Math.max(900000, Math.min(1500000, last + drift))
      ref.current?.push({ value: last, time: Date.now() })
    }, 700)
    // seed
    ref.current?.pushMany(
      [950000, 980000, 1010000, 1070000, 1090000, 1140000, 1180000, 1220000, 1260000, last].map(
        (v) => ({ value: v, time: Date.now() }),
      ),
    )
    return () => clearInterval(id)
  }, [])

  return (
    <BigNumber
      ref={ref}
      value={0}
      label="Live Bookings"
      caption="Updated every 700ms"
      format="currency"
      precision={0}
      comparison={{ value: 1000000, label: "vs plan" }}
      target={{ value: 1500000, label: "Q3 plan" }}
      thresholds={[
        { at: -Infinity, level: "danger" },
        { at: 1000000, level: "warning" },
        { at: 1300000, level: "success" },
      ]}
      windowSize={40}
      stalenessThreshold={2500}
      animate={{ duration: 220 }}
      width={340}
      height={200}
    />
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BigNumberPage() {
  return (
    <PageLayout>
      <ComponentMeta
        componentName="BigNumber"
        importStatement='import { BigNumber } from "semiotic/value"'
        tier="charts"
        wraps="(plain React — no Stream Frame)"
        related={[
          { name: "GaugeChart", path: "/charts/gauge-chart" },
          { name: "Sparkline", path: "/charts/sparkline" },
        ]}
      />

      <ChartGrounding component="BigNumber" />

      <h2 id="quick-start">Quick Start</h2>
      <p>
        <code>BigNumber</code> is the catalog&apos;s answer to{" "}
        <em>&ldquo;I have one number — show me the number.&rdquo;</em> It ships under{" "}
        <code>semiotic/value</code> as a plain React component (no Stream Frame) so it renders
        cleanly in SSR, embeds in prose, and comes in at about 6 KB gz.
      </p>
      <p>
        The component is intentionally feature-rich — it&apos;s the forward-looking POC for a future{" "}
        <code>SingleValueFrame</code>: every contract that frame would own (format cascade,
        threshold zones via semantic theme roles, comparison anchoring, sentence-form ARIA, push API
        with staleness) is already wired here.
      </p>

      <div style={{ margin: "20px 0" }}>
        <BigNumber
          value={1284900}
          label="Q3 Revenue"
          caption="Year-to-date bookings"
          format="currency"
          precision={0}
          comparison={{ value: 980000, label: "vs Q2" }}
          target={{ value: 1500000, label: "Q3 plan" }}
          thresholds={[
            { at: -Infinity, level: "danger" },
            { at: 1000000, level: "warning" },
            { at: 1300000, level: "success" },
          ]}
          width={360}
          height={210}
          trendSlot={(ctx) => (
            <LineChart
              data={[820000, 870000, 920000, 1010000, 1120000, 1284900].map((y, x) => ({ x, y }))}
              xAccessor="x"
              yAccessor="y"
              mode="sparkline"
              width={328}
              height={36}
              color={ctx.color}
              showPoints={false}
              animate={false}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
              accessibleTable={false}
              emptyContent={false}
            />
          )}
        />
      </div>

      <CodeBlock language="tsx">{`import { BigNumber } from "semiotic/value"
import { LineChart } from "semiotic/xy"

<BigNumber
  value={1284900}
  label="Q3 Revenue"
  caption="Year-to-date bookings"
  format="currency"
  precision={0}
  comparison={{ value: 980000, label: "vs Q2" }}
  target={{ value: 1500000, label: "Q3 plan" }}
  thresholds={[
    { at: -Infinity,   level: "danger"  },
    { at: 1000000,     level: "warning" },
    { at: 1300000,     level: "success" },
  ]}
  trendSlot={(ctx) => (
    <LineChart
      data={recentMonths.map((y, x) => ({ x, y }))}
      xAccessor="x" yAccessor="y"
      mode="sparkline" width={328} height={36}
      color={ctx.color}
    />
  )}
/>`}</CodeBlock>

      <h2 id="layout-modes">Layout Modes</h2>
      <p style={sectionNote}>
        Four modes wrap the focal value in different chrome envelopes. The same content reformats
        per mode — useful for dashboards (tile), hero cards (presentation), in-paragraph numbers
        (inline), and dense grids (thumbnail).
      </p>

      <div style={gridStyle}>
        <BigNumber value={72} label="Tile mode" caption="dashboard cell" suffix="%" mode="tile" />
        <BigNumber
          value={1240}
          label="Thumbnail"
          caption="hidden in thumbnail"
          mode="thumbnail"
          format="compact"
        />
      </div>
      <p style={sectionNote}>
        Inline mode flows in prose:{" "}
        <BigNumber value={32} suffix="%" mode="inline" comparison={{ value: 28 }} />
        {" — handy for stat-driven copy that needs sentiment colour without a card."}
      </p>
      <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
        <BigNumber
          value={94.3}
          label="Uptime this quarter"
          caption="presentation mode"
          suffix="%"
          comparison={{ value: 92.1, label: "vs last quarter" }}
          mode="presentation"
          thresholds={[
            { at: -Infinity, level: "danger" },
            { at: 90, level: "warning" },
            { at: 95, level: "success" },
          ]}
        />
      </div>

      <h2 id="thresholds">Threshold Zones</h2>
      <p style={sectionNote}>
        Threshold zones map a value into a status level (<code>success</code>, <code>warning</code>,{" "}
        <code>danger</code>, <code>info</code>, <code>neutral</code>). The resolved level paints the
        focal value via the matching <code>--semiotic-&#123;level&#125;</code> CSS variable, so
        theming flows through without per-card colour overrides.
      </p>
      <div style={gridStyle}>
        <BigNumber
          value={42}
          label="Throughput"
          suffix=" req/s"
          thresholds={[
            { at: -Infinity, level: "danger" },
            { at: 50, level: "warning" },
            { at: 100, level: "success" },
          ]}
        />
        <BigNumber
          value={75}
          label="Throughput"
          suffix=" req/s"
          thresholds={[
            { at: -Infinity, level: "danger" },
            { at: 50, level: "warning" },
            { at: 100, level: "success" },
          ]}
        />
        <BigNumber
          value={140}
          label="Throughput"
          suffix=" req/s"
          thresholds={[
            { at: -Infinity, level: "danger" },
            { at: 50, level: "warning" },
            { at: 100, level: "success" },
          ]}
        />
      </div>

      <h2 id="formatting">Formatting Cascade</h2>
      <p style={sectionNote}>
        Built-in shortcuts (<code>number</code>, <code>currency</code>, <code>percent</code>,{" "}
        <code>compact</code>, <code>duration</code>) use <code>Intl.NumberFormat</code> with your{" "}
        <code>locale</code> + <code>currency</code> + <code>precision</code> props. Pass a function
        for anything else.
      </p>
      <div style={gridStyle}>
        <BigNumber value={1284900} label="currency" format="currency" precision={0} />
        <BigNumber value={1284900} label="compact" format="compact" />
        <BigNumber value={0.0823} label="percent" format="percent" precision={1} />
        <BigNumber value={3700000} label="duration" format="duration" />
        <BigNumber value={42} label="prefix + suffix" prefix="★ " suffix=" pts" />
        <BigNumber value={9} label="custom fn" format={(v) => `Lvl ${v}`} />
      </div>

      <h2 id="comparison-target">Comparison + Target</h2>
      <p style={sectionNote}>
        Pair the focal value with a prior-period comparison or a goal. Sentiment is inferred from{" "}
        <code>direction</code> (default <code>&ldquo;higher-is-better&rdquo;</code>) and the sign of
        the delta — override with the <code>sentiment</code> prop when the rule doesn&apos;t hold
        (e.g. P99 latency where lower is better).
      </p>
      <div style={gridStyle}>
        <BigNumber
          value={1284900}
          label="Higher is better"
          format="currency"
          precision={0}
          comparison={{ value: 980000, label: "vs Q2" }}
        />
        <BigNumber
          value={486}
          label="P99 latency"
          caption="lower is better → red is bad"
          suffix=" ms"
          comparison={{ value: 410, label: "vs last week", direction: "lower-is-better" }}
        />
        <BigNumber value={750} label="of target" target={{ value: 1000, label: "Q3 goal" }} />
      </div>

      <h2 id="embedded-charts">Embedded Charts (Two Slots)</h2>
      <p style={sectionNote}>
        <code>BigNumber</code> ships <strong>no built-in chart renderer</strong>.
        The card is a layout host: the consumer composes their own Semiotic
        chart (or any ReactNode) into one of two slots, picked by the
        chart&apos;s aspect ratio.
      </p>
      <ul style={{ ...sectionNote, paddingLeft: 18 }}>
        <li>
          <code>trendSlot</code> — <strong>wide / rectangular</strong> charts
          beneath the value. <code>LineChart</code>, <code>AreaChart</code>,{" "}
          <code>DifferenceChart</code>, anything that reads as a horizontal
          strip. <code>mode=&quot;sparkline&quot;</code> on the chart strips
          chrome automatically.
        </li>
        <li>
          <code>chartSlot</code> — <strong>square</strong> charts anchored
          top-right. <code>DonutChart</code>, <code>PieChart</code>,{" "}
          <code>Scatterplot</code>, <code>Treemap</code>, <code>CirclePack</code>{" "}
          — anything that wants equal width and height. Rendered at
          sparkline scale (~two line-heights) so the chart reads as a
          decoration beside the focal value, not a competitor.
        </li>
      </ul>
      <p style={sectionNote}>
        Both slots accept a <code>ReactNode</code> or a{" "}
        <code>(ctx) =&gt; ReactNode</code>. The function form receives a slot
        context with the resolved threshold colour (<code>ctx.color</code>),
        the threshold level (<code>ctx.level</code>), sentiment, formatted
        value, and the live <code>pushBuffer</code> — so the embedded chart can
        theme-link to the focal value without prop-drilling, and re-render
        alongside live updates.
      </p>

      <h3 id="wide-slot">
        <code>trendSlot</code>: wide / rectangular charts
      </h3>
      <div style={gridStyle}>
        <BigNumber
          value={1284900}
          label="LineChart slot"
          format="currency"
          precision={0}
          comparison={{ value: 980000, label: "vs Q2" }}
          width={300}
          trendSlot={(ctx) => (
            <LineChart
              data={[820000, 870000, 920000, 1010000, 1120000, 1284900].map((y, x) => ({ x, y }))}
              xAccessor="x"
              yAccessor="y"
              mode="sparkline"
              width={268}
              height={32}
              color={ctx.color}
              showPoints={false}
              animate={false}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
              accessibleTable={false}
              emptyContent={false}
            />
          )}
        />
        <BigNumber
          value={94.3}
          label="AreaChart slot"
          suffix=" %"
          comparison={{ value: 92.1, label: "vs Q2" }}
          width={300}
          trendSlot={(ctx) => (
            <AreaChart
              data={[88, 89, 90.5, 91.7, 93, 94.3].map((y, x) => ({ x, y }))}
              xAccessor="x"
              yAccessor="y"
              mode="sparkline"
              width={268}
              height={32}
              color={ctx.color}
              areaOpacity={0.25}
              animate={false}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
              accessibleTable={false}
              emptyContent={false}
            />
          )}
        />
      </div>
      <CodeBlock language="tsx">{`import { BigNumber } from "semiotic/value"
import { LineChart } from "semiotic/xy"

<BigNumber
  value={1284900}
  label="Q3 Revenue"
  format="currency"
  trendSlot={(ctx) => (
    <LineChart
      data={recentMonths.map((y, x) => ({ x, y }))}
      xAccessor="x" yAccessor="y"
      mode="sparkline"
      width={260} height={32}
      color={ctx.color}    // resolves to the threshold's --semiotic-{level}
    />
  )}
/>`}</CodeBlock>

      <h3 id="square-slot">
        <code>chartSlot</code>: square charts (top-right corner)
      </h3>
      <p style={sectionNote}>
        Pass a square-aspect chart and BigNumber anchors it in the top-right
        corner of the card at <strong>sparkline scale</strong> — roughly two
        line-heights, so it reads as a decorative spark next to the focal
        value rather than competing with it. The reserved square defaults to
        44px (tile) / 80px (presentation); override with{" "}
        <code>chartSize</code>.
      </p>
      <div style={gridStyle}>
        <BigNumber
          value={1284900}
          label="Revenue mix"
          caption="by region"
          format="currency"
          precision={0}
          chartSlot={
            <DonutChart
              data={[
                { region: "NA", revenue: 540000 },
                { region: "EU", revenue: 420000 },
                { region: "APAC", revenue: 324900 },
              ]}
              categoryAccessor="region"
              valueAccessor="revenue"
              mode="sparkline"
              width={44}
              height={44}
              innerRadius={9}
              animate={false}
              accessibleTable={false}
              emptyContent={false}
              showLegend={false}
              margin={0}
            />
          }
        />
        <BigNumber
          value={42}
          label="Survey responses"
          caption="positive sentiment"
          suffix=" %"
          comparison={{ value: 38, label: "vs last month" }}
          thresholds={[
            { at: -Infinity, level: "danger" },
            { at: 40, level: "warning" },
            { at: 60, level: "success" },
          ]}
          chartSlot={
            <PieChart
              data={[
                { sentiment: "positive", n: 42 },
                { sentiment: "neutral", n: 33 },
                { sentiment: "negative", n: 25 },
              ]}
              categoryAccessor="sentiment"
              valueAccessor="n"
              mode="sparkline"
              width={44}
              height={44}
              animate={false}
              accessibleTable={false}
              emptyContent={false}
              showLegend={false}
              margin={0}
            />
          }
        />
        <BigNumber
          value={0.71}
          label="Correlation"
          caption="price ↔ demand"
          format={(v) => v.toFixed(2)}
          chartSlot={
            <Scatterplot
              data={Array.from({ length: 24 }, (_, i) => ({
                x: i + Math.sin(i) * 1.5,
                y: i * 0.85 + Math.cos(i / 2) * 2,
              }))}
              xAccessor="x"
              yAccessor="y"
              mode="sparkline"
              width={44}
              height={44}
              pointRadius={1.5}
              pointOpacity={0.7}
              animate={false}
              showAxes={false}
              showGrid={false}
              accessibleTable={false}
              emptyContent={false}
              margin={1}
            />
          }
        />
      </div>
      <CodeBlock language="tsx">{`import { BigNumber } from "semiotic/value"
import { DonutChart } from "semiotic/ordinal"

<BigNumber
  value={1284900}
  label="Revenue mix"
  format="currency"
  chartSlot={
    <DonutChart
      data={revenueByRegion}
      categoryAccessor="region" valueAccessor="revenue"
      mode="sparkline"
      width={44} height={44} innerRadius={9}
      margin={0}
    />
  }
/>`}</CodeBlock>

      <h3 id="both-slots">Both slots at once</h3>
      <p style={sectionNote}>
        Use <code>trendSlot</code> + <code>chartSlot</code> together when both
        a time-series and a part-to-whole view make sense — the square chart
        anchors the top-right, the wide trend stretches across the bottom.
      </p>
      <div style={{ margin: "16px 0" }}>
        <BigNumber
          value={1284900}
          label="Q3 Revenue"
          caption="by region + 6-month trajectory"
          format="currency"
          precision={0}
          comparison={{ value: 980000, label: "vs Q2" }}
          width={420}
          height={180}
          chartSize={64}
          chartSlot={
            <DonutChart
              data={[
                { region: "NA", revenue: 540000 },
                { region: "EU", revenue: 420000 },
                { region: "APAC", revenue: 324900 },
              ]}
              categoryAccessor="region"
              valueAccessor="revenue"
              mode="sparkline"
              width={64}
              height={64}
              innerRadius={14}
              animate={false}
              accessibleTable={false}
              emptyContent={false}
              showLegend={false}
              margin={0}
            />
          }
          trendSlot={(ctx) => (
            <LineChart
              data={[820000, 870000, 920000, 1010000, 1120000, 1284900].map((y, x) => ({ x, y }))}
              xAccessor="x"
              yAccessor="y"
              mode="sparkline"
              width={388}
              height={36}
              color={ctx.color}
              showPoints={false}
              animate={false}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
              accessibleTable={false}
              emptyContent={false}
            />
          )}
        />
      </div>

      <h2 id="streaming">Streaming (push API + staleness)</h2>
      <p style={sectionNote}>
        Omit the <code>value</code> prop semantics and feed live updates through a ref handle:{" "}
        <code>push</code> / <code>pushMany</code> / <code>clear</code> / <code>getValue</code> /{" "}
        <code>getData</code>. The auto-trend buffer is bounded by <code>windowSize</code> and the
        card dims itself when no push lands within <code>stalenessThreshold</code>.
      </p>
      <div style={{ margin: "16px 0" }}>
        <StreamingBigNumberDemo />
      </div>
      <CodeBlock language="tsx">{`function LiveBookings() {
  const ref = useRef<BigNumberHandle>(null)
  useEffect(() => {
    const id = setInterval(() => {
      ref.current?.push({ value: nextSample(), time: Date.now() })
    }, 700)
    return () => clearInterval(id)
  }, [])
  return (
    <BigNumber
      ref={ref}
      value={0}                       // initial / fallback
      label="Live Bookings"
      format="currency"
      precision={0}
      windowSize={40}                 // bounded trend buffer
      stalenessThreshold={2500}       // dim after 2.5s of no push
      animate={{ duration: 220 }}
      comparison={{ value: 1000000, label: "vs plan" }}
      target={{ value: 1500000, label: "Q3 plan" }}
      thresholds={[
        { at: -Infinity, level: "danger" },
        { at: 1000000, level: "warning" },
        { at: 1300000, level: "success" },
      ]}
    />
  )
}`}</CodeBlock>

      <h2 id="slots">Slot Overrides</h2>
      <p style={sectionNote}>
        Every layout slot — <code>headerSlot</code>, <code>valueSlot</code>,{" "}
        <code>deltaSlot</code>, <code>trendSlot</code> (wide chart),{" "}
        <code>chartSlot</code> (square chart), <code>footerSlot</code> — accepts
        a ReactNode or a function receiving the resolved context (formatted
        value, delta, level, color, sentiment, isStale, pushBuffer). Use these
        to plug your own chart in or to fully replace a sub-region without
        losing the formatting / threshold cascade.
      </p>
      <CodeBlock language="tsx">{`<BigNumber
  value={1284900}
  label="Revenue"
  format="currency"
  comparison={{ value: 980000 }}
  valueSlot={(ctx) => (
    <div style={{ fontSize: 72, color: ctx.sentiment === "positive" ? "var(--semiotic-success)" : "var(--semiotic-danger)" }}>
      {ctx.formattedValue}
    </div>
  )}
  footerSlot={(ctx) => ctx.isStale ? <em>data is {ctx.delta} stale</em> : null}
/>`}</CodeBlock>

      <h2 id="theming">Theming</h2>
      <p style={sectionNote}>
        Every visible piece of <code>BigNumber</code> reads from theme CSS variables:
        the focal value picks its colour from <code>--semiotic-&#123;level&#125;</code> via
        the resolved threshold, the card chrome reads from{" "}
        <code>--semiotic-border</code> / <code>--semiotic-surface</code> /{" "}
        <code>--semiotic-border-radius</code>, the trend sparkline inherits the value
        colour and renders through Semiotic&apos;s <code>LineChart</code> in{" "}
        <code>mode=&quot;sparkline&quot;</code>, and the typography flows through the
        theme&apos;s <code>--semiotic-font-family</code>. Wrap the card (or any
        ancestor) in <code>ThemeProvider</code> and every part updates in lockstep:
      </p>

      <ThemingBigNumberDemo />

      <p style={sectionNote}>
        Theming works <em>without</em> <code>ThemeProvider</code> too — set the
        CSS variables on any ancestor (a section, a dark-mode media query, a
        forced-colors block) and the card picks them up via standard CSS cascade.
        That&apos;s how the sparkline inside a <code>BigNumber</code> ends up
        matching a Tufte-themed bar chart sitting beside it.
      </p>

      <h2 id="semantic-classes">Semantic CSS Classes</h2>
      <p style={sectionNote}>
        Every meaningful element carries a BEM-style class so you can target
        individual parts (or whole-card states like sentiment / level / stale) from
        a stylesheet — no inline-style overrides, no <code>frameProps</code>
        gymnastics. The class names mirror the data attributes for consistency.
      </p>

      <CodeBlock language="text">{`semiotic-bignumber                       (root)
semiotic-bignumber--mode-{tile|presentation|inline|thumbnail}
semiotic-bignumber--level-{success|warning|danger|info|neutral}
semiotic-bignumber--sentiment-{positive|negative|neutral}
semiotic-bignumber--stale                (only when stalenessThreshold fires)
semiotic-bignumber--loading              (only during loading state)
semiotic-bignumber--empty                (only when value is empty)
  semiotic-bignumber__top                (only when chartSlot is set — row layout)
    semiotic-bignumber__text-region
      semiotic-bignumber__header
        semiotic-bignumber__label
        semiotic-bignumber__caption
      semiotic-bignumber__value semiotic-bignumber__value--{level}
        semiotic-bignumber__value-text
        semiotic-bignumber__unit
      semiotic-bignumber__delta semiotic-bignumber__delta--{up|down|flat}
        semiotic-bignumber__delta-row semiotic-bignumber__delta-row--{up|down|flat}
          semiotic-bignumber__arrow semiotic-bignumber__arrow--{up|down|flat}
          semiotic-bignumber__delta-amount
          semiotic-bignumber__delta-percent
        semiotic-bignumber__comparison-label
        semiotic-bignumber__target
          semiotic-bignumber__target-percent
          semiotic-bignumber__target-value
    semiotic-bignumber__chart              (square chart slot, beside the value)
  semiotic-bignumber__trend                (wide chart slot, beneath the value)
  semiotic-bignumber__footer`}</CodeBlock>

      <p style={sectionNote}>Example — restyle the up / down indicators on a dashboard-wide basis:</p>
      <CodeBlock language="css">{`.semiotic-bignumber__arrow {
  font-size: 0.75em;
  margin-right: 2px;
}
.semiotic-bignumber__arrow--up { color: oklch(70% 0.18 145); }
.semiotic-bignumber__arrow--down { color: oklch(60% 0.20 25); }

/* Use cascade modifiers to overrule the auto sentiment colour on a single tile */
.kpi-strict .semiotic-bignumber--sentiment-positive .semiotic-bignumber__delta-row {
  color: var(--semiotic-info);
}

/* Suppress the trend sparkline on print without re-rendering the React tree */
@media print {
  .semiotic-bignumber__trend { display: none; }
}`}</CodeBlock>

      <h2 id="accessibility">Accessibility</h2>
      <p style={sectionNote}>
        The outer container renders a sentence-form <code>aria-label</code> that bundles every piece
        of the displayed value: label, formatted value, unit, delta with direction word, percent
        change, comparison label, target percent, and a <code>stale</code> tag when staleness fires.
        Pass <code>description</code> to override entirely, or <code>summary</code> to add a
        screen-reader-only supplement below.
      </p>
      <p style={sectionNote}>
        Threshold zones use semantic theme roles, so a high-contrast or forced-colors theme
        automatically remaps the value text colour without per-card overrides.
      </p>

      <h2 id="props">Props</h2>
      <p style={sectionNote}>
        Core props are listed below. <code>BigNumber</code> also accepts slot
        overrides (<code>headerSlot</code>, <code>valueSlot</code>,{" "}
        <code>deltaSlot</code>, <code>footerSlot</code>) and layout props
        (<code>align</code>, <code>padding</code>, <code>emphasis</code>,{" "}
        <code>color</code>, <code>background</code>, <code>borderColor</code>,{" "}
        <code>borderRadius</code>), each a ReactNode or{" "}
        <code>(ctx) =&gt; ReactNode</code>.
      </p>
      <PropTable componentName="BigNumber" props={bigNumberProps} />

      <h2 id="future-frame">Future SingleValueFrame</h2>
      <p style={sectionNote}>
        <code>BigNumber</code> ships today as plain React because the streaming / threshold / format
        contracts justify the component-level investment but don&apos;t yet justify the{" "}
        <strong>frame-level</strong> investment (a new frame is ~1–2k LOC of hit-tester /
        scene-to-SVG / SSR / theming scaffolding). The roadmap reserves a{" "}
        <code>SingleValueFrame</code> for the day live-KPI adoption gives the frame fixed cost an
        obvious payoff — at which point this component re-anchors on top of it without API change.
      </p>
    </PageLayout>
  )
}
