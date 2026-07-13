import React, { useMemo, useState } from "react"
import { StreamOrdinalFrame, StreamXYFrame } from "semiotic"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./MobileDataVisualizationExamplePage.css"

const SOURCE_LINKS = [
  {
    id: "mobilevisfixer",
    label: "MobileVisFixer",
    authors: "Wu, Tong, Dwyer, Lee, Isenberg, Qu",
    year: "2020",
    url: "https://arxiv.org/abs/2008.06678",
    claim:
      "Audited 374 SVG web visualizations and found recurring mobile failures: off-screen content, unreadable type, cluttered labels, distorted layouts, and wasted space.",
  },
  {
    id: "snyder",
    label: "Mobile exploratory interaction",
    authors: "Snyder, Rossi, Koh, Heer, Hoffswell",
    year: "2024",
    url: "https://arxiv.org/abs/2404.11602",
    claim:
      "Mobile exploration should favor discoverable, single-touch, fixed-orientation interactions with rapid inspection and graceful recovery.",
  },
  {
    id: "brehmer",
    label: "Small multiples vs animation on phones",
    authors: "Brehmer, Lee, Isenberg, Choe",
    year: "2019",
    url: "https://arxiv.org/abs/1907.03919",
    claim:
      "For mobile trend comparison tasks, small multiples were consistently faster than animation, with accuracy depending on the task.",
  },
  {
    id: "cicero",
    label: "Cicero responsive grammar",
    authors: "Kim, Rossi, Du, Koh, Guo, Hullman, Hoffswell",
    year: "2022",
    url: "https://arxiv.org/abs/2203.08314",
    claim:
      "Responsive visualization is better modeled as explicit transformations - remove, replace, transpose, aggregate, reposition - than as CSS-only scaling.",
  },
  {
    id: "dupo",
    label: "Dupo mixed-initiative authoring",
    authors: "Kim, Rossi, Hullman, Hoffswell",
    year: "2023",
    url: "https://arxiv.org/abs/2308.05136",
    claim:
      "Responsive design improves when you explore several chart versions before committing to a resized desktop view.",
  },
  {
    id: "breakpoints",
    label: "Constraint-based breakpoints",
    authors: "Schottler, Dykes, Wood, Hinrichs, Bach",
    year: "2024",
    url: "https://arxiv.org/abs/2409.01339",
    claim:
      "Set breakpoints where labels overlap, marks become too small, the aspect ratio fails, or useful space runs out.",
  },
  {
    id: "wcag",
    label: "WCAG 2.2 input modalities",
    authors: "W3C",
    year: "2024",
    url: "https://www.w3.org/TR/WCAG22/#input-modalities",
    claim:
      "Pointer interactions need accessible alternatives; target sizing and dragging requirements matter directly for phone charts.",
  },
  {
    id: "review",
    label: "Personal data visualization review",
    authors: "Alshehhi, Abdelrazek, Bonti",
    year: "2022",
    url: "https://arxiv.org/abs/2203.01374",
    claim:
      "The mobile personal visualization literature covers many domains, but mobile device limitations and evaluation frameworks remain underdeveloped.",
  },
]

const STATUS_DATA = [
  { label: "Activation", value: 82, delta: 8, color: "#1f8a70" },
  { label: "Retention", value: 64, delta: -6, color: "#f25f3a" },
  { label: "Revenue", value: 57, delta: 4, color: "#e7b44c" },
  { label: "Support", value: 31, delta: -13, color: "#26334a" },
]

const RISK_BARS = [
  { label: "Unreadable type", value: 118, color: "#f25f3a" },
  { label: "Off screen", value: 122, color: "#f25f3a" },
  { label: "Distorted ratio", value: 85, color: "#26334a" },
  { label: "Cluttered labels", value: 60, color: "#1f8a70" },
  { label: "Wasted space", value: 21, color: "#e7b44c" },
]

