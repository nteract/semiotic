import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ChartContainer, NetworkCustomChart, useSelectionActions } from "semiotic"
// Custom-network kit: the radial coordinate helpers (0 = up, clockwise), the
// transparent hit-target node that earns the layout its accessibility +
// annotation anchoring for free, and the datum unwrapper for onObservation.
import {
  networkHitTarget,
  polarToXY,
  xyToAngle,
  TAU,
  unwrapDatum,
  addPoints,
  subtractPoints,
  scalePoint,
  pointMagnitude,
  normalizePoint,
  mean,
  clamp,
  shortestArcDelta,
  useCustomLayoutSelection,
} from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { StatStrip } from "../../components/StatStrip"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import { URINE_NODES, URINE_EDGES, URINE_DIAGNOSES, URINE_COLOR_COUNT } from "./data/urineWheel"

// Art-directed manuscript palette. Like the Art Movement example, this sits at
// the "override the theme" end of Semiotic's theming spectrum: the frame is
// transparent and the layout paints these fixed editorial colors rather than
// --semiotic-* tokens. The ChartContainer gets parchment CSS-var overrides so
// its chrome reads as aged paper in both light and dark docs themes.
const INK = "#3f2d1a"
const INK_SOFT = "#6b563c"
const PARCHMENT = "#efe5cb"
const PARCHMENT_DEEP = "#e7d8b4"
const GLASS = "#6f5a39"
const GOLD = "#a9791f"
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Georgia, 'Times New Roman', serif"

const MIN_CHART_WIDTH = 680
const CHART_HEIGHT = 700

const implementationCode = `import { NetworkCustomChart } from "semiotic"
import { networkHitTarget, polarToXY, xyToAngle, TAU } from "semiotic/recipes"

function urineWheelLayout(ctx) {
  const { plot } = ctx.dimensions
  const center = { x: plot.width / 2, y: plot.height / 2 }
  const rOuter = Math.min(plot.width, plot.height) / 2 - 92
  const rInner = rOuter * 0.45
  const slot = (order) => (order / 20) * TAU          // clockwise from the top

  // 20 colors at even angles around the rim.
  const colors = ctx.nodes.map((n) => n.data ?? n).filter((d) => d.kind === "color")
  const colorPos = new Map(
    colors.map((c) => [c.id, polarToXY(slot(c.order), rOuter, { center })])
  )

  // Each diagnosis settles at the *unit-vector mean angle* of its colors, so
  // "perfect" rides up under the golds and "mortification" sinks by the blacks.
  const place = (members, r) => {
    const a = members.map((c) => slot(c.order))
    const angle = xyToAngle(mean(a.map(Math.sin)), mean(a.map((x) => -Math.cos(x))))
    return polarToXY(angle, r, { center })
  }

  return {
    // transparent, keyboard-navigable, annotation-anchorable hit nodes —
    // the visible flasks + roundels are drawn by hand in \`overlays\`.
    sceneNodes: nodes.map((n) => networkHitTarget({ x: n.x, y: n.y, r: n.hitR, datum: n.raw, id: n.id })),
    overlays: <WheelArt colors={colorPos} diagnoses={diagPos} />,
  }
}

<NetworkCustomChart
  nodes={URINE_NODES} edges={URINE_EDGES} layout={urineWheelLayout}
  layoutConfig={{ language, showTree }}          // geometry-changing config only
  selection={{ name: "urine-wheel-active" }}     // highlight restyles, no relayout
  annotations={physiciansNotes}                  // pointId-anchored, with provenance
  description="A medieval uroscopy wheel…" accessibleTable
  frameProps={{ background: "transparent", tooltipContent: renderTooltip }}
/>`

// Vector ops (addPoints/subtractPoints/scalePoint/pointMagnitude/normalizePoint),
// clamp/mean, and the signed cyclical delta (shortestArcDelta) all come from
// semiotic/recipes now — the custom-chart kit owns this boilerplate.

