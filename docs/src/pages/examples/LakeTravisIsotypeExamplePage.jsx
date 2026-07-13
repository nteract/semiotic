import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { XYCustomChart } from "semiotic/xy"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { NetworkCustomChart } from "semiotic/network"
import { GeoCustomChart } from "semiotic/geo"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  ISOTYPE,
  IsotypeGlyph,
  IsotypeUnitRow,
  basinIsotypeLayout,
  forecastIsotypeLayout,
  lakeLevelIsotypeLayout,
  unwrapIsotypeDatum,
  watershedIsotypeLayout,
} from "./isotypeCharts.jsx"
import "./LakeTravisIsotypeExamplePage.css"

const FULL_POOL = 681
const SNAPSHOT_LEVEL = 672.1
const SNAPSHOT_CAPACITY = 85.6
const STREAM_WINDOW = 24

const INITIAL_LEVELS = [
  672.42, 672.38, 672.36, 672.33, 672.31, 672.28, 672.27, 672.25, 672.24, 672.23,
  672.2, 672.18, 672.17, 672.15, 672.14, 672.12, 672.11, 672.12, 672.1,
].map((level, index) => ({
  id: `seed-${index}`,
  tick: index,
  level,
  label: `Reading ${index + 1}`,
  note: `${level.toFixed(2)} feet above mean sea level`,
}))

const FORECAST = [
  { id: "thu", day: "THU", high: 96, low: 75, rainChance: 10, label: "Thursday", note: "Sunny, high 96°, low 75°" },
  { id: "fri", day: "FRI", high: 97, low: 76, rainChance: 10, label: "Friday", note: "Sunny, high 97°, low 76°" },
  { id: "sat", day: "SAT", high: 98, low: 75, rainChance: 20, label: "Saturday", note: "Mostly sunny, high 98°, low 75°" },
  { id: "sun", day: "SUN", high: 97, low: 76, rainChance: 30, label: "Sunday", note: "Partly cloudy, high 97°, low 76°" },
  { id: "mon", day: "MON", high: 96, low: 76, rainChance: 40, label: "Monday", note: "Chance of rain, high 96°, low 76°" },
  { id: "tue", day: "TUE", high: 97, low: 77, rainChance: 20, label: "Tuesday", note: "Mostly sunny, high 97°, low 77°" },
  { id: "wed", day: "WED", high: 99, low: 78, rainChance: 10, label: "Wednesday", note: "Hot and sunny, high 99°, low 78°" },
]

const WATERSHED_NODES = [
  { id: "rain", label: "Hill Country rain", kind: "rain", color: ISOTYPE.blue, value: "UPSTREAM INPUT", note: "Rain over the Highland Lakes watershed" },
  { id: "tributaries", label: "Tributaries", kind: "hill", color: ISOTYPE.green, value: "COLORADO RIVER", note: "Runoff moves through upstream tributaries" },
  { id: "lake", label: "Lake Travis", kind: "lake", color: ISOTYPE.blue, value: "85.6% FULL", note: "The reservoir stores water and moderates floods" },
  { id: "dam", label: "Mansfield Dam", kind: "dam", color: ISOTYPE.ink, value: "CONTROLLED FLOW", note: "Mansfield Dam regulates downstream releases" },
  { id: "austin", label: "Austin", kind: "city", color: ISOTYPE.red, value: "DOWNSTREAM", note: "Water continues through the Colorado River corridor" },
]

const WATERSHED_EDGES = [
  { source: "rain", target: "tributaries", label: "rain becomes runoff" },
  { source: "tributaries", target: "lake", label: "tributaries enter Lake Travis" },
  { source: "lake", target: "dam", label: "stored water reaches Mansfield Dam" },
  { source: "dam", target: "austin", label: "managed releases move downstream" },
]

