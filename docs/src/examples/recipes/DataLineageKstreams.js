import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { NetworkCustomChart } from "semiotic/network"
import { LinkedCharts, useSelectionActions } from "semiotic"
import { lineageDagLayout } from "semiotic/recipes"
import { useRafTween } from "../../components/useRafTween"
import { topologyV1, topologyV2 } from "./data/kstreamsTopology"
import { dagLayoutFromGraph, reachableFrom, subgraphFrom } from "./data/dagLayout"

// ── KStreams glyph vocabulary (the demo supplies this; the recipe stays
//    domain-agnostic and just calls renderIcon / typeLabel) ────────────────

const PARTITION_COLORS = {
  "topic-source": "#1f8a70",
  "topic-sink": "#c0552d",
  "topic-bridge": "#3f5e8c",
  processor: "#3a3a52",
  unknown: "#5a5a6a",
}

const SEMANTIC_GLYPH = {
  source: "▶",
  sink: "▼",
  filter: "▽",
  map: "⇄",
  aggregate: "Σ",
  reduce: "⤵",
  "join-this": "⋈",
  "join-other": "⋈",
  merge: "⋎",
  suppress: "‖",
  select: "⌖",
  tostream: "≈",
  processor: "∘",
}

function TopicIcon({ size }) {
  const s = size
  return (
    <g>
      <rect x={s * 0.08} y={s * 0.12} width={s * 0.84} height={s * 0.76} rx={s * 0.16} fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
      {[0.34, 0.5, 0.66].map((f) => (
        <line key={f} x1={s * 0.24} y1={s * f} x2={s * 0.76} y2={s * f} stroke="rgba(255,255,255,0.75)" strokeWidth={1} strokeLinecap="round" />
      ))}
    </g>
  )
}

function renderKstreamsIcon({ semantic, partition, size, color }) {
  if (partition && partition.startsWith("topic")) {
    return (
      <g>
        <rect width={size} height={size} rx={5} fill={color} />
        <g transform={`translate(${size * 0.12}, ${size * 0.12}) scale(${0.76})`}>
          <TopicIcon size={size} />
        </g>
      </g>
    )
  }
  const glyph = SEMANTIC_GLYPH[semantic] || "∘"
  return (
    <g>
      <rect width={size} height={size} rx={5} fill={color} stroke="rgba(255,255,255,0.18)" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.56} fontWeight={700} fill="#fff">
        {glyph}
      </text>
    </g>
  )
}

const typeLabelFor = ({ semantic, partition }) =>
  partition && partition.startsWith("topic") ? "topic" : semantic

const tooltipStyle = {
  background: "var(--surface-1, #14141c)",
  border: "1px solid var(--surface-3, #2a2a38)",
  borderRadius: "6px",
  padding: "7px 10px",
  color: "var(--text-primary, #f0f0f5)",
  fontSize: "12px",
  maxWidth: "280px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
}