export default function UrineWheelExamplePage() {
  const [active, setActive] = useState(null)
  const [lockedDiagnosis, setLockedDiagnosis] = useState(null)
  const [language, setLanguage] = useState("latin")
  const [showTree, setShowTree] = useState(true)
  const [showNotes, setShowNotes] = useState(true)
  const [chartWidth, hostRef] = useResponsiveWidth(MIN_CHART_WIDTH)

  const handleObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      setActive(unwrapDatum(observation.datum))
    } else if (observation.type === "hover-end") {
      setActive(null)
    }
  }, [])

  // Language + tree toggles change what the layout draws, so they relayout via
  // layoutConfig. The highlight (hover wins, else the locked coction filter) is
  // pure restyle — it goes through the shared selection store and the overlay
  // re-renders via the selection context without re-running the radial layout.
  const layoutConfig = useMemo(
    () => ({
      language,
      showTree,
    }),
    [language, showTree],
  )
  const { selectPoints, clear } = useSelectionActions("urine-wheel-active")
  useEffect(() => {
    if (active?.id) selectPoints({ id: [active.id] })
    else if (lockedDiagnosis) selectPoints({ id: [lockedDiagnosis] })
    else clear()
  }, [active, lockedDiagnosis, selectPoints, clear])

  const annotations = useMemo(() => (showNotes ? PHYSICIANS_NOTES : []), [showNotes])

  return (
    <ExamplePageLayout title="The Wheel of Urines">
      <p style={styles.lede}>
        Before laboratories, a physician read disease from the color of urine. The medieval{" "}
        <em>rota urinarum</em> ringed twenty named colors around a chart and tied each to a stage of{" "}
        <em>digestio</em> — the body&apos;s &ldquo;cooking&rdquo; of the humors. It is, in modern
        terms, a node-link diagram in a circle, so Semiotic draws it as one: a custom radial network
        layout, every flask and roundel a real, navigable mark.
      </p>

      <StatStrip
        items={[
          { value: "20", label: "named urine colors" },
          { value: "7", label: "stages of coction" },
          { value: "0", label: "hand-placed x/y positions" },
        ]}
      />

      <ChartContainer
        title="Rota Urinarum — The Wheel of Urines"
        subtitle="Twenty uroscopy colors joined to the stage of digestion each one signifies"
        height={CHART_HEIGHT + 150}
        actions={{ export: true, fullscreen: true }}
        style={styles.parchmentContainer}
        controls={
          <div style={styles.readout} aria-live="polite">
            <ActiveReadout active={active} language={language} />
          </div>
        }
      >
        <div style={styles.body}>
          <div style={styles.toolbar}>
            <div style={styles.toggleGroup} role="group" aria-label="Label language">
              <ToggleButton active={language === "latin"} onClick={() => setLanguage("latin")}>
                Latin
              </ToggleButton>
              <ToggleButton active={language === "english"} onClick={() => setLanguage("english")}>
                English
              </ToggleButton>
            </div>
            <div style={styles.toggleGroup}>
              <ToggleButton active={showTree} onClick={() => setShowTree((v) => !v)}>
                Tree of health
              </ToggleButton>
              <ToggleButton active={showNotes} onClick={() => setShowNotes((v) => !v)}>
                Physician&apos;s notes
              </ToggleButton>
            </div>
          </div>

          <div ref={hostRef} style={styles.chartHost}>
            <NetworkCustomChart
              chartId="urine-wheel"
              nodes={URINE_NODES}
              edges={URINE_EDGES}
              layout={urineWheelLayout}
              layoutConfig={layoutConfig}
              selection={{ name: "urine-wheel-active" }}
              annotations={annotations}
              width={chartWidth}
              height={CHART_HEIGHT}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              enableHover
              onObservation={handleObservation}
              description="A medieval uroscopy wheel. Twenty named urine colors are arranged in a ring, running as a spectrum from white through gold to black, and each is joined to one of seven stages of digestion (coction) it was held to signify: indigestion, beginning, middling, perfect, excess, adustion, and mortification."
              summary="Gold and ruddy urines in the upper ring signify perfect digestion and health; the pale whites signify raw, uncooked humors; the wine-dark, green, and black urines in the lower ring signify burning and, finally, fatal mortification."
              accessibleTable
              frameProps={{ background: "transparent", tooltipContent: renderWheelTooltip }}
            />
          </div>

          <CoctionLegend
            language={language}
            locked={lockedDiagnosis}
            activeDiagnosis={
              active?.kind === "diagnosis"
                ? active.id
                : active?.kind === "color"
                  ? active.diagnosis
                  : null
            }
            onToggle={(id) => setLockedDiagnosis((cur) => (cur === id ? null : id))}
          />
        </div>
      </ChartContainer>

      <section style={styles.editorial}>
        <h2>Reading the wheel</h2>
        <p>
          The colors are not arranged arbitrarily. They form a single spectrum that wraps the ring:
          the two pathological extremes — <em>Albus</em> (white, the raw, uncooked humor) and{" "}
          <em>Niger</em> (black, the humor burnt to death) — meet at the bottom, while{" "}
          <em>Rufus</em> and the golds, the urines of perfect coction, crown the top. Read clockwise
          down the right side and the urine grows ever more &ldquo;cooked&rdquo;: gold, red,
          wine-dark, green, lead, black. Continue up the left side and it runs back from cold white
          through the pales to gold. Hover any flask to trace it to the diagnosis it signifies;
          hover a roundel to light every color that points to it.
        </p>

        <h2>A network drawn in a ring</h2>
        <p>
          The twenty flasks are placed at even angles around the rim. Each of the seven diagnosis
          roundels is positioned at the <em>unit-vector mean angle</em> of the colors that connect
          to it — so &ldquo;perfect digestion,&rdquo; fed by the golds clustered near the top,
          settles at the crown, while &ldquo;mortification,&rdquo; fed by the dark urines, settles
          near the bottom. Nothing is hand-placed; move a color to a different diagnosis and its
          roundel drifts to follow. The spokes leave each flask radially and fan apart by how far a
          color sits from its diagnosis&apos;s center, echoing the original&apos;s sweeping
          connectors.
        </p>

        <CodeBlock language="jsx" showCopyButton code={implementationCode} />

        <h2>What the custom layout inherits</h2>
        <p>
          Because every flask and roundel is emitted as a <code>networkHitTarget</code>, this
          hand-drawn diagram is a first-class Semiotic chart. It is fully keyboard navigable (Tab
          into the wheel, then arrow between marks); it carries a screen-reader data table and a
          layered description; the physician&apos;s notes are real <code>annotations</code> anchored
          to nodes by id and carrying provenance (a human gloss, not an inference); and the
          toolbar&apos;s export button writes the whole wheel to SVG or PNG. The Latin/English
          toggle rides the cheap <code>layoutConfig</code> path (the layout re-runs without
          re-ingesting the graph), while the highlight interaction is cheaper still: it flows
          through the shared selection store and the overlay restyles via{" "}
          <code>useCustomLayoutSelection</code> — no relayout at all.
        </p>

        <p style={styles.sourceNote}>
          Color names and their similes (<em>ut aurum</em> — &ldquo;like gold&rdquo;) follow the
          uroscopy tradition of Gilles de Corbeil and the Articella; the seven central glosses echo
          the prognostic phrases inscribed in printed wheels such as Ullrich Pinder&apos;s{" "}
          <cite>Epiphanie Medicorum</cite> (1506). The arrangement, colors, and translations are
          encoded as data; all positions are generated at render time.
        </p>
      </section>
    </ExamplePageLayout>
  )
}