const LINE_SERIES = ["Activation", "Retention", "Revenue"].flatMap((series, seriesIndex) =>
  Array.from({ length: 32 }, (_, week) => {
    const drift = seriesIndex === 0 ? week * 0.74 : seriesIndex === 1 ? week * 0.18 : week * 0.46
    const base = seriesIndex === 0 ? 38 : seriesIndex === 1 ? 68 : 48
    const wave = Math.sin((week + seriesIndex * 2.8) / 3.4) * (seriesIndex === 1 ? 7 : 10)
    return {
      week: week + 1,
      value: Math.round(base + drift + wave),
      series,
      color: seriesIndex === 0 ? "#1f8a70" : seriesIndex === 1 ? "#f25f3a" : "#e7b44c",
    }
  }),
)

const CITY_TRENDS = [
  {
    city: "Transit",
    color: "#1f8a70",
    note: "steady recovery",
    data: Array.from({ length: 18 }, (_, i) => ({
      week: i + 1,
      value: Math.round(38 + i * 2.1 + Math.sin(i / 2.2) * 4),
    })),
  },
  {
    city: "Bike share",
    color: "#f25f3a",
    note: "seasonal spike",
    data: Array.from({ length: 18 }, (_, i) => ({
      week: i + 1,
      value: Math.round(30 + Math.sin((i - 4) / 2.4) * 17 + i * 1.2),
    })),
  },
  {
    city: "Walking",
    color: "#e7b44c",
    note: "stable baseline",
    data: Array.from({ length: 18 }, (_, i) => ({
      week: i + 1,
      value: Math.round(54 + Math.sin(i / 1.8) * 5 + i * 0.35),
    })),
  },
]

const SCATTER_DATA = [
  { id: "North", segment: "Grocery", x: 23, y: 72, radius: 6 },
  { id: "South", segment: "Grocery", x: 38, y: 68, radius: 7 },
  { id: "East", segment: "Grocery", x: 58, y: 83, radius: 8 },
  { id: "West", segment: "Grocery", x: 76, y: 74, radius: 7 },
  { id: "Core", segment: "Retail", x: 28, y: 44, radius: 5 },
  { id: "Mall", segment: "Retail", x: 49, y: 39, radius: 6 },
  { id: "Outlet", segment: "Retail", x: 69, y: 51, radius: 7 },
  { id: "Airport", segment: "Retail", x: 84, y: 47, radius: 6 },
  { id: "Free", segment: "Media", x: 20, y: 25, radius: 5 },
  { id: "Trial", segment: "Media", x: 42, y: 31, radius: 7 },
  { id: "Paid", segment: "Media", x: 63, y: 35, radius: 8 },
  { id: "Partner", segment: "Media", x: 88, y: 29, radius: 6 },
]

const SEGMENTS = [
  { id: "Grocery", color: "#1f8a70" },
  { id: "Retail", color: "#f25f3a" },
  { id: "Media", color: "#e7b44c" },
]

const BREAKPOINT_ROWS = Array.from({ length: 24 }, (_, i) => ({
  week: i + 1,
  value: Math.round(42 + i * 1.4 + Math.sin(i / 2.1) * 8),
}))

function sourceById(id) {
  return SOURCE_LINKS.find((source) => source.id === id)
}

function SourceLink({ id, children }) {
  const source = sourceById(id)
  return (
    <a href={source.url} target="_blank" rel="noreferrer">
      {children || `${source.authors} (${source.year})`}
    </a>
  )
}