const BASIN_POINTS = [
  { id: "burnet", label: "Burnet County", lon: -98.23, lat: 30.73, kind: "rain", color: ISOTYPE.blue, note: "Upstream watershed" },
  { id: "marble", label: "Marble Falls", lon: -98.27, lat: 30.58, kind: "hill", color: ISOTYPE.green, note: "Colorado River enters the lower Highland Lakes" },
  { id: "travis", label: "Lake Travis", lon: -97.99, lat: 30.45, kind: "lake", color: ISOTYPE.blue, note: "Current level 672.1 feet" },
  { id: "mansfield", label: "Mansfield Dam", lon: -97.91, lat: 30.39, kind: "dam", color: ISOTYPE.ink, note: "Full pool is 681 feet" },
  { id: "austin", label: "Austin", lon: -97.74, lat: 30.27, kind: "city", color: ISOTYPE.red, note: "Downstream on the Colorado River" },
]

const implementationCode = `import { XYCustomChart } from "semiotic/xy"
import { NetworkCustomChart } from "semiotic/network"
import { GeoCustomChart } from "semiotic/geo"

// The watershed pictograms ARE the marks: interactive glyph scene nodes
// stamped from one shared GlyphDef sign set — canvas-painted, hit-tested,
// keyboard-navigable, no separate hit target.
sceneNodes: nodes.map((node) => ({
  type: "glyph",
  cx: positions[node.id].x,
  cy: positions[node.id].y + 24,   // feet-anchored signs stand on cy
  size: 48,
  glyph: isotypeGlyphDef(node.kind),
  color: node.color,
  style: {}, datum: node, id: node.id, label: node.label,
}))

// The streaming level chart keeps point nodes (they carry pulse/decay),
// pushed through the frame's windowed ingestion:
<XYCustomChart
  ref={levelRef}
  layout={lakeLevelIsotypeLayout}
  layoutConfig={{ levelDomain: [671.7, 672.45] }}
  enableHover
  accessibleTable
  onObservation={inspect}
  frameProps={{
    windowSize: 24,
    pointIdAccessor: "id",
    decay: { type: "linear", minOpacity: 0.38 },
    pulse: { duration: 900, color: "#d72f3f", glowRadius: 7 },
    staleness: { threshold: 7000, showBadge: true }
  }}
/>
levelRef.current.push({ id: crypto.randomUUID(), level: nextSensorReading })`