// ── The radial network layout ────────────────────────────────────────────────
function urineWheelLayout(ctx) {
  const { plot } = ctx.dimensions
  const center = { x: plot.width / 2, y: plot.height / 2 }
  const minDim = Math.min(plot.width, plot.height)
  const rOuter = minDim / 2 - 92
  const rInner = Math.max(92, rOuter * 0.45)
  const flask = clamp(minDim * 0.05, 23, 36)
  const diagR = clamp(minDim * 0.058, 30, 45)

  const { language, showTree } = ctx.config

  // Split raw data (ctx.nodes are RealtimeNode wrappers; the user object is .data)
  const colors = []
  const diagnoses = []
  for (const n of ctx.nodes) {
    const d = n.data ?? n
    if (d.kind === "color") colors.push(d)
    else if (d.kind === "diagnosis") diagnoses.push(d)
  }

  const slot = (order) => (order / URINE_COLOR_COUNT) * TAU

  // Colors → even angles around the rim.
  const colorById = new Map()
  for (const c of colors) {
    const angle = slot(c.order)
    colorById.set(c.id, { ...c, angle, ...polarToXY(angle, rOuter, { center }) })
  }

  // Diagnoses → unit-vector mean angle of their member colors, on the inner ring.
  const memberAngles = new Map()
  for (const c of colors) {
    const arr = memberAngles.get(c.diagnosis) || []
    arr.push(slot(c.order))
    memberAngles.set(c.diagnosis, arr)
  }
  const diagById = new Map()
  for (const d of diagnoses) {
    const angs = memberAngles.get(d.id) || [0]
    const meanAngle = xyToAngle(
      mean(angs.map((a) => Math.sin(a))),
      mean(angs.map((a) => -Math.cos(a))),
    )
    diagById.set(d.id, { ...d, angle: meanAngle, ...polarToXY(meanAngle, rInner, { center }) })
  }

  // Transparent hit targets — the source of keyboard nav, the data table,
  // annotation anchoring, and onObservation. The visible art is the overlay.
  const sceneNodes = [
    ...colors.map((c) => {
      const p = colorById.get(c.id)
      return networkHitTarget({ x: p.x, y: p.y, r: flask * 0.8, datum: c, id: c.id })
    }),
    ...diagnoses.map((d) => {
      const p = diagById.get(d.id)
      return networkHitTarget({ x: p.x, y: p.y, r: diagR, datum: d, id: d.id })
    }),
  ]

  return {
    sceneNodes,
    sceneEdges: [],
    // All visible art lives in the overlay; the scene nodes are invisible hit
    // targets. The no-op restyle opts into the style-only selection path, so
    // hover / locked-filter changes swap the overlay's selection context
    // without re-running the radial layout or rebuilding the quadtree.
    restyle: () => undefined,
    overlays: (
      <WheelOverlay
        colors={colors}
        diagnoses={diagnoses}
        colorById={colorById}
        diagById={diagById}
        center={center}
        rInner={rInner}
        rOuter={rOuter}
        flask={flask}
        diagR={diagR}
        language={language}
        showTree={showTree}
      />
    ),
  }
}