export default function MobileDataVisualizationExamplePage() {
  return (
    <ExamplePageLayout title="Mobile Data Visualization That Works">
      <div className="mv-page">
        <section className="mv-hero" aria-labelledby="mv-title">
          <div className="mv-hero-copy">
            <div className="mv-kicker">State of the art, phone first</div>
            <h2 id="mv-title">A field guide to charts that survive a thumb, a train, and 360 CSS pixels.</h2>
            <p>
              Mobile visualization is not a smaller desktop dashboard. The best
              current work treats phone charts as designed transformations: remove
              low-value furniture, preserve the task, use text as an interface,
              and make every exploratory move possible with a single, visible tap.
            </p>
          </div>
          <PhoneTeaser />
        </section>

        <EvidenceStrip />

        <section className="mv-review" aria-labelledby="mv-review-title">
          <div className="mv-section-label">Review</div>
          <h2 id="mv-review-title">What the current literature agrees on</h2>
          <div className="mv-review-grid">
            <ReviewCard
              title="Scaling is the failure mode."
              source="mobilevisfixer"
              stat="374 charts"
            >
              <SourceLink id="mobilevisfixer">MobileVisFixer</SourceLink> found
              that mobile chart failures cluster around viewport overflow,
              unreadable text, label clutter, distorted aspect ratios, and wasted
              space. Those failures come from layout and density; changing the chart type alone will not
              failures.
            </ReviewCard>
            <ReviewCard
              title="Responsive design is a transformation stack."
              source="cicero"
              stat="not CSS only"
            >
              <SourceLink id="cicero">Cicero</SourceLink> frames responsive
              visualization as a grammar of actions such as removing,
              transposing, aggregating, repositioning, and replacing elements.
              <SourceLink id="dupo"> Dupo</SourceLink> adds that authors need to
              compare alternative versions before locking in a design.
            </ReviewCard>
            <ReviewCard
              title="Interaction must be visible and recoverable."
              source="snyder"
              stat="single touch"
            >
              <SourceLink id="snyder">Snyder et al.</SourceLink> emphasize
              discoverable, ubiquitous modalities, precise inspection, fixed
              orientation, and graceful recovery. WCAG 2.2 reinforces the same
              direction with alternatives for complex pointer gestures and
              dragging.
            </ReviewCard>
            <ReviewCard
              title="Motion is not a substitute for comparison."
              source="brehmer"
              stat="96 phones"
            >
              <SourceLink id="brehmer">Brehmer et al.</SourceLink> compared
              animation and small multiples for trend tasks on phones. Small
              multiples were consistently faster, even when accuracy depended on
              the specific comparison.
            </ReviewCard>
          </div>
        </section>

        <Technique
          number="01"
          title="Start with a density budget, not a resized dashboard"
          defaultLabel="Default technique"
          defaultText="Shrink the desktop chart, keep every axis tick, legend, series, hover, and label."
          betterLabel="Mobile technique"
          betterText="Rank the task, compress the evidence, direct-label the few live categories, and keep the full chart only when it still passes legibility constraints."
          basedOn={["mobilevisfixer", "cicero", "breakpoints"]}
        >
          <DensityBudgetDemo />
        </Technique>

        <Technique
          number="02"
          title="Use small multiples when the task is comparison"
          defaultLabel="Default technique"
          defaultText="Animate between states or hide series behind a picker, forcing the reader to remember the previous screen."
          betterLabel="Mobile technique"
          betterText="Stack comparable mini-views with identical scales. On phones, vertical space is cheaper than working memory."
          basedOn={["brehmer", "dupo"]}
        >
          <SmallMultiplesDemo />
        </Technique>

        <Technique
          number="03"
          title="Replace drag-only exploration with thumb-sized controls"
          defaultLabel="Default technique"
          defaultText="Assume mouse hover, tiny legends, drag brushes, and pinch gestures will be discoverable."
          betterLabel="Mobile technique"
          betterText="Expose the common queries as buttons, keep targets large, support single-pointer inspection, and make the selected state obvious."
          basedOn={["snyder", "wcag"]}
        >
          <TouchFirstDemo />
        </Technique>

        <Technique
          number="04"
          title="Let constraints choose the breakpoint"
          defaultLabel="Default technique"
          defaultText="Switch layouts at 600px because the site grid does."
          betterLabel="Mobile technique"
          betterText="Switch when the chart fails: text overlap, mark size, aspect ratio, tap spacing, and empty space are better triggers than viewport width alone."
          basedOn={["breakpoints", "mobilevisfixer", "review"]}
        >
          <ConstraintBreakpointDemo />
        </Technique>

        <Checklist />
        <SourceLedger />
      </div>
    </ExamplePageLayout>
  )
}

