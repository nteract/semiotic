import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { XYCustomChart } from "../../../../src/components/charts/custom/XYCustomChart"
import { NetworkCustomChart } from "../../../../src/components/charts/custom/NetworkCustomChart"
import { OrdinalCustomChart } from "../../../../src/components/charts/custom/OrdinalCustomChart"
import {
  EXPERIMENTAL_GOFISH_ADAPTER_NAME,
  unstable_fromGofishIR,
  unstable_gofishBobaIR as bobaIR,
  unstable_gofishBottleIR as bottleIR,
  unstable_gofishFlowerIR as flowerIR,
  unstable_gofishPolarRibbonIR as polarRibbonIR,
  unstable_gofishPythonMemoryIR as pythonMemoryIR,
  unstable_gofishTitanicCircleTreemapIR as titanicCircleTreemapIR,
} from "../../../../src/components/semiotic-experimental"
import {
  buildTooltipEntries,
  extractTooltipDatum,
  formatTooltipValue,
} from "semiotic/recipes"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

// Each demo is now driven by a serialized GoFish Frontend IR document. The page
// runs the IR through `unstable_fromGofishIR` to obtain the layout, accessor config, and
// inline data — there is no hand-maintained chart data on this page anymore.
const irByKey = {
  flower: flowerIR,
  bottle: bottleIR,
  polar: polarRibbonIR,
  titanic: titanicCircleTreemapIR,
  python: pythonMemoryIR,
  boba: bobaIR,
}

// Push seeds for the bottle "update existing object" demo. The ids match the
// categories in the bottle IR's inline data.
const bottleData = [
  { id: "planning", category: "Planning", amount: 64 },
  { id: "design", category: "Design", amount: 82 },
  { id: "build", category: "Build", amount: 46 },
  { id: "review", category: "Review", amount: 71 },
  { id: "ship", category: "Ship", amount: 55 },
]

// The boba volume sliders edit the last cup on the menu (the IR's final row).
// Read its name + original volumes from the IR so the controls stay in sync if
// the spec changes.
const bobaCupRows = bobaIR?.root?.data?.rows ?? []
const lastBobaCup = bobaCupRows[bobaCupRows.length - 1] ?? {}
const lastBobaCupName = lastBobaCup.name ?? "the last cup"
const bobaVolumeDefaults = {
  bobaTeaVolume: Number(lastBobaCup.teaVolume) || 660,
  bobaBobaVolume: Number(lastBobaCup.bobaVolume) || 150,
  bobaIceVolume: Number(lastBobaCup.iceVolume) || 120,
}

// IR docs can carry large inline datasets (Titanic). Abridge long `rows`
// arrays so the spec stays readable when shown in the page.
function irForDisplay(doc) {
  const clone = JSON.parse(JSON.stringify(doc))
  const abridge = (node) => {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node.charts)) node.charts.forEach(abridge)
    if (node.data && Array.isArray(node.data.rows) && node.data.rows.length > 6) {
      const total = node.data.rows.length
      node.data.rows = [...node.data.rows.slice(0, 3), `…and ${total - 3} more rows`]
    }
  }
  abridge(clone.root)
  return JSON.stringify(clone, null, 2)
}

// The memory diagram threads its whole snapshot through `layoutConfig.diagram`;
// summarise it rather than dumping it when showing the resolved config.
function stripDataFromConfig(config) {
  const out = {}
  for (const [key, value] of Object.entries(config)) {
    out[key] = value && typeof value === "object" ? "{…}" : value
  }
  return out
}

// Apply an interactive control to the IR itself (the spec), so the interpreter
// re-renders the edit rather than reading a separate config the interpreter
// ignores. Flower: the petal-radius slider sets the polar layer's radiusFactor.
function applyControlsToIR(active, controls) {
  const base = irByKey[active] ?? flowerIR
  if (active !== "flower") return base
  const doc = JSON.parse(JSON.stringify(base))
  const polarLayer = (doc.root.mark.children || []).find(
    (c) => c.options && c.options.coord && c.options.coord.type === "polar",
  )
  if (polarLayer) {
    polarLayer.options = { ...polarLayer.options, radiusFactor: controls.flowerRadius / 30 }
  }
  return doc
}

const demoOrder = ["flower", "bottle", "polar", "titanic", "python", "boba"]