function WheelOverlay({
  colors,
  diagnoses,
  colorById,
  diagById,
  center,
  rInner,
  rOuter,
  flask,
  diagR,
  language,
  showTree,
}) {
  // The shared selection carries one id — a hovered color/diagnosis, or the
  // locked coction filter published by the page. The kind-aware expansion
  // (a color lights its diagnosis; a diagnosis lights its member colors)
  // happens here, so this overlay re-renders on highlight change while the
  // canvas scene and layout stay untouched.
  const selection = useCustomLayoutSelection()
  const focusNode = selection.isActive
    ? ([...colors, ...diagnoses].find((d) => selection.predicate(d)) ?? null)
    : null

  const highlight = new Set()
  const activeEdges = new Set()
  const lightColor = (id) => {
    const c = colorById.get(id)
    if (!c) return
    highlight.add(c.id)
    highlight.add(c.diagnosis)
    activeEdges.add(`${c.id}->${c.diagnosis}`)
  }
  const lightDiagnosis = (id) => {
    if (!diagById.has(id)) return
    highlight.add(id)
    for (const c of colors) {
      if (c.diagnosis === id) {
        highlight.add(c.id)
        activeEdges.add(`${c.id}->${id}`)
      }
    }
  }
  if (focusNode?.kind === "color") lightColor(focusNode.id)
  else if (focusNode?.kind === "diagnosis") lightDiagnosis(focusNode.id)
  const focused = highlight.size > 0

  return (
    <g pointerEvents="none" fontFamily={SERIF}>
      {showTree && <TreeOfHealth center={center} rInner={rInner} dim={focused} />}

      {/* spokes */}
      {URINE_EDGES.map((edge) => {
        const c = colorById.get(edge.source)
        const d = diagById.get(edge.target)
        if (!c || !d) return null
        const on = !focused || activeEdges.has(edge.id)
        const toCenter = normalizePoint(subtractPoints(center, c))
        const start = addPoints(c, scalePoint(toCenter, flask * 0.72))
        const fromDiag = normalizePoint(subtractPoints(start, d))
        const end = addPoints(d, scalePoint(fromDiag, diagR * 0.98))
        const along = normalizePoint(subtractPoints(end, start))
        const perp = { x: -along.y, y: along.x }
        const length = pointMagnitude(subtractPoints(end, start))
        // fan: colors above their diagnosis centroid bow one way, below the other
        const bow = -shortestArcDelta(d.angle, c.angle, TAU) * length * 0.5
        const ctrl = {
          x: (start.x + end.x) / 2 + perp.x * bow,
          y: (start.y + end.y) / 2 + perp.y * bow,
        }
        return (
          <path
            key={edge.id}
            d={`M${start.x},${start.y} Q${ctrl.x},${ctrl.y} ${end.x},${end.y}`}
            fill="none"
            stroke={edge.accent}
            strokeWidth={on ? 2.4 : 1.1}
            strokeLinecap="round"
            opacity={on ? 0.85 : 0.12}
          />
        )
      })}

      {/* diagnosis roundels */}
      {diagnoses.map((dd) => {
        const d = diagById.get(dd.id)
        const on = !focused || highlight.has(dd.id)
        const label = language === "latin" ? dd.shortLatin : dd.short
        const fontSize = label.length > 9 ? diagR * 0.245 : diagR * 0.3
        return (
          <g key={dd.id} opacity={on ? 1 : 0.22}>
            <circle
              cx={d.x}
              cy={d.y}
              r={diagR}
              fill={on && focused ? `${dd.accent}26` : PARCHMENT}
              stroke={dd.accent}
              strokeWidth={on && focused ? 2.6 : 1.6}
            />
            <text
              x={d.x}
              y={d.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={INK}
              fontSize={fontSize}
              fontStyle="italic"
              letterSpacing="0.01em"
            >
              {label}
            </text>
          </g>
        )
      })}

      {/* flasks + ring of names */}
      {colors.map((cc) => {
        const c = colorById.get(cc.id)
        const on = !focused || highlight.has(cc.id)
        const deg = (c.angle * 180) / Math.PI
        const flip = deg > 90 && deg < 270
        const labelR = rOuter + flask * 0.82 + 12
        const lp = polarToXY(c.angle, labelR, { center })
        const name = language === "latin" ? cc.id : cc.english
        return (
          <g key={cc.id} opacity={on ? 1 : 0.16}>
            <g transform={`translate(${c.x},${c.y}) rotate(${deg + 180})`}>
              <Matula color={cc.hex} scale={flask} focused={focused && highlight.has(cc.id)} />
            </g>
            <g transform={`translate(${lp.x},${lp.y}) rotate(${flip ? deg + 180 : deg})`}>
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill={INK}
                fontSize={Math.max(9.5, flask * 0.36)}
                letterSpacing="0.02em"
              >
                {name}
              </text>
            </g>
          </g>
        )
      })}
    </g>
  )
}

// ── The matula (uroscopy flask) ──────────────────────────────────────────────
// Drawn upright in local coordinates with the round bulb at the bottom (+y) and
// the slender neck at the top (−y); the layout rotates it so the bulb points
// outward and the mouth toward the center, as in the manuscript.
function Matula({ color, scale, focused }) {
  const r = scale * 0.6
  const bulbCy = scale * 0.34
  const neckTop = -scale * 1.08
  const mouthHalf = scale * 0.3
  const neckHalf = scale * 0.13
  const sw = focused ? 1.5 : 1
  return (
    <g>
      {/* neck (empty glass), drawn behind the bulb */}
      <path
        d={`M${-mouthHalf},${neckTop} L${-neckHalf},${bulbCy} L${neckHalf},${bulbCy} L${mouthHalf},${neckTop}`}
        fill="rgba(140,168,170,0.16)"
        stroke={GLASS}
        strokeWidth={sw * 0.8}
        strokeLinejoin="round"
      />
      {/* mouth lip */}
      <line
        x1={-mouthHalf}
        y1={neckTop}
        x2={mouthHalf}
        y2={neckTop}
        stroke={GLASS}
        strokeWidth={focused ? 2 : 1.4}
        strokeLinecap="round"
      />
      {/* the urine */}
      <circle cx={0} cy={bulbCy} r={r} fill={color} stroke={GLASS} strokeWidth={sw} />
      {/* meniscus + specular highlight */}
      <path
        d={`M${-r * 0.86},${bulbCy - r * 0.38} A${r},${r} 0 0 1 ${r * 0.86},${bulbCy - r * 0.38}`}
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={0.8}
      />
      <ellipse
        cx={-r * 0.34}
        cy={bulbCy - r * 0.28}
        rx={r * 0.22}
        ry={r * 0.4}
        fill="rgba(255,255,255,0.28)"
        transform={`rotate(-22 ${-r * 0.34} ${bulbCy - r * 0.28})`}
      />
    </g>
  )
}

// ── The central tree of health ───────────────────────────────────────────────
// A stylized flowering plant rising through the center, echoing the manuscript's
// green stalk. Decorative: low opacity, non-interactive, dims when a mark is
// focused so the network reads on top.
function TreeOfHealth({ center, rInner, dim }) {
  // Compact plant living in the central void (inside the diagnosis ring), so it
  // tucks behind the roundels rather than colliding with them.
  const h = rInner * 0.56
  const baseY = center.y + h
  const topY = center.y - h
  const stalkGreen = "#4d7a35"
  const leafGreen = "#6f9a47"
  const stem = `M${center.x},${baseY}
    C${center.x - h * 0.14},${center.y + h * 0.4}
     ${center.x + h * 0.14},${center.y - h * 0.4}
     ${center.x},${topY}`
  const leafYs = [0.46, 0.12, -0.22]
  return (
    <g opacity={dim ? 0.16 : 0.4}>
      <path
        d={stem}
        fill="none"
        stroke={stalkGreen}
        strokeWidth={Math.max(2, h * 0.07)}
        strokeLinecap="round"
      />
      {/* roots */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={`M${center.x},${baseY} q${s * h * 0.2},${h * 0.16} ${s * h * 0.32},${h * 0.36}`}
          fill="none"
          stroke={stalkGreen}
          strokeWidth={Math.max(1, h * 0.035)}
          strokeLinecap="round"
          opacity={0.6}
        />
      ))}
      {/* paired leaves, attached at the stem and curving upward */}
      {leafYs.map((t, i) => {
        const y = center.y - t * h
        const len = h * (0.52 - i * 0.08)
        return [1, -1].map((s) => (
          <path
            key={`${i}-${s}`}
            d={`M${center.x},${y}
                Q${center.x + s * len * 0.5},${y - len * 0.55}
                 ${center.x + s * len},${y - len * 0.62}
                Q${center.x + s * len * 0.62},${y - len * 0.08}
                 ${center.x},${y} Z`}
            fill={leafGreen}
            opacity={0.7}
            stroke={stalkGreen}
            strokeWidth={0.6}
          />
        ))
      })}
      {/* crowning flower */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * TAU
        const p = polarToXY(a, h * 0.16, { center: { x: center.x, y: topY } })
        return (
          <ellipse
            key={i}
            cx={p.x}
            cy={p.y}
            rx={h * 0.08}
            ry={h * 0.13}
            fill="#cf7a90"
            opacity={0.82}
            transform={`rotate(${(a * 180) / Math.PI} ${p.x} ${p.y})`}
          />
        )
      })}
      <circle
        cx={center.x}
        cy={topY}
        r={h * 0.09}
        fill={GOLD}
        stroke={stalkGreen}
        strokeWidth={1}
      />
    </g>
  )
}