function PhoneTeaser() {
  return (
    <div className="mv-phone-shell" aria-hidden="true">
      <div className="mv-phone-top" />
      <div className="mv-phone-screen">
        <div className="mv-phone-head">
          <span>Today</span>
          <strong>64%</strong>
        </div>
        <div className="mv-phone-bars">
          {STATUS_DATA.map((item) => (
            <span key={item.label} style={{ height: `${item.value}%`, background: item.color }} />
          ))}
        </div>
        <div className="mv-phone-buttons">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}

function EvidenceStrip() {
  return (
    <section className="mv-evidence" aria-label="Mobile visualization evidence summary">
      <div>
        <span className="mv-evidence-stat">32.6%</span>
        <span>of audited mobile SVG charts had content outside the viewport.</span>
      </div>
      <div>
        <span className="mv-evidence-stat">31.5%</span>
        <span>had type that was too small to read after simple resizing.</span>
      </div>
      <div>
        <span className="mv-evidence-stat">24px / 44px</span>
        <span>WCAG target minimum and enhanced target sizes shape chart controls.</span>
      </div>
    </section>
  )
}

function ReviewCard({ title, stat, children }) {
  return (
    <article className="mv-review-card">
      <span>{stat}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  )
}

function Technique({
  number,
  title,
  defaultLabel,
  defaultText,
  betterLabel,
  betterText,
  basedOn,
  children,
}) {
  return (
    <section className="mv-technique" aria-labelledby={`mv-technique-${number}`}>
      <div className="mv-technique-copy">
        <span className="mv-technique-number">{number}</span>
        <h2 id={`mv-technique-${number}`}>{title}</h2>
        <div className="mv-before-after">
          <div>
            <strong>{defaultLabel}</strong>
            <p>{defaultText}</p>
          </div>
          <div>
            <strong>{betterLabel}</strong>
            <p>{betterText}</p>
          </div>
        </div>
        <div className="mv-based-on">
          Based on{" "}
          {basedOn.map((id, index) => (
            <React.Fragment key={id}>
              {index > 0 ? ", " : ""}
              <SourceLink id={id}>{sourceById(id).label}</SourceLink>
            </React.Fragment>
          ))}
          .
        </div>
      </div>
      <div className="mv-technique-demo">{children}</div>
    </section>
  )
}

function DensityBudgetDemo() {
  const [width, ref] = useResponsiveWidth(300, 760)
  const chartWidth = Math.max(300, Math.min(width - 28, 560))
  const compactWidth = Math.max(290, Math.min(width - 28, 430))

  return (
    <div className="mv-demo mv-density-demo" ref={ref}>
      <div className="mv-demo-panel mv-demo-panel-bad">
        <div className="mv-demo-label">Shrunk desktop view</div>
        <StreamXYFrame
          chartType="line"
          size={[chartWidth, 220]}
          data={LINE_SERIES}
          groupAccessor="series"
          xAccessor="week"
          yAccessor="value"
          showAxes={true}
          margin={{ left: 42, right: 18, top: 22, bottom: 48 }}
          lineStyle={(d) => {
            const datum = d.data || d
            return { stroke: datum.color || "#26334a", strokeWidth: 2, opacity: 0.76 }
          }}
        />
        <p>
          Three series, 32 weeks, full axes, hover-only details. It fits, but it
          spends the phone on scaffolding.
        </p>
      </div>
      <div className="mv-demo-panel mv-demo-panel-good">
        <div className="mv-demo-label">Mobile density budget</div>
        <div className="mv-status-cards">
          {STATUS_DATA.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}%</strong>
              <em className={item.delta >= 0 ? "is-up" : "is-down"}>
                {item.delta >= 0 ? "+" : ""}
                {item.delta} pts
              </em>
            </article>
          ))}
        </div>
        <StreamOrdinalFrame
          size={[compactWidth, 246]}
          data={RISK_BARS}
          projection="horizontal"
          chartType="bar"
          oAccessor="label"
          rAccessor="value"
          rExtent={[0, 130]}
          showAxes={true}
          margin={{ left: 118, right: 24, top: 18, bottom: 34 }}
          pieceStyle={(d) => {
            const datum = d.data || d
            return { fill: datum.color, stroke: "#19231f", strokeWidth: 1 }
          }}
          oLabel={true}
        />
        <p>
          The redesign leads with a ranked summary, then shows the failure audit.
          It keeps fewer marks but more decision value.
        </p>
      </div>
    </div>
  )
}