function initialDemoKey() {
  if (typeof window === "undefined") return "flower"
  const key = window.location.hash.replace(/^#/, "")
  return demoOrder.includes(key) ? key : "flower"
}

const demoLabels = {
  flower: "Flower chart",
  bottle: "Bottle fill",
  polar: "Polar ribbon",
  titanic: "Fare circle treemap",
  python: "Python memory",
  boba: "Boba cups",
}

const gofishLinks = {
  flower: "https://gofish.graphics/js/examples/flower-chart.html",
  bottle: "https://gofish.graphics/js/examples/bottle-fill-chart.html",
  polar: "https://gofish.graphics/js/examples/polar-ribbon-chart.html",
  titanic: "https://gofish.graphics/js/examples/titanic-fare-circle-treemap.html",
  python: "https://gofish.graphics/js/examples/python-tutor-memory-diagram.html",
  boba: "https://observablehq.com/@kristw/boba-science",
}

const chartColors = ["#4e79a7", "#f28e2c", "#59a14f", "#e15759", "#b07aa1", "#76b7b2"]

function buildPushedDatum(active, tick) {
  const lakes = ["Erie", "Huron", "Michigan", "Ontario", "Superior"]
  const species = ["Walleye", "Perch", "Trout"]
  if (active === "flower" || active === "polar") {
    const lakeIndex = tick % lakes.length
    return {
      id: `${active}-push-${tick}`,
      lake: lakes[lakeIndex],
      species: species[(tick + lakeIndex) % species.length],
      count: 8 + ((tick * 7) % 24),
      x: lakeIndex,
    }
  }
  if (active === "bottle") {
    return {
      id: bottleData[tick % bottleData.length].id,
      category: bottleData[tick % bottleData.length].category,
      amount: 35 + ((tick * 17) % 58),
    }
  }
  if (active === "boba") {
    const cups = ["Classic", "Extra Boba", "Light Ice", "Mega"]
    return {
      name: cups[tick % cups.length],
      bobaVolume: 80 + ((tick * 47) % 220),
    }
  }
  return {
    id: `passenger-push-${tick}`,
    name: `pushed-${tick}`,
    pclass: (tick % 3) + 1,
    survived: tick % 4 !== 0,
    fare: 7 + ((tick * 13) % 84),
  }
}

// Per-demo presentation metadata. The layout, accessor config, and data all
// come from `unstable_fromGofishIR`; this only carries chrome and the visual controls
// the page layers on top of the IR-derived accessors.
const demoMeta = {
  flower: {
    height: 380,
    margin: { top: 20, right: 24, bottom: 42, left: 24 },
    visualConfig: (c) => ({ flowerRadius: c.flowerRadius, stemWidth: 5 }),
    question:
      "Can a GoFish grouped glyph become a Semiotic custom chart without a one-off renderer?",
    contract:
      "The solver groups seafood by lake, keeps stem totals as data-bearing rect hit targets, and renders visible stems and petal glyphs as keyed overlays.",
  },
  bottle: {
    height: 360,
    margin: { top: 18, right: 50, bottom: 34, left: 18 },
    visualConfig: (c) => ({ bottleHeight: c.bottleHeight }),
    question: "Can a custom pictorial mark expose one useful hit target per bottle?",
    contract:
      "The bottle silhouette, liquid, label, and fill line are SVG overlay chrome. A transparent rect per bottle stays in the Semiotic scene graph for hover, selection, SSR evidence, and transitions.",
  },
  polar: {
    height: 430,
    margin: { top: 20, right: 40, bottom: 20, left: 40 },
    visualConfig: (c) => ({ innerRadius: c.innerRadius, outerRadius: c.outerRadius }),
    question: "Can grouped polar bars and cross-species ribbons share one stable layout?",
    contract:
      "The radial bars and ribbons are glyph overlays generated from a GoFish-style grouping pass. Each bar also emits a data-bearing point node at its polar midpoint.",
  },
  titanic: {
    height: 430,
    margin: { top: 18, right: 18, bottom: 18, left: 18 },
    visualConfig: (c) => ({ padding: c.treemapPadding }),
    question: "Can a treemap tile layout carry non-rectangular passenger marks?",
    contract:
      "A treemap of treemaps: an outer squarified treemap sizes one rectangle per passenger class by total fare, and an inner squarified treemap gives each passenger a fare-sized cell rendered as an inscribed circle — each a data-bearing point node coloured by survival.",
  },
  python: {
    height: 330,
    margin: { top: 16, right: 16, bottom: 16, left: 16 },
    visualConfig: (c) => ({ heapGap: c.heapGap }),
    question: "Can custom layout handle semantic diagrams, not only statistical charts?",
    contract:
      "Stack bindings and heap cells become NetworkFrame rect nodes. Pointer references become curved network edges with bezier caches, so Semiotic can run particles along them.",
  },
  boba: {
    height: 360,
    margin: { top: 12, right: 16, bottom: 16, left: 16 },
    visualConfig: (c) => ({ cupWidthRatio: c.cupWidth }),
    question: "Can an ordinal frame render a menu of bespoke, data-driven pictorial glyphs as separate categories?",
    contract:
      "Each drink is one ordinal item on the band scale. Its tea + tapioca + ice volumes (plus cup-size params) add up to a drink height the derive lambda solves; the cups share one scale and a baseline so they read as a menu on a shelf. A transparent hit rect per cup carries the volumes and pearl/ice counts into the scene graph; the cup outline, tea, tapioca pearls, ice, lid, and straw are keyed SVG overlays. The tea / boba / ice sliders edit the last cup's volumes; because the layout re-runs the derive over the live buffer, each edit re-solves and re-renders that cup's tea fill, pearl bed, and ice in place.",
  },
}

// Merge the IR-derived adapter config with the per-demo chrome and the visual
// controls. `cfg` is the memoized `unstable_fromGofishIR` output (kept stable per demo
// so slider drags don't re-parse the IR or regenerate inline data).
function getDemo(active, controls, cfg) {
  const meta = demoMeta[active] ?? demoMeta.flower
  return {
    ...meta,
    kind: cfg.family,
    recipe: cfg.recipe,
    data: cfg.data,
    graph: cfg.graph,
    layout: cfg.layout,
    networkLayout: cfg.networkLayout,
    ordinalLayout: cfg.ordinalLayout,
    categoryAccessor: cfg.categoryAccessor,
    valueAccessor: cfg.valueAccessor,
    warnings: cfg.warnings,
    layoutConfig: { ...cfg.layoutConfig, ...meta.visualConfig(controls) },
  }
}

// Returns the ordered list of slider controls for the active demo. Most demos
// have a single visual control; boba adds three data controls that edit the
// last cup's tea / boba / ice volumes.
function getControls(active, controls, setControls) {
  const update = (key) => (event) =>
    setControls((prev) => ({ ...prev, [key]: Number(event.target.value) }))
  if (active === "flower") {
    return [
      {
        key: "flowerRadius",
        label: "Petal radius",
        value: controls.flowerRadius,
        min: 22,
        max: 48,
        onChange: update("flowerRadius"),
        suffix: "px",
      },
    ]
  }
  if (active === "bottle") {
    return [
      {
        key: "bottleHeight",
        label: "Bottle height",
        value: controls.bottleHeight,
        min: 150,
        max: 260,
        onChange: update("bottleHeight"),
        suffix: "px",
      },
    ]
  }
  if (active === "polar") {
    return [
      {
        key: "outerRadius",
        label: "Outer radius",
        value: controls.outerRadius,
        min: 112,
        max: 178,
        onChange: update("outerRadius"),
        suffix: "px",
      },
    ]
  }
  if (active === "titanic") {
    return [
      {
        key: "treemapPadding",
        label: "Treemap padding",
        value: controls.treemapPadding,
        min: 0,
        max: 6,
        step: 0.5,
        onChange: update("treemapPadding"),
        suffix: "px",
      },
    ]
  }
  if (active === "boba") {
    return [
      {
        key: "cupWidth",
        label: "Cup width",
        value: controls.cupWidth,
        min: 0.6,
        max: 1,
        step: 0.01,
        onChange: update("cupWidth"),
        suffix: "× band",
      },
      {
        key: "bobaTeaVolume",
        label: `${lastBobaCupName} tea`,
        value: controls.bobaTeaVolume,
        min: 0,
        max: 800,
        step: 10,
        onChange: update("bobaTeaVolume"),
        suffix: " ml",
      },
      {
        key: "bobaBobaVolume",
        label: `${lastBobaCupName} boba`,
        value: controls.bobaBobaVolume,
        min: 0,
        max: 400,
        step: 5,
        onChange: update("bobaBobaVolume"),
        suffix: " ml",
      },
      {
        key: "bobaIceVolume",
        label: `${lastBobaCupName} ice`,
        value: controls.bobaIceVolume,
        min: 0,
        max: 250,
        step: 5,
        onChange: update("bobaIceVolume"),
        suffix: " ml",
      },
    ]
  }
  return [
    {
      key: "heapGap",
      label: "Heap gap",
      value: controls.heapGap,
      min: 4,
      max: 34,
      onChange: update("heapGap"),
      suffix: "px",
    },
  ]
}

function extractObservedDatum(obs) {
  return extractTooltipDatum(obs)
}

function GoFishTooltip(hover) {
  const entries = buildTooltipEntries(hover, { maxEntries: 8 })
  if (!entries.length) return null
  return (
    <div
      className="semiotic-tooltip"
      style={{
        background: "var(--semiotic-tooltip-bg, var(--surface-1, #fff))",
        color: "var(--semiotic-tooltip-color, var(--text-primary, #222))",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--semiotic-tooltip-border, var(--border-color, #d8dee4))",
        borderRadius: 6,
        boxShadow: "var(--semiotic-tooltip-shadow, 0 2px 10px rgba(0,0,0,0.16))",
        padding: "8px 10px",
        fontSize: 12,
        maxWidth: 260,
      }}
    >
      {entries.map((entry) => (
        <div
          key={entry.key}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(62px, auto) 1fr",
            columnGap: 8,
            rowGap: 4,
            overflowWrap: "anywhere",
          }}
        >
          <strong>{entry.label}</strong>
          <span>{entry.formatted}</span>
        </div>
      ))}
    </div>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: active ? "var(--semiotic-primary, #4e79a7)" : "var(--border-color, #d8dee4)",
        background: active ? "var(--semiotic-primary, #4e79a7)" : "var(--surface-1, #fff)",
        color: active ? "#fff" : "var(--text-primary, #222)",
        borderRadius: 8,
        padding: "8px 11px",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

export default function GoFishLayoutsPage() {
  const chartRef = useRef(null)
  const [active, setActive] = useState(initialDemoKey)
  const [observed, setObserved] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [pushCount, setPushCount] = useState(0)
  const [controls, setControls] = useState({
    flowerRadius: 34,
    bottleHeight: 220,
    innerRadius: 44,
    outerRadius: 145,
    treemapPadding: 2,
    heapGap: 18,
    cupWidth: 0.92,
    ...bobaVolumeDefaults,
  })
  const irDoc = useMemo(() => applyControlsToIR(active, controls), [active, controls])
  const adapterCfg = useMemo(() => unstable_fromGofishIR(irDoc), [irDoc])
  const demo = useMemo(() => getDemo(active, controls, adapterCfg), [active, controls, adapterCfg])
  const irText = useMemo(() => irForDisplay(irDoc), [irDoc])
  const controlList = getControls(active, controls, setControls)
  const seedData = demo.data
  const lastCupName = seedData?.[seedData.length - 1]?.name

  // Staleness is a streaming feature: only arm it while the demo is actively
  // auto-streaming, so a static gallery view never dims to "stale" on idle (and
  // shows a "LIVE" badge while data is flowing). `pulse` is intentionally not
  // used here — it targets scene nodes, and the boba hit rects are full-band
  // transparent targets, so a pulse reads as a panel rather than a flash.
  const liveStaleness = streaming
    ? { threshold: 5000, dimOpacity: 0.55, showBadge: true, badgePosition: "top-right" }
    : undefined

  const resetPushData = useCallback(() => {
    if (active === "python") return
    chartRef.current?.clear?.()
    chartRef.current?.pushMany?.(seedData)
    setPushCount(0)
  }, [active, seedData])

  const pushOne = useCallback(() => {
    if (active === "python") return
    setPushCount((prev) => {
      const nextDatum = buildPushedDatum(active, prev)
      if (active === "bottle") {
        chartRef.current?.update?.(nextDatum.id, (d) => ({ ...d, amount: nextDatum.amount }))
      } else if (active === "boba") {
        chartRef.current?.update?.(nextDatum.name, (d) => ({
          ...d,
          bobaVolume: nextDatum.bobaVolume,
        }))
      } else {
        chartRef.current?.push?.(nextDatum)
      }
      return prev + 1
    })
  }, [active])

  useEffect(() => {
    setStreaming(false)
    setObserved(null)
    resetPushData()
  }, [resetPushData])

  useEffect(() => {
    if (!streaming || active === "python") return undefined
    // Push immediately so the staleness badge starts "LIVE" rather than briefly
    // flashing "STALE" while the first interval tick is pending.
    pushOne()
    const timer = window.setInterval(pushOne, 1100)
    return () => window.clearInterval(timer)
  }, [active, pushOne, streaming])

  // Boba: apply the volume sliders to the last cup in place. The ordinal layout
  // re-runs the `bobaGeometry` derive over the live buffer on every solve, so
  // mutating the cup's raw volumes via the ref re-renders its tea fill, pearl
  // bed, and ice with the chart's normal transition — no full clear/re-push,
  // which would flash every cup. Runs after the reset effect above on a demo
  // switch (effects fire in order), so the cup exists before we update it.
  useEffect(() => {
    if (active !== "boba" || !lastCupName) return
    chartRef.current?.update?.(lastCupName, (d) => ({
      ...d,
      teaVolume: controls.bobaTeaVolume,
      bobaVolume: controls.bobaBobaVolume,
      iceVolume: controls.bobaIceVolume,
    }))
  }, [
    active,
    lastCupName,
    controls.bobaTeaVolume,
    controls.bobaBobaVolume,
    controls.bobaIceVolume,
  ])

  // Reset re-seeds the original menu and, for boba, returns the volume sliders
  // to the cup's original volumes so the controls and chart stay in sync.
  const handleReset = useCallback(() => {
    resetPushData()
    if (active === "boba") {
      setControls((prev) => ({ ...prev, ...bobaVolumeDefaults }))
    }
  }, [resetPushData, active])

  return (
    <PageLayout
      title="Experimental GoFish IR Adapter"
      subtitle="Temporary PR preview for rendering serialized GoFish Frontend IR through Semiotic custom layouts"
    >
      <section>
        <p>
          The GoFish examples are a useful stress test for Semiotic custom charts because they are
          not just new marks. They combine grouping, faceting, coordinate transforms, pictorial
          glyphs, packed layouts, and semantic diagrams. Each chart below is driven by a serialized{" "}
          <strong>GoFish Frontend IR</strong> document — the JSON a GoFish <code>to_ir</code> pass
          emits — run through <code>unstable_fromGofishIR</code>, the GoFish analogue of the{" "}
          <Link to="/intelligence/vega-lite">Vega-Lite translator</Link>. The adapter does not
          recognize archetypes — it <em>interprets</em> the spec, walking{" "}
          <code>data → operators → mark</code> and executing <code>spread</code>/<code>stack</code>/
          <code>group</code>/<code>scatter</code>/<code>treemap</code>, the <code>polar</code>{" "}
          transform, channel scales, and <code>connect</code>/<code>ref</code> relations into
          positioned marks. Any spec built from that grammar renders. The boba cup follows the spec
          as far as it can (real polygon/circle/rect marks) and escape-hatches only the
          frustum-volume math to one <code>derive</code>
          lambda; the Python Tutor memory diagram is a genuinely bespoke diagram, so it stays a
          chart-level escape hatch with particles on its pointer edges.
        </p>
        <p>
          This adapter is named <code>{EXPERIMENTAL_GOFISH_ADAPTER_NAME}</code>. It is exposed as an{" "}
          <code>unstable_</code> preview from <code>semiotic/experimental</code> for this PR so the
          GoFish developer can evaluate the direction. Anything imported from that subpath is
          unstable: it is not part of the next Semiotic release contract and may be removed or
          replaced once GoFish exposes a refined bbox-stage static spec and a dynamic equivalent.
        </p>
        <p>
          This is not a runtime dependency on GoFish — it consumes GoFish’s published IR, not its
          renderer. It is a concrete integration with the{" "}
          <Link to="/features/custom-charts">Custom Charts</Link> surface: a serialized grammar in,
          stable mark identity, data-bearing nodes, theme-aware color resolution, transitions, and
          streaming out.
        </p>
      </section>

      <section>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {demoOrder.map((key) => (
            <TabButton
              key={key}
              active={key === active}
              onClick={() => {
                if (typeof window !== "undefined") window.location.hash = key
                setActive(key)
                setObserved(null)
              }}
            >
              {demoLabels[key]}
            </TabButton>
          ))}
        </div>

        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border-color, #e0e0e0)",
            borderRadius: 8,
            padding: 16,
            overflow: "hidden",
          }}
        >
          {demo.kind === "network" ? (
            <NetworkCustomChart
              nodes={demo.graph?.nodes ?? []}
              edges={demo.graph?.edges ?? []}
              layout={demo.networkLayout}
              layoutConfig={demo.layoutConfig}
              width={880}
              height={demo.height}
              responsiveWidth
              margin={demo.margin}
              colorScheme={chartColors}
              enableHover
              onObservation={(obs) => {
                if (obs.type === "hover" || obs.type === "click") {
                  const datum = extractObservedDatum(obs)
                  if (datum) setObserved(datum)
                }
              }}
              frameProps={{
                background: "#ffffff",
                tooltipContent: GoFishTooltip,
                showParticles: true,
                particleStyle: {
                  radius: 2.5,
                  opacity: 0.75,
                  spawnRate: 0.4,
                  maxPerEdge: 10,
                  color: "#1A5683",
                },
                transition: { duration: 600, easing: "ease-out" },
                pulse: { duration: 700, color: "rgba(26, 86, 131, 0.28)", glowRadius: 7 },
              }}
            />
          ) : demo.kind === "ordinal" ? (
            <OrdinalCustomChart
              ref={chartRef}
              /* push-only: seeded via pushMany in resetPushData, not a data prop */
              layout={demo.ordinalLayout}
              layoutConfig={demo.layoutConfig}
              categoryAccessor={demo.categoryAccessor}
              valueAccessor={demo.valueAccessor}
              width={880}
              height={demo.height}
              responsiveWidth
              margin={demo.margin}
              colorScheme={chartColors}
              enableHover
              tooltip={GoFishTooltip}
              emptyContent={false}
              onObservation={(obs) => {
                if (obs.type === "hover" || obs.type === "click") {
                  const datum = extractObservedDatum(obs)
                  if (datum) setObserved(datum)
                }
              }}
              frameProps={{
                background: "#ffffff",
                dataIdAccessor: "name",
                transition: { duration: 650, easing: "ease-out" },
                staleness: liveStaleness,
              }}
            />
          ) : (
            <XYCustomChart
              ref={chartRef}
              /* push-only: seeded via pushMany in resetPushData, not a data prop */
              layout={demo.layout}
              layoutConfig={demo.layoutConfig}
              width={880}
              height={demo.height}
              responsiveWidth
              margin={demo.margin}
              colorScheme={chartColors}
              enableHover
              tooltip={GoFishTooltip}
              emptyContent={false}
              onObservation={(obs) => {
                if (obs.type === "hover" || obs.type === "click") {
                  const datum = extractObservedDatum(obs)
                  if (datum) setObserved(datum)
                }
              }}
              frameProps={{
                ...(active === "titanic" ? { background: "#ffffff" } : {}),
                pointIdAccessor: "id",
                transition: { duration: 650, easing: "ease-out" },
                staleness: liveStaleness,
              }}
            />
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--border-color, #e0e0e0)",
              borderRadius: 8,
              padding: 14,
              minWidth: 0,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Controls</h3>
            {controlList.map((control) => (
              <div key={control.key} style={{ marginBottom: 12 }}>
                <label
                  style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8 }}
                >
                  {control.label}: {control.value}
                  {control.suffix}
                </label>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step ?? 1}
                  value={control.value}
                  onChange={control.onChange}
                  style={{ width: "100%" }}
                />
              </div>
            ))}
            {active === "python" ? (
              <p style={{ marginTop: 12 }}>
                Pointer edges are rendered by <code>NetworkCustomChart</code> with particles
                enabled, using bezier caches from the custom layout.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <button type="button" style={smallButtonStyle} onClick={pushOne}>
                  {active === "bottle"
                    ? "Update bottle"
                    : active === "boba"
                      ? "Refill a cup"
                      : "Push datum"}
                </button>
                <button
                  type="button"
                  style={{
                    ...smallButtonStyle,
                    background: streaming
                      ? "var(--semiotic-primary, #4e79a7)"
                      : "var(--surface-1, #fff)",
                    color: streaming ? "#fff" : "var(--text-primary, #222)",
                  }}
                  onClick={() => setStreaming((value) => !value)}
                >
                  {streaming ? "Stop stream" : "Auto stream"}
                </button>
                <button type="button" style={smallButtonStyle} onClick={handleReset}>
                  Reset
                </button>
                <span
                  style={{
                    alignSelf: "center",
                    fontSize: 12,
                    color: "var(--text-secondary, #666)",
                  }}
                >
                  {pushCount} {active === "bottle" || active === "boba" ? "updates" : "pushed"}
                </span>
              </div>
            )}
            <p style={{ marginBottom: 0, overflowWrap: "anywhere" }}>
              <strong>Question:</strong> {demo.question}
            </p>
          </div>

          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--border-color, #e0e0e0)",
              borderRadius: 8,
              padding: 14,
              minWidth: 0,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Selected Mark</h3>
            {observed ? (
              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(70px, 0.45fr) 1fr",
                  gap: "6px 10px",
                  margin: 0,
                }}
              >
                {Object.entries(observed).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{key}</dt>
                    <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                      {formatTooltipValue(value)}
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
            ) : (
              <p style={{ marginBottom: 0 }}>
                Hover a stem, bottle, polar bar, passenger, or memory cell.
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2>The GoFish IR driving this chart</h2>
        <p>
          This chart is not hand-wired. The JSON below is a GoFish Frontend IR document — the
          serialized form a GoFish <code>to_ir</code> pass emits (
          <code>data → operators → mark</code>, lowercase <code>type</code> tags, the{" "}
          <code>__combinator</code> flag, tagged <code>{'{type:"field"}'}</code> accessors). The
          page runs it through <code>unstable_fromGofishIR</code>, which interprets the operators and mark
          channels directly and mounts the result on the <code>{demo.kind}</code> frame —{" "}
          <code>
            {demo.kind === "network"
              ? "NetworkCustomChart"
              : demo.kind === "ordinal"
                ? "OrdinalCustomChart"
                : "XYCustomChart"}
          </code>
          .
        </p>
        {demo.warnings && demo.warnings.length > 0 ? (
          <p style={{ color: "var(--semiotic-warning, #b26a00)" }}>
            <strong>Adapter warnings:</strong> {demo.warnings.join(" ")}
          </p>
        ) : null}
        <CodeBlock language="json">{irText}</CodeBlock>
        <p style={{ fontSize: 13, color: "var(--text-secondary, #666)", marginBottom: 0 }}>
          Resolved <code>layoutConfig</code>:{" "}
          <code>{JSON.stringify(stripDataFromConfig(demo.layoutConfig))}</code>
        </p>
      </section>

      <section>
        <h2>Why this is not ad hoc</h2>
        <p>{demo.contract}</p>
        <ul>
          <li>
            <strong>Layout is separate from rendering.</strong> Each recipe computes glyph marks
            from data and plot dimensions; the adapter compiles supported marks into Semiotic scene
            nodes.
          </li>
          <li>
            <strong>Identity is explicit.</strong> Every mark has an id, which becomes the
            transition key for scene nodes and the React key for overlay glyphs.
          </li>
          <li>
            <strong>Glyph chrome is allowed, but bounded.</strong> Petals, bottle silhouettes,
            ribbons, tuple dividers, labels, and arrows are overlays. Hit targets and measurable
            values remain in the scene graph.
          </li>
        </ul>
      </section>

      <section>
        <h2>Targets</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={thStyle}>GoFish example</th>
              <th style={thStyle}>Frame · interpreted grammar</th>
              <th style={thStyle}>Scene-node contract</th>
            </tr>
          </thead>
          <tbody>
            <TargetRow
              label="Flower chart"
              href={gofishLinks.flower}
              recipe="XY · scatter + polar stack of petals"
              contract="Stem bars are data-bearing rects; petals are polar-remapped paths."
            />
            <TargetRow
              label="Bottle fill chart"
              href={gofishLinks.bottle}
              recipe="XY · spread + derive + image/clip marks"
              contract="A bottle image per category with a green fill clipped to the silhouette, a fill line, a % label, and a transparent hit rect — via the reusable image + clipPath glyph primitives."
            />
            <TargetRow
              label="Polar ribbon chart"
              href={gofishLinks.polar}
              recipe="XY · polar nested stacks + connect"
              contract="Radial stacked bars as annular paths; connect resolves ribbons across named refs."
            />
            <TargetRow
              label="Titanic fare circle treemap"
              href={gofishLinks.titanic}
              recipe="XY · nested squarified treemap → circles"
              contract="Outer treemap sizes a rectangle per class; inner treemap squarifies passengers into fare-sized cells, each an inscribed circle by survival."
            />
            <TargetRow
              label="Python Tutor memory diagram"
              href={gofishLinks.python}
              recipe="network · chart-level mark-fn (escape hatch)"
              contract="A bespoke diagram beyond the grammar: rect nodes + curved particle pointer edges."
            />
            <TargetRow
              label="Boba science cups"
              href={gofishLinks.boba}
              recipe="ordinal · spread + derive + polygon/circle/rect/line marks"
              contract="A menu of data-driven drinks: tea + tapioca + ice volumes add up to a drink height. One hit rect per cup; cup, tea, pearls, ice, lid, and straw are real marks; one derive for the geometry math + the shared aspect box."
            />
          </tbody>
        </table>
      </section>

      <section>
        <h2>How the interpreter executes a spec</h2>
        <p>
          <code>unstable_fromGofishIR</code> picks a frame family and hands the IR to{" "}
          <code>interpretGofishIR</code>, which walks <code>data → operators → mark</code> and{" "}
          <em>executes</em> the grammar — it does not match archetypes. It is a real (if minimal)
          layout engine, not GoFish’s full constraint solver: it implements the deterministic
          allocation/accumulation model the common acyclic specs reduce to.
        </p>
        <ul>
          <li>
            <strong>Operators allocate space.</strong> <code>spread</code> divides an axis into even
            slots, <code>stack</code> accumulates value-scaled segments, <code>group</code>{" "}
            partitions by a field, <code>scatter</code> positions by x/y scales,{" "}
            <code>treemap</code> slices proportional cells, <code>layer</code> overlays.
          </li>
          <li>
            <strong>Marks bind channels through scales.</strong> A field <code>h</code>/
            <code>w</code> becomes a value-scaled bar; <code>fill</code> resolves through the theme
            palette; the <code>polar</code> transform remaps <code>(θ, r)</code> so rects become
            annular bands.
          </li>
          <li>
            <strong>Escape hatches are honored, not assumed.</strong> <code>derive</code> and{" "}
            <code>mark-fn</code> resolve through a lambda registry — the boba cup’s geometry is one{" "}
            <code>derive</code>; an unregistered id warns rather than crashing.
          </li>
          <li>
            <strong>Out-of-scope constructs warn.</strong> <code>table</code>, <code>cut</code>,
            free-form <code>.constrain</code>, and similar record an adapter warning and fall back
            instead of silently mis-rendering. Semiotic still owns hit testing, transitions,
            staleness, tooltips, SSR, and (for the memory diagram) particles.
          </li>
        </ul>
      </section>

      <section>
        <h2>Streaming relational layouts</h2>
        <p>
          Semiotic can animate between solved states, but relational layout grammars need explicit
          streaming semantics. Append streams introduce new observations; state updates mutate
          existing objects. For relational charts, the hard cases are insertion order, relation
          preservation, and whether a transition should preserve a local relationship or re-solve
          the whole layout. The bottle demo intentionally uses update semantics; the flower, polar,
          and Titanic demos use append semantics.
        </p>
      </section>

      <section>
        <h2>Using the adapter</h2>
        <CodeBlock language="jsx">{`import { useEffect, useRef } from "react"
import { XYCustomChart } from "semiotic/xy"
import { NetworkCustomChart } from "semiotic/network"
import { unstable_fromGofishIR } from "semiotic/experimental"

// A GoFish Frontend IR document — the JSON a GoFish to_ir pass emits.
const flowerIR = {
  irVersion: 0,
  ir: "gofish-frontend",
  root: {
    type: "layer",
    charts: [
      {
        type: "chart",
        data: { type: "inline", rows: seafood },
        operators: [{ type: "scatter", by: "lake", x: { type: "field", name: "x" } }],
        mark: { type: "rect", origin: { name: "stems" }, w: 4, h: { type: "field", name: "count" } },
      },
      {
        type: "chart",
        data: { type: "select", layer: "stems" },
        operators: [{ type: "group", by: "datum.lake" }],
        mark: {
          type: "spread", __combinator: true, options: { dir: "y" },
          children: [{
            type: "layer", __combinator: true, options: { coord: { type: "polar" } },
            children: [{
              type: "stack", __combinator: true, options: { dir: "x", sharedScale: true },
              children: [{ type: "petal", w: { type: "field", name: "count" }, fill: { type: "field", name: "species" } }],
            }],
          }],
        },
      },
    ],
  },
}

function LiveFlower() {
  const ref = useRef(null)
  // unstable_fromGofishIR selects the custom frame, derives layoutConfig accessors, and
  // returns the inline data — no per-chart renderer.
  const cfg = unstable_fromGofishIR(flowerIR)

  useEffect(() => {
    ref.current?.clear()
    ref.current?.pushMany(cfg.data)
  }, [cfg.data])

  if (cfg.family === "network") {
    return (
      <NetworkCustomChart
        nodes={cfg.graph.nodes}
        edges={cfg.graph.edges}
        layout={cfg.networkLayout}
        layoutConfig={cfg.layoutConfig}
        frameProps={{ showParticles: true }}
      />
    )
  }

  return (
    <XYCustomChart
      ref={ref}
      data={cfg.data}
      layout={cfg.layout}
      layoutConfig={{ ...cfg.layoutConfig, flowerRadius: 34 }}
      frameProps={{
        transition: { duration: 650 },
        staleness: { threshold: 5000, showBadge: true },
      }}
      width={880}
      height={380}
      responsiveWidth
      enableHover
      emptyContent={false}
    />
  )
}`}</CodeBlock>
      </section>
    </PageLayout>
  )
}

function TargetRow({ label, href, recipe, contract }) {
  return (
    <tr>
      <td style={tdStyle}>
        <a href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      </td>
      <td style={tdStyle}>
        <code>{recipe}</code>
      </td>
      <td style={tdStyle}>{contract}</td>
    </tr>
  )
}

const thStyle = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--border-color, #e0e0e0)",
}

const smallButtonStyle = {
  appearance: "none",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border-color, #d8dee4)",
  background: "var(--surface-1, #fff)",
  color: "var(--text-primary, #222)",
  borderRadius: 8,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
}

const tdStyle = {
  padding: "9px 10px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--border-color, #e0e0e0)",
  verticalAlign: "top",
}