// ── Annotations: physician's glosses, anchored to nodes by id ─────────────────
const PHYSICIANS_NOTES = [
  {
    // Anchored to the gold flask at the crown — the connector rises into the
    // open margin above the wheel. pointId resolves to the scene node's center.
    type: "callout",
    pointId: "Rufus",
    label: "Gold — perfect coction. The sign of health.",
    dx: 0,
    dy: -52,
    radius: 16,
    wrap: 150,
    color: "#1f7a44",
    connector: { end: "arrow" },
    provenance: { authorKind: "human", source: "user", basis: "human-note" },
  },
  {
    type: "callout",
    pointId: "Niger",
    label: "Black — mortification. The gravest sign.",
    dx: 0,
    dy: 50,
    radius: 16,
    wrap: 150,
    color: "#3a2f2c",
    connector: { end: "arrow" },
    provenance: { authorKind: "human", source: "user", basis: "human-note" },
  },
]

// ── A clean cursor tooltip (frameProps.tooltipContent) ────────────────────────
// The frame's default tooltip would dump every datum field (kind, hex, order…).
// A custom renderer surfaces only the meaningful ones; the raw datum is at
// hoverData.data. FlippingTooltip paints the chrome, so we return bare content.
function renderWheelTooltip(hoverData) {
  const d = unwrapDatum(hoverData)
  if (!d || !d.kind) return null
  if (d.kind === "diagnosis") {
    return (
      <>
        <div style={{ fontWeight: 700 }}>{d.shortLatin}</div>
        <div style={{ opacity: 0.82, marginTop: 3 }}>{d.english}</div>
      </>
    )
  }
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: d.hex,
            border: "1px solid rgba(255,255,255,0.55)",
          }}
        />
        {d.id} · {d.english}
      </div>
      <div style={{ opacity: 0.82, marginTop: 3, fontStyle: "italic" }}>
        {d.simileLatin} — “{d.simileEnglish}”
      </div>
      <div style={{ opacity: 0.82, marginTop: 2 }}>{d.diagnosisLabel} digestion</div>
    </>
  )
}