function SmallMultiplesDemo() {
  const [mode, setMode] = useState("multiples")
  const [active, setActive] = useState(0)
  const [width, ref] = useResponsiveWidth(290, 760)
  const cardWidth = Math.max(260, Math.min(width - 36, 360))
  const wideWidth = Math.max(290, Math.min(width - 34, 520))
  const animatedSeries = CITY_TRENDS[active]

  return (
    <div className="mv-demo" ref={ref}>
      <div className="mv-toggle-row" role="tablist" aria-label="Comparison mode">
        <button
          type="button"
          className={mode === "multiples" ? "is-active" : ""}
          onClick={() => setMode("multiples")}
        >
          Small multiples
        </button>
        <button
          type="button"
          className={mode === "animation" ? "is-active" : ""}
          onClick={() => setMode("animation")}
        >
          Animated substitute
        </button>
      </div>

      {mode === "multiples" ? (
        <div className="mv-multiples">
          {CITY_TRENDS.map((series) => (
            <article key={series.city} className="mv-multiple-card">
              <div>
                <strong>{series.city}</strong>
                <span>{series.note}</span>
              </div>
              <StreamXYFrame
                chartType="line"
                size={[cardWidth, 130]}
                data={series.data}
                xAccessor="week"
                yAccessor="value"
                yExtent={[10, 85]}
                showAxes={false}
                margin={{ left: 6, right: 8, top: 12, bottom: 12 }}
                lineStyle={{ stroke: series.color, strokeWidth: 3 }}
              />
            </article>
          ))}
        </div>
      ) : (
        <div className="mv-animation-panel">
          <div className="mv-segment-buttons">
            {CITY_TRENDS.map((series, index) => (
              <button
                type="button"
                key={series.city}
                className={active === index ? "is-active" : ""}
                onClick={() => setActive(index)}
              >
                {series.city}
              </button>
            ))}
          </div>
          <StreamXYFrame
            chartType="line"
            size={[wideWidth, 240]}
            data={animatedSeries.data}
            xAccessor="week"
            yAccessor="value"
            yExtent={[10, 85]}
            showAxes={true}
            margin={{ left: 42, right: 16, top: 18, bottom: 42 }}
            lineStyle={{ stroke: animatedSeries.color, strokeWidth: 4 }}
          />
          <p>
            This view is tidy, but every comparison depends on memory. The
            small-multiple version leaves all three traces visible at once.
          </p>
        </div>
      )}
    </div>
  )
}

function TouchFirstDemo() {
  const [segment, setSegment] = useState("Grocery")
  const [width, ref] = useResponsiveWidth(290, 760)
  const chartWidth = Math.max(292, Math.min(width - 30, 560))
  const selected = SEGMENTS.find((item) => item.id === segment)

  return (
    <div className="mv-demo mv-touch-demo" ref={ref}>
      <div className="mv-drag-anti-pattern" aria-hidden="true">
        <span>Drag brush only</span>
        <div>
          <i />
          <i />
        </div>
        <p>Easy to miss, hard to recover, and fragile for one-handed use.</p>
      </div>
      <div className="mv-touch-workbench">
        <div className="mv-segment-buttons" role="group" aria-label="Choose segment">
          {SEGMENTS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={segment === item.id ? "is-active" : ""}
              style={{ "--mv-accent": item.color }}
              onClick={() => setSegment(item.id)}
            >
              {item.id}
            </button>
          ))}
        </div>
        <StreamXYFrame
          chartType="scatter"
          size={[chartWidth, 270]}
          data={SCATTER_DATA}
          xAccessor="x"
          yAccessor="y"
          xExtent={[10, 95]}
          yExtent={[15, 90]}
          showAxes={true}
          margin={{ left: 42, right: 16, top: 18, bottom: 42 }}
          pointStyle={(d) => {
            const datum = d.data || d
            const active = datum.segment === segment
            return {
              fill: active ? selected.color : "#c9c1ae",
              stroke: active ? "#19231f" : "#f7efe0",
              strokeWidth: active ? 2 : 1,
              fillOpacity: active ? 0.95 : 0.34,
              r: active ? datum.radius + 2 : datum.radius,
            }
          }}
        />
        <div className="mv-readable-selection">
          <strong>{segment}</strong>
          <span>
            Selected with a visible button, not a hidden hover or precision drag.
          </span>
        </div>
      </div>
    </div>
  )
}