export default function LakeTravisIsotypeExamplePage() {
  const levelRef = useRef(null)
  const tickRef = useRef(INITIAL_LEVELS.length)
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const [streaming, setStreaming] = useState(true)
  const [currentLevel, setCurrentLevel] = useState(SNAPSHOT_LEVEL)
  const [readingCount, setReadingCount] = useState(INITIAL_LEVELS.length)
  const [inspection, setInspection] = useState({
    label: "Lake Travis",
    value: "672.1 ft",
    note: "Move across any chart to inspect the data carried by its symbols.",
  })

  const compact = pageWidth < 820
  const fullWidth = Math.max(272, pageWidth - (compact ? 48 : 92))
  const halfWidth = compact
    ? Math.max(292, pageWidth - 28)
    : Math.max(360, Math.floor(pageWidth / 2 - 56))

  useEffect(() => {
    const bootstrap = window.setTimeout(() => {
      levelRef.current?.pushMany(INITIAL_LEVELS)
    }, 0)
    return () => window.clearTimeout(bootstrap)
  }, [])

  useEffect(() => {
    if (!streaming) return undefined
    const interval = window.setInterval(() => {
      const tick = tickRef.current
      const level = Number(
        (
          SNAPSHOT_LEVEL +
          Math.sin(tick * 0.73) * 0.028 +
          Math.cos(tick * 0.31) * 0.012 -
          (tick - INITIAL_LEVELS.length) * 0.0007
        ).toFixed(3),
      )
      const reading = {
        id: `live-${tick}`,
        tick,
        level,
        label: "Sensor reading",
        note: `${level.toFixed(3)} feet in the illustrative live replay`,
      }
      levelRef.current?.push(reading)
      tickRef.current += 1
      setCurrentLevel(level)
      setReadingCount((count) => count + 1)
    }, 2400)
    return () => window.clearInterval(interval)
  }, [streaming])

  const inspect = useCallback((observation) => {
    if (observation.type !== "hover" || !observation.datum) return
    const datum = unwrapIsotypeDatum(observation.datum)
    if (!datum) return
    const value =
      datum.level != null
        ? `${Number(datum.level).toFixed(2)} ft`
        : datum.high != null
          ? `${datum.high}° / ${datum.low}°`
          : datum.value || datum.label
    setInspection({
      label: datum.label || datum.id || "Chart mark",
      value,
      note: datum.note || datum.label || "Data-bearing ISOTYPE mark",
    })
  }, [])

  const levelTooltip = useCallback((hover) => {
    const datum = unwrapIsotypeDatum(hover)
    if (datum?.level == null) return null
    return (
      <div className="lake-isotype__tooltip">
        <strong>{Number(datum.level).toFixed(3)} ft</strong>
        <span>{datum.note}</span>
      </div>
    )
  }, [])

  const genericTooltip = useCallback((hover) => {
    const datum = unwrapIsotypeDatum(hover)
    if (!datum?.label) return null
    return (
      <div className="lake-isotype__tooltip">
        <strong>{datum.label}</strong>
        <span>{datum.note || datum.value}</span>
      </div>
    )
  }, [])

  const levelSummary = useMemo(
    () =>
      `${currentLevel.toFixed(2)} feet above mean sea level, ${(FULL_POOL - currentLevel).toFixed(1)} feet below full pool.`,
    [currentLevel],
  )

  return (
    <ExamplePageLayout title="Lake Travis, in Signs">
      <p className="lake-isotype__lede">
        A live lake dashboard remade with the visual grammar of ISOTYPE: repeated symbols instead
        of enlarged ones, a small printing palette, direct labels, and diagrams that read as
        explanations. Underneath the ink, four Semiotic custom frames retain streaming ingestion,
        keyboard-readable data, tooltips, observation events, and stable mark identity.
      </p>

      <div className="lake-isotype" ref={pageRef}>
        <header className="lake-isotype__masthead">
          <div>
            <div className="lake-isotype__eyebrow">CENTRAL TEXAS WATER PICTURE · JULY 2, 2026</div>
            <h2>How much water is in Lake Travis?</h2>
            <p>
              One dam sign represents ten percent of conservation capacity. A partial sign is a
              partial ten percent—icons repeat; they do not grow.
            </p>
          </div>
          <div className="lake-isotype__mark" aria-hidden="true">
            <StaticGlyph kind="dam" size={62} color={ISOTYPE.red} />
            <span>ISOTYPE<br />LAKE REPORT</span>
          </div>
        </header>

        <section className="lake-isotype__hero" aria-labelledby="lake-level-heading">
          <div className="lake-isotype__hero-copy">
            <span className="lake-isotype__section-number">01</span>
            <div>
              <div className="lake-isotype__kicker">CURRENT LAKE LEVEL</div>
              <h3 id="lake-level-heading">{currentLevel.toFixed(1)} <small>FEET</small></h3>
              <p>
                <strong>{(FULL_POOL - currentLevel).toFixed(1)} feet below full pool.</strong>{" "}
                Full pool is {FULL_POOL} feet above mean sea level.
              </p>
            </div>
          </div>
          <div className="lake-isotype__capacity">
            <IsotypeUnitRow
              value={SNAPSHOT_CAPACITY}
              unit={10}
              maxIcons={10}
              kind="dam"
              color={ISOTYPE.blue}
              emptyColor={ISOTYPE.paperDeep}
              iconSize={44}
              gap={6}
              idPrefix="lake-capacity"
              label={`${SNAPSHOT_CAPACITY} percent full; each dam symbol represents ten percent`}
            />
            <div className="lake-isotype__capacity-label">
              <strong>{SNAPSHOT_CAPACITY}% FULL</strong>
              <span>EACH SIGN = 10% OF CONSERVATION CAPACITY</span>
            </div>
          </div>
        </section>

        <div className="lake-isotype__snapshot" aria-label="Today's conditions">
          <SnapshotItem kind="thermometer" color={ISOTYPE.yellow} value="83°F" label="WATER TEMP" />
          <SnapshotItem kind="sun" color={ISOTYPE.yellow} value="96°F" label="AIR · SUNNY" />
          <SnapshotItem kind="wind" color={ISOTYPE.blue} value="SE 5" label="MILES PER HOUR" />
          <SnapshotItem kind="water" color={ISOTYPE.red} value="−0.13" label="FEET TODAY" />
        </div>

        <aside className="lake-isotype__inspection" aria-live="polite">
          <span>INSPECTION</span>
          <strong>{inspection.label}</strong>
          <b>{inspection.value}</b>
          <p>{inspection.note}</p>
        </aside>

        <div className="lake-isotype__panel-grid">
          <section className="lake-isotype__panel lake-isotype__panel--level">
            <PanelHeading
              number="02"
              eyebrow="PUSHED SENSOR READINGS"
              title="The lake moves by inches"
              note="The checked-in snapshot seeds the chart. New illustrative readings enter through ref.push(), with a 24-reading window, pulse, decay, and staleness handled by the frame."
            />
            <div className="lake-isotype__stream-control">
              <button type="button" onClick={() => setStreaming((value) => !value)} aria-pressed={streaming}>
                <span className={streaming ? "is-live" : ""} />
                {streaming ? "Pause sensor replay" : "Resume sensor replay"}
              </button>
              <span>{readingCount} readings received</span>
            </div>
            <XYCustomChart
              ref={levelRef}
              layout={lakeLevelIsotypeLayout}
              layoutConfig={{ levelDomain: [671.7, 672.45] }}
              width={halfWidth}
              height={330}
              margin={{ top: 10, right: 8, bottom: 10, left: 8 }}
              enableHover
              accessibleTable
              onObservation={inspect}
              tooltip={levelTooltip}
              description="An illustrative streaming sequence of Lake Travis level readings drawn as a red path with repeated blue water signs."
              summary={levelSummary}
              frameProps={{
                background: "transparent",
                windowSize: STREAM_WINDOW,
                pointIdAccessor: "id",
                decay: { type: "linear", minOpacity: 0.38 },
                pulse: { duration: 900, color: ISOTYPE.red, glowRadius: 7 },
                staleness: { threshold: 7000, showBadge: true, badgePosition: "top-right" },
              }}
            />
          </section>

          <section className="lake-isotype__panel">
            <PanelHeading
              number="03"
              eyebrow="SEVEN-DAY WEATHER"
              title="Heat above; rain below"
              note="Two temperature strips preserve the old ISOTYPE weather-page logic. Five small blocks below each day encode rain chance in twenty-point units."
            />
            <OrdinalCustomChart
              data={FORECAST}
              layout={forecastIsotypeLayout}
              categoryAccessor="day"
              valueAccessor="high"
              oExtent={FORECAST.map((day) => day.day)}
              width={halfWidth}
              height={330}
              margin={{ top: 10, right: 8, bottom: 10, left: 8 }}
              enableHover
              accessibleTable
              onObservation={inspect}
              description="A seven-day Lakeway forecast using sun and rain pictograms, paired high and low temperature strips, and five-unit rain probability blocks."
              summary="High temperatures range from 96 to 99 degrees, with the largest rain chance on Monday."
              frameProps={{
                background: "transparent",
                tooltipContent: genericTooltip,
              }}
            />
          </section>
        </div>

        <section className="lake-isotype__wide-panel">
          <PanelHeading
            number="04"
            eyebrow="THE WATERSHED AS A PROCESS"
            title="Trace rainfall through the watershed"
            note="The lake level is a network result: upstream weather, tributaries, reservoir storage, dam operations, and downstream demand. Each node and flow remains a navigable network datum."
          />
          <NetworkCustomChart
            nodes={WATERSHED_NODES}
            edges={WATERSHED_EDGES}
            layout={watershedIsotypeLayout}
            width={fullWidth}
            height={360}
            margin={{ top: 8, right: 18, bottom: 24, left: 18 }}
            enableHover
            accessibleTable
            onObservation={inspect}
            description="A left-to-right process diagram showing Hill Country rain becoming tributary runoff, entering Lake Travis, passing Mansfield Dam, and continuing toward Austin."
            summary="Lake Travis sits between upstream rainfall and managed downstream releases."
            frameProps={{
              background: "transparent",
              tooltipContent: genericTooltip,
            }}
          />
        </section>

        <section className="lake-isotype__wide-panel lake-isotype__wide-panel--map">
          <PanelHeading
            number="05"
            eyebrow="GEOGRAPHIC CONTEXT"
            title="Follow the Colorado downhill"
            note="The GeoFrame resolves the projection and hit testing. The shared pictograms sit at approximate basin locations, while the directional route is an SVG overlay in the same projected coordinate space."
          />
          <GeoCustomChart
            points={BASIN_POINTS}
            projection="mercator"
            layout={basinIsotypeLayout}
            layoutConfig={{ routes: ["burnet", "marble", "travis", "mansfield", "austin"] }}
            width={fullWidth}
            height={380}
            margin={{ top: 34, right: 52, bottom: 38, left: 52 }}
            enableHover
            accessibleTable
            onObservation={inspect}
            tooltip={genericTooltip}
            description="A simplified geographic sequence from the upstream Highland Lakes watershed through Lake Travis and Mansfield Dam to Austin."
            summary="Five projected places establish the upstream-to-downstream context for the lake report."
            frameProps={{ background: "transparent", fitPadding: 0.12 }}
          />
          <p className="lake-isotype__map-note">
            Schematic basin context; symbol placement is approximate and is not a navigational map.
          </p>
        </section>

        <section className="lake-isotype__resources">
          <h3>Plan a day at the lake</h3>
          <div>
            <Resource kind="boat" title="Boating" copy="Check ramp elevation before towing." />
            <Resource kind="water" title="Swimming" copy="Check current water-quality notices." />
            <Resource kind="hill" title="Paddling" copy="Wind and heat change quickly." />
            <Resource kind="dam" title="Lake facts" copy="Full pool is 681 feet MSL." />
          </div>
        </section>

        <footer className="lake-isotype__source">
          <strong>ABOUT THE NUMBERS</strong>
          <p>
            This deterministic example is seeded from the July 2, 2026 public snapshot on{" "}
            <a href="https://laketraviswater.com/" target="_blank" rel="noopener noreferrer">
              Lake Travis Water
            </a>
            . Its continuing “sensor” values are clearly labeled as an illustrative replay so the
            example remains stable in tests and does not turn a public website into a build-time
            dependency. Operational decisions should use current{" "}
            <a href="https://hydromet.lcra.org/" target="_blank" rel="noopener noreferrer">
              LCRA Hydromet
            </a>{" "}
            and{" "}
            <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">
              National Weather Service
            </a>{" "}
            reports.
          </p>
        </footer>
      </div>

      <section className="lake-isotype__editorial">
        <h2>Four frames, one symbol language</h2>
        <p>
          The visual richness is deliberately outside the built-in chart catalog, but the data
          plumbing is not. One shared <code>GlyphDef</code> sign set renders three ways: as
          interactive <code>glyph</code> scene nodes in the watershed and basin charts (the
          pictogram is the mark — hit-tested, focus-ringed, canvas-painted), through the
          library&rsquo;s <code>&lt;Glyph&gt;</code> for chart chrome, and via{" "}
          <code>unitize</code>-allocated unit rows for the capacity strip. Semiotic exposes the
          accessible table, observes hover and focus, keeps stable mark identity, and runs the
          streaming buffer without ever knowing how to draw a dam sign.
        </p>
        <CodeBlock language="jsx" showCopyButton code={implementationCode} />
      </section>
    </ExamplePageLayout>
  )
}

function SnapshotItem({ kind, color, value, label }) {
  return (
    <div className="lake-isotype__snapshot-item">
      <StaticGlyph kind={kind} size={44} color={color} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function PanelHeading({ number, eyebrow, title, note }) {
  return (
    <header className="lake-isotype__panel-heading">
      <span>{number}</span>
      <div>
        <b>{eyebrow}</b>
        <h3>{title}</h3>
        <p>{note}</p>
      </div>
    </header>
  )
}

function Resource({ kind, title, copy }) {
  return (
    <article>
      <StaticGlyph kind={kind} size={48} color={ISOTYPE.ink} />
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </article>
  )
}

function StaticGlyph({ kind, size, color }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <IsotypeGlyph kind={kind} size={40} color={color} />
    </svg>
  )
}