// ── Header readout (the ChartContainer's "information" slot) ──────────────────
function ActiveReadout({ active, language }) {
  if (!active) {
    return (
      <>
        <strong style={styles.readoutTitle}>Trace a humor</strong>
        <span style={styles.readoutDetail}>
          Hover a flask to follow it to the digestion it signifies.
        </span>
      </>
    )
  }
  if (active.kind === "diagnosis") {
    return (
      <>
        <strong style={styles.readoutTitle}>
          {language === "latin" ? active.latin : active.english}
        </strong>
        <span style={styles.readoutDetail}>{active.meaning}</span>
      </>
    )
  }
  return (
    <>
      <strong style={styles.readoutTitle}>
        {active.id}
        <span style={styles.readoutEnglish}> · {active.english}</span>
      </strong>
      <span style={styles.readoutDetail}>
        <em>{active.simileLatin}</em> — &ldquo;{active.simileEnglish}&rdquo; ·{" "}
        {active.diagnosisLabel}
      </span>
    </>
  )
}

// ── Coction legend, doubling as a filter control ──────────────────────────────
function CoctionLegend({ language, locked, activeDiagnosis, onToggle }) {
  return (
    <div style={styles.legend} role="group" aria-label="Filter by stage of digestion">
      {URINE_DIAGNOSES.map((d) => {
        const isActive = activeDiagnosis === d.id
        const isLocked = locked === d.id
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onToggle(d.id)}
            aria-pressed={isLocked}
            title={language === "latin" ? d.latin : d.english}
            style={{
              ...styles.legendChip,
              borderColor: isLocked || isActive ? d.accent : "rgba(63,45,26,0.25)",
              background: isLocked ? `${d.accent}1f` : "transparent",
              opacity: locked && !isLocked ? 0.55 : 1,
            }}
          >
            <span style={{ ...styles.legendSwatch, background: d.accent }} />
            <span style={styles.legendLabel}>{language === "latin" ? d.shortLatin : d.short}</span>
          </button>
        )
      })}
    </div>
  )
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        ...styles.toggleButton,
        ...(active ? styles.toggleButtonActive : {}),
      }}
    >
      {children}
    </button>
  )
}