function ConstraintBreakpointDemo() {
  const [width, ref] = useResponsiveWidth(290, 880)
  const variant = useMemo(() => {
    if (width < 390) {
      return {
        id: "cards",
        label: "Card stack",
        reason: "Axis labels and tap targets would collide.",
      }
    }
    if (width < 620) {
      return {
        id: "spark",
        label: "Annotated sparkline",
        reason: "The trend is legible, but labels need to move outside the plot.",
      }
    }
    return {
      id: "full",
      label: "Full chart",
      reason: "Enough width for axes, marks, and direct annotation.",
    }
  }, [width])

  const chartWidth = Math.max(286, Math.min(width - 30, 660))
  const latest = BREAKPOINT_ROWS[BREAKPOINT_ROWS.length - 1]
  const peak = BREAKPOINT_ROWS.reduce((max, row) => (row.value > max.value ? row : max), BREAKPOINT_ROWS[0])

  return (
    <div className="mv-demo mv-breakpoint-demo" ref={ref}>
      <div className="mv-breakpoint-meter">
        <div>
          <span>Measured chart slot</span>
          <strong>{width}px</strong>
        </div>
        <div>
          <span>Active design</span>
          <strong>{variant.label}</strong>
        </div>
      </div>
      <p className="mv-breakpoint-reason">{variant.reason}</p>

      {variant.id === "cards" ? (
        <div className="mv-breakpoint-cards">
          <article>
            <span>Latest</span>
            <strong>{latest.value}</strong>
          </article>
          <article>
            <span>Peak</span>
            <strong>{peak.value}</strong>
          </article>
          <article>
            <span>Direction</span>
            <strong>Up</strong>
          </article>
        </div>
      ) : (
        <div className={`mv-breakpoint-chart mv-breakpoint-chart-${variant.id}`}>
          <StreamXYFrame
            chartType="line"
            size={[chartWidth, variant.id === "spark" ? 190 : 290]}
            data={BREAKPOINT_ROWS}
            xAccessor="week"
            yAccessor="value"
            yExtent={[30, 86]}
            showAxes={variant.id === "full"}
            margin={
              variant.id === "full"
                ? { left: 44, right: 22, top: 28, bottom: 42 }
                : { left: 8, right: 8, top: 16, bottom: 16 }
            }
            lineStyle={{ stroke: "#1f8a70", strokeWidth: variant.id === "full" ? 4 : 3 }}
          />
          {variant.id === "spark" ? (
            <div className="mv-spark-note">
              <strong>{latest.value}</strong>
              <span>latest value, shown outside the plot</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Checklist() {
  return (
    <section className="mv-checklist" aria-labelledby="mv-checklist-title">
      <div className="mv-section-label">Practical checklist</div>
      <h2 id="mv-checklist-title">A mobile chart should pass these tests before it ships</h2>
      <ol>
        <li>
          <strong>Readability:</strong> labels, values, and annotations remain legible without pinch zoom.
        </li>
        <li>
          <strong>Task preservation:</strong> the mobile version preserves the intended comparison or decision, not the desktop geometry.
        </li>
        <li>
          <strong>Touch path:</strong> visible targets answer the primary questions without requiring hover, drag, or hidden gestures.
        </li>
        <li>
          <strong>Density budget:</strong> every axis, legend, and mark earns its pixels against a card, annotation, or small multiple.
        </li>
        <li>
          <strong>Constraint breakpoint:</strong> the layout changes when the visualization fails, not when a generic CSS breakpoint says so.
        </li>
      </ol>
    </section>
  )
}

function SourceLedger() {
  return (
    <section className="mv-sources" aria-labelledby="mv-sources-title">
      <div className="mv-section-label">Sources</div>
      <h2 id="mv-sources-title">Reference ledger</h2>
      <div className="mv-source-grid">
        {SOURCE_LINKS.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="mv-source-card">
            <span>{source.year}</span>
            <strong>{source.label}</strong>
            <em>{source.authors}</em>
            <p>{source.claim}</p>
          </a>
        ))}
      </div>
    </section>
  )
}