// Canvas hover tooltip — shows the node TYPE (topic kind / processor semantic)
// and name, plus a store count. Reads the wrapped hover datum; null for edges.
function nodeTooltip(hd) {
  if (!hd || hd.nodeOrEdge === "edge") return null
  const node = hd.data || {}
  const raw = node.data && typeof node.data === "object" ? node.data : node
  const label = raw.label || raw.id
  if (!label) return null
  const isTopic = typeof raw.partition === "string" && raw.partition.startsWith("topic")
  const typeText = isTopic ? `Topic · ${raw.partition.replace("topic-", "")}` : (raw.semantic || "processor")
  const nStores = raw.stores ? raw.stores.length : 0
  return (
    <div style={tooltipStyle}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary, #9a9aae)" }}>
        {typeText}
      </div>
      <div style={{ fontWeight: 700, marginTop: "2px", wordBreak: "break-all" }}>{label}</div>
      {nStores > 0 && (
        <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--text-secondary, #9a9aae)" }}>
          {nStores} state store{nStores !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}

// ── DagLayout → chart node/edge data ────────────────────────────────────────

function toChartData(layout) {
  return {
    nodes: layout.nodes.map((dn) => ({
      id: dn.id,
      x: dn.x,
      y: dn.y,
      partition: dn.node.partition,
      semantic: dn.node.semantic,
      label: dn.node.label,
      stores: dn.node.stores,
      subtopologyId: dn.node.subtopologyId,
    })),
    edges: layout.edges.map((de) => ({
      id: de.id,
      source: de.source,
      target: de.target,
      edgeType: de.edgeType,
      isBackEdge: de.isBackEdge,
    })),
  }
}

function interpolateLayouts(from, to, t) {
  const fromPos = new Map(from.nodes.map((n) => [n.id, n]))
  const nodes = to.nodes.map((dn) => {
    const f = fromPos.get(dn.id)
    if (!f) return dn
    return { ...dn, x: f.x + (dn.x - f.x) * t, y: f.y + (dn.y - f.y) * t }
  })
  return {
    nodes,
    edges: to.edges,
    layerCount: Math.max(from.layerCount, to.layerCount),
    maxLayerSize: Math.max(from.maxLayerSize, to.maxLayerSize),
  }
}

// ── The views (rendered inside LinkedCharts so the store is shared) ─────────

function LineageViews() {
  const [variant, setVariant] = useState(1)
  const [rootId, setRootId] = useState("orders")
  const [selectedId, setSelectedId] = useState(null)
  // Display detail is a continuous 0→1 value (0 = detailed full glyphs,
  // 1 = compact icon-only) so the toggle can animate size, spacing, and edges.
  // `dispTarget` is where we're headed; `dispT` is the animated value.
  const [dispTarget, setDispTarget] = useState(0)
  const [dispT, setDispT] = useState(0)

  // Write-ONLY access to the shared "reach" selection. Because it subscribes
  // to nothing, pushing a hover-reach set here does NOT re-render this
  // container (controls, topic select, detail panel) — only the two charts,
  // which *consume* the selection, re-render. That keeps per-hover work to the
  // canvas repaint that's genuinely needed, with no topology re-ingest and no
  // container-tree reconciliation.
  const reach = useSelectionActions("kstreams-reach")

  const full = variant === 1 ? topologyV1 : topologyV2
  const showAll = rootId === "__all__"

  const rootChoices = useMemo(
    () => full.nodes.filter((n) => n.partition === "topic-source").map((n) => n.id),
    [full]
  )

  // "All roots" renders the whole topology in the main view; otherwise the
  // downstream subgraph of the chosen root.
  const layoutV1 = useMemo(() => dagLayoutFromGraph(showAll ? topologyV1 : subgraphFrom(topologyV1, rootId)), [rootId, showAll])
  const layoutV2 = useMemo(() => dagLayoutFromGraph(showAll ? topologyV2 : subgraphFrom(topologyV2, rootId)), [rootId, showAll])
  const fullLayout = useMemo(() => dagLayoutFromGraph(full), [full])

  // ── Snapshot morph: tween positions between the two variant layouts ───────
  // `useRafTween` owns the interruptible-loop machinery (token guard, skip
  // mount, easing); onStart captures from/to at trigger time.
  const [tween, setTween] = useState(null)
  const prevVariantRef = useRef(variant)
  useRafTween({
    trigger: variant,
    duration: 650,
    onStart: () => {
      const from = prevVariantRef.current === 1 ? layoutV1 : layoutV2
      const to = variant === 1 ? layoutV1 : layoutV2
      prevVariantRef.current = variant
      return { from, to }
    },
    onFrame: (t, { from, to }) => setTween(t < 1 ? { from, to, t } : null),
  })

  // ── Detail transition: tween `dispT` (0 = detailed ↔ 1 = compact) ─────────
  const dispTRef = useRef(0)
  dispTRef.current = dispT
  useRafTween({
    trigger: dispTarget,
    duration: 480,
    onStart: () => {
      const from = dispTRef.current
      return from === dispTarget ? false : { from } // nothing to animate
    },
    onFrame: (t, { from }) => setDispT(t < 1 ? from + (dispTarget - from) * t : dispTarget),
  })

  const activeLayout = variant === 1 ? layoutV1 : layoutV2
  const mainLayout = tween ? interpolateLayouts(tween.from, tween.to, tween.t) : activeLayout
  const mainData = useMemo(() => toChartData(mainLayout), [mainLayout])
  const miniData = useMemo(() => toChartData(fullLayout), [fullLayout])

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const wrapRef = useRef(null)
  const [fs, setFs] = useState(false)
  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === wrapRef.current)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])
  const toggleFs = useCallback(() => {
    const el = wrapRef.current
    if (document.fullscreenElement) {
      if (document.exitFullscreen) Promise.resolve(document.exitFullscreen()).catch(() => {})
    } else if (el && el.requestFullscreen) {
      Promise.resolve(el.requestFullscreen()).catch(() => {})
    }
  }, [])

  // ── Interaction ────────────────────────────────────────────────────────────
  // Hover → push the downstream-reach set into the shared store. Both charts
  // consume it via `selection` → dim everything outside it, in both views.
  const handleHover = useCallback(
    (obs) => {
      if (obs && obs.type === "hover" && obs.datum && obs.datum.id) {
        reach.selectPoints({ id: Array.from(reachableFrom(full, obs.datum.id)) })
      } else if (obs && (obs.type === "hover-end" || obs.type === "click-end")) {
        reach.clear()
      }
    },
    [reach, full]
  )

  const selectNode = useCallback((datum) => {
    if (datum && datum.id) setSelectedId(datum.id)
  }, [])

  const handleMinimapClick = useCallback(
    (datum) => {
      selectNode(datum)
      if (datum && typeof datum.partition === "string" && datum.partition.startsWith("topic")) {
        setRootId(datum.id)
        reach.clear()
      }
    },
    [selectNode, reach]
  )

  const reset = useCallback(() => {
    setSelectedId(null)
    reach.clear()
  }, [reach])

  const selectedNode = useMemo(() => full.nodes.find((n) => n.id === selectedId) || null, [full, selectedId])

  // Interpolate every geometry knob by dispT so detail ↔ compact animates:
  // glyph size + layer/row spacing shrink, the canvas narrows, edges thin.
  const lerp = (a, b) => a + (b - a) * dispT
  const LAYER_PX = lerp(172, 40)
  const ROW_PX = lerp(104, 34)
  const nodeW = lerp(184, 20)
  const nodeH = lerp(56, 20)
  const minGapX = lerp(26, 18)
  const minGapY = lerp(18, 12)
  const edgeW = lerp(3, 2) // full edges 3px → compact edges 2px
  const mainWidth = Math.max(460, mainLayout.layerCount * LAYER_PX + 48)
  const baseMainHeight = Math.max(220, mainLayout.maxLayerSize * ROW_PX + 32)
  const vh = typeof window !== "undefined" ? window.innerHeight : 900
  const mainHeight = fs ? Math.max(baseMainHeight, vh - 210) : baseMainHeight
  const animating = tween !== null || dispT !== dispTarget

  // layoutConfig stays stable across hover (no reach here — that rides the
  // store) so a hover never triggers a re-ingest. selectedId changes only on
  // click (rare); renderIcon / typeLabel / partitionColors are module-stable.
  // lod:"auto" sheds detail by fitted size — as nodeW shrinks 184→20 the glyph
  // collapses full → compact → icon, the icon being the constant anchor. While
  // settled (dispT at 0 or 1) these are constant, so hover never re-ingests;
  // only the transition churns them per frame.
  const mainConfig = useMemo(
    () => ({
      layerCount: mainLayout.layerCount,
      maxLayerSize: mainLayout.maxLayerSize,
      selectedId,
      renderIcon: renderKstreamsIcon,
      typeLabel: typeLabelFor,
      partitionColors: PARTITION_COLORS,
      lod: "auto",
      nodeWidth: nodeW,
      nodeHeight: nodeH,
      minGapX,
      minGapY,
      edgeWidth: edgeW,
    }),
    [mainLayout.layerCount, mainLayout.maxLayerSize, selectedId, nodeW, nodeH, minGapX, minGapY, edgeW]
  )

  const miniConfig = useMemo(
    () => ({
      layerCount: fullLayout.layerCount,
      maxLayerSize: fullLayout.maxLayerSize,
      selectedId,
      lod: "dot",
      partitionColors: PARTITION_COLORS,
    }),
    [fullLayout.layerCount, fullLayout.maxLayerSize, selectedId]
  )

  return (
    <div ref={wrapRef} style={fs ? { background: "var(--bg, #0f0f17)", padding: 16, height: "100vh", overflow: "auto", boxSizing: "border-box" } : undefined}>
      {/* Controls */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
        <label style={{ fontSize: "13px", color: "var(--text-secondary, #8888a0)" }}>
          Root topic:{" "}
          <select
            value={rootId}
            onChange={(e) => { setRootId(e.target.value); reset() }}
            style={selectStyle}
          >
            <option value="__all__">All roots — full topology</option>
            {rootChoices.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "13px", color: "var(--text-secondary, #8888a0)" }}>
          Display:{" "}
          <select
            value={dispTarget === 1 ? "compact" : "detailed"}
            onChange={(e) => setDispTarget(e.target.value === "compact" ? 1 : 0)}
            disabled={animating}
            style={{ ...selectStyle, opacity: animating ? 0.6 : 1 }}
          >
            <option value="detailed">Detailed</option>
            <option value="compact">Compact (icons)</option>
          </select>
        </label>
        <button
          onClick={() => setVariant((v) => (v === 1 ? 2 : 1))}
          disabled={animating}
          style={{ ...btnStyle, opacity: animating ? 0.5 : 1, cursor: animating ? "default" : "pointer" }}
        >
          {variant === 1 ? "▶ Morph to snapshot v2" : "◀ Morph to snapshot v1"}
        </button>
        <span style={{ fontSize: "12px", color: "var(--text-secondary, #8888a0)" }}>
          Snapshot <strong style={{ color: "var(--text-primary, #f0f0f5)" }}>v{variant}</strong>{tween ? " — morphing…" : ""}
        </span>
        <button onClick={toggleFs} style={{ ...btnStyle, marginLeft: "auto" }}>
          {fs ? "⤡ Exit full screen" : "⤢ Full screen"}
        </button>
        <button onClick={reset} style={btnStyle}>Reset</button>
      </div>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Main lineage view */}
        <div style={{ flex: "1 1 640px", minWidth: 0 }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary, #8888a0)", marginBottom: "6px" }}>
            {showAll ? "Full topology — all roots" : <>Downstream lineage from <code>{rootId}</code></>} · hover to preview reach · click to select · scroll for wide graphs
          </div>
          <div style={{ overflowX: "auto", overflowY: "hidden", maxWidth: "100%", border: "1px solid var(--surface-3, #2a2a38)", borderRadius: "6px" }}>
            <NetworkCustomChart
              key="main"
              chartId="kstreams-main"
              nodes={mainData.nodes}
              edges={mainData.edges}
              layout={lineageDagLayout}
              layoutConfig={mainConfig}
              selection={{ name: "kstreams-reach" }}
              onObservation={handleHover}
              onClick={selectNode}
              width={mainWidth}
              height={mainHeight}
              margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
              frameProps={{ background: "transparent", tooltipContent: nodeTooltip }}
            />
          </div>
        </div>

        {/* Sidebar: minimap + detail */}
        <div style={{ flex: "0 0 280px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>Topology overview</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary, #8888a0)", marginBottom: "6px" }}>
              Whole app · click a topic to re-root · shares hover/selection with the main view
            </div>
            <div style={{ border: "1px solid var(--surface-3, #2a2a38)", borderRadius: "6px", overflow: "hidden" }}>
              <NetworkCustomChart
                key="mini"
                chartId="kstreams-mini"
                nodes={miniData.nodes}
                edges={miniData.edges}
                layout={lineageDagLayout}
                layoutConfig={miniConfig}
                selection={{ name: "kstreams-reach" }}
                onObservation={handleHover}
                onClick={handleMinimapClick}
                width={280}
                height={170}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                frameProps={{ background: "transparent", tooltipContent: nodeTooltip }}
              />
            </div>
          </div>
          <NodeDetail node={selectedNode} full={full} />
        </div>
      </div>
    </div>
  )
}

const btnStyle = {
  padding: "6px 12px",
  borderRadius: "6px",
  background: "var(--surface-2, #1a1a25)",
  color: "var(--text-primary, #f0f0f5)",
  border: "1px solid var(--surface-3, #2a2a38)",
  fontSize: "13px",
  cursor: "pointer",
}
const selectStyle = {
  padding: "5px 8px",
  borderRadius: "6px",
  background: "var(--surface-2, #1a1a25)",
  color: "var(--text-primary, #f0f0f5)",
  border: "1px solid var(--surface-3, #2a2a38)",
  fontSize: "13px",
}

// Detail panel — memoized so a hover (which never re-renders the container)
// also can't reconcile here; only a new selection updates it.
const NodeDetail = React.memo(function NodeDetail({ node, full }) {
  if (!node) {
    return (
      <div style={{ fontSize: "13px", color: "var(--text-secondary, #8888a0)", padding: "8px 0" }}>
        Click a node to inspect its partition, semantic, and attached state stores.
      </div>
    )
  }
  const downstream = reachableFrom(full, node.id).size - 1
  return (
    <div style={{ borderTop: "1px solid var(--surface-3, #2a2a38)", paddingTop: "12px" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, wordBreak: "break-all", marginBottom: "4px" }}>{node.label}</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
        <Tag color={PARTITION_COLORS[node.partition]}>{node.partition}</Tag>
        <Tag color="#555">{node.semantic}</Tag>
        {node.subtopologyId != null && <Tag color="#444">sub-topology {node.subtopologyId}</Tag>}
      </div>
      <DetailRow label="Downstream nodes" value={String(downstream)} />
      <DetailRow label="In / out degree" value={`${node.inDegree} / ${node.outDegree}`} />
      {node.stores && node.stores.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary, #8888a0)", marginBottom: "4px" }}>State stores</div>
          <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px" }}>
            {node.stores.map((s) => <li key={s} style={{ wordBreak: "break-all" }}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
})

const Tag = ({ color, children }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, color: "#fff", background: color || "#555" }}>
    {children}
  </span>
)

const DetailRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}>
    <span style={{ color: "var(--text-secondary, #8888a0)" }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
)

export default function DataLineageKstreams() {
  return (
    <LinkedCharts>
      <LineageViews />
    </LinkedCharts>
  )
}