const styles = {
  lede: {
    maxWidth: "820px",
    margin: "0 0 30px",
    color: "var(--text-secondary)",
    fontSize: "19px",
    lineHeight: 1.6,
  },
  // Parchment chrome regardless of docs theme — set the semantic CSS vars the
  // ChartContainer reads, so its header/title/border render as aged paper.
  parchmentContainer: {
    margin: "4px 0 6px",
    "--semiotic-bg": PARCHMENT,
    "--semiotic-surface": PARCHMENT_DEEP,
    "--semiotic-text": INK,
    "--semiotic-text-secondary": INK_SOFT,
    "--semiotic-border": "rgba(63,45,26,0.28)",
    "--semiotic-border-radius": "4px",
    backgroundImage:
      "radial-gradient(circle at 16% 14%, rgba(120,92,48,.10), transparent 30%), radial-gradient(circle at 84% 80%, rgba(96,70,40,.09), transparent 34%)",
    boxShadow: "0 16px 40px rgba(40,28,10,.16)",
  },
  readout: {
    minWidth: 0,
    maxWidth: 360,
    display: "grid",
    justifyItems: "end",
    textAlign: "right",
    height: 60,
  },
  readoutTitle: { color: INK, fontSize: "14px", fontFamily: SERIF, lineHeight: 1.2 },
  readoutEnglish: { color: INK_SOFT, fontWeight: 400, fontStyle: "italic" },
  readoutDetail: {
    color: INK_SOFT,
    fontSize: "11.5px",
    lineHeight: 1.35,
    marginTop: 2,
  },
  body: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "12px 16px 14px",
    boxSizing: "border-box",
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "4px",
  },
  toggleGroup: { display: "flex", gap: "6px", flexWrap: "wrap" },
  toggleButton: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(63,45,26,0.3)",
    borderRadius: "4px",
    background: "transparent",
    color: INK,
    padding: "5px 11px",
    fontFamily: "inherit",
    fontSize: "12.5px",
    cursor: "pointer",
  },
  toggleButtonActive: {
    borderColor: GOLD,
    background: "rgba(169,121,31,0.16)",
    color: "#5a3f12",
    fontWeight: 700,
  },
  chartHost: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    justifyContent: "center",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "6px",
    marginTop: "2px",
  },
  legendChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(63,45,26,0.25)",
    borderRadius: "999px",
    padding: "3px 10px 3px 7px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "12px",
    color: INK,
  },
  legendSwatch: {
    width: "11px",
    height: "11px",
    borderRadius: "50%",
    flex: "0 0 auto",
  },
  legendLabel: { fontFamily: SERIF, fontStyle: "italic" },
  editorial: {
    maxWidth: "790px",
    margin: "44px auto 0",
    color: "var(--text-primary)",
    fontSize: "16px",
    lineHeight: 1.7,
  },
  sourceNote: {
    marginTop: "28px",
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
}
