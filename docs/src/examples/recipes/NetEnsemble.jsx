import React, { useMemo, useRef, useState, useEffect, useCallback } from "react"
import { NetworkCustomChart, ForceDirectedGraph } from "semiotic/network"
import { netEnsembleLayout, analyzeNetEnsemble } from "semiotic/recipes"
import { ensemble } from "./data/netEnsembleData"

const CONVERGE = "#3b7dd8"
const BRANCH = "#e8853a"
const EDGE = "rgba(120,132,156,0.55)"
const CHART_ID = "net-ensemble"
// Categorical palette for the motif / family color modes in the force view.
const CATEGORICAL = ["#4c78a8", "#f58518", "#54a24b", "#e45756", "#72b7b2", "#eeca3b", "#b279a2", "#ff9da6"]

function useMeasuredWidth(min = 360) {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = Math.max(min, Math.round((el.clientWidth - 2) / 20) * 20)
      setWidth((prev) => (prev === w ? prev : w))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [min])
  return [ref, width]
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
        {label}
      </span>
      <div style={{ display: "inline-flex", borderRadius: 7, overflow: "hidden", border: "1px solid var(--surface-3)" }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: "5px 11px",
              fontSize: 12.5,
              border: "none",
              cursor: "pointer",
              background: value === o.value ? "var(--accent)" : "transparent",
              color: value === o.value ? "#fff" : "var(--text)",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// The census readout — computed with the headless analyzeNetEnsemble API, the
// same diagnostics the layout uses. This is the number force layout can't show.
function Census({ analysis }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
      <Stat label="components" value={analysis.components.length} />
      <Stat label="motif shapes" value={analysis.motifs.length} />
      <Stat label="converge (1 sink)" value={analysis.directedCount} color={CONVERGE} />
      <Stat label="branch (≥2 sinks)" value={analysis.branchingCount} color={BRANCH} />
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div
      style={{
        minWidth: 120,
        padding: "8px 12px",
        borderRadius: 8,
        background: "var(--surface-1)",
        border: "1px solid var(--surface-3)",
        borderLeft: `3px solid ${color ?? "var(--surface-3)"}`,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: color ?? "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{label}</div>
    </div>
  )
}

export default function NetEnsemble() {
  const { nodes, edges } = ensemble
  const [ref, width] = useMeasuredWidth()
  const [view, setView] = useState("ensemble") // "ensemble" | "force"
  const [colorMode, setColorMode] = useState("directedness")
  const [grouped, setGrouped] = useState(true)

  const analysis = useMemo(() => analyzeNetEnsemble(nodes, edges), [nodes, edges])

  // Annotate each node with its component's net diagnostics so the force view
  // can honor the same "Color by" control the ensemble view uses (directedness
  // and motif are per-component properties, not raw node fields).
  const forceNodes = useMemo(() => {
    const meta = new Map()
    for (const c of analysis.components) for (const id of c.ids) meta.set(id, c)
    return nodes.map((n) => {
      const c = meta.get(n.id)
      return {
        ...n,
        __dir: c && c.directed ? "converges" : "branches",
        __motif: c ? c.descriptor : "?",
      }
    })
  }, [nodes, analysis])

  const forceColor = useMemo(() => {
    if (colorMode === "directedness")
      return { colorBy: "__dir", colorScheme: { converges: CONVERGE, branches: BRANCH } }
    if (colorMode === "motif") return { colorBy: "__motif", colorScheme: CATEGORICAL }
    return { colorBy: "family", colorScheme: CATEGORICAL }
  }, [colorMode])

  const layoutConfig = useMemo(
    () => ({
      colorMode,
      groupByMotif: grouped,
      sort: "frequency",
      convergeColor: CONVERGE,
      branchColor: BRANCH,
      edgeColor: EDGE,
      categoryAccessor: "family",
    }),
    [colorMode, grouped]
  )

  const onObservation = useCallback(() => {}, [])
  const height = 860

  return (
    <div
      ref={ref}
      style={{
        background: "var(--surface-0)",
        borderRadius: 10,
        padding: 18,
        boxSizing: "border-box",
        fontFamily: "var(--semiotic-font-family, system-ui, sans-serif)",
        // Map Semiotic overlay tokens onto the docs theme so band labels /
        // legend stay legible and adapt to light + dark docs modes.
        "--semiotic-text": "var(--text)",
        "--semiotic-text-secondary": "var(--text-secondary)",
        "--semiotic-border": "var(--surface-3)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-end", marginBottom: 16 }}>
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "ensemble", label: "Net ensemble" },
            { value: "force", label: "Force scatter" },
          ]}
        />
        <Segmented
          label="Color by"
          value={colorMode}
          onChange={setColorMode}
          options={[
            { value: "directedness", label: "Directedness" },
            { value: "motif", label: "Motif" },
            { value: "category", label: "Family" },
          ]}
        />
        <Segmented
          label="Group"
          value={grouped ? "yes" : "no"}
          onChange={(v) => setGrouped(v === "yes")}
          options={[
            { value: "yes", label: "By motif" },
            { value: "no", label: "Flat" },
          ]}
        />
      </div>

      <Census analysis={analysis} />

      {width ? (
        view === "ensemble" ? (
          <NetworkCustomChart
            nodes={nodes}
            edges={edges}
            nodeIDAccessor="id"
            sourceAccessor="source"
            targetAccessor="target"
            chartId={CHART_ID}
            layout={netEnsembleLayout}
            layoutConfig={layoutConfig}
            width={width}
            height={height}
            onObservation={onObservation}
            description={`An ensemble of ${analysis.components.length} disconnected workflow graphs, grouped into ${analysis.motifs.length} recurring motif shapes. ${analysis.directedCount} converge to a single sink; ${analysis.branchingCount} branch to two or more.`}
            summary="Grouping by structural motif turns a bag of disconnected DAGs into a readable census."
          />
        ) : (
          <ForceDirectedGraph
            nodes={forceNodes}
            edges={edges}
            nodeIDAccessor="id"
            sourceAccessor="source"
            targetAccessor="target"
            colorBy={forceColor.colorBy}
            colorScheme={forceColor.colorScheme}
            nodeStroke="none"
            edgeColor={EDGE}
            showLegend
            legendPosition="bottom"
            width={width}
            height={height}
            nodeSize={4}
            description="The same disconnected graphs under a force-directed layout — components scatter into meaningless blobs with no legible structure, even when colored by the same encoding as the ensemble view."
          />
        )
      ) : (
        <div style={{ height }} aria-hidden />
      )}

      <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 12, marginBottom: 0 }}>
        {view === "ensemble"
          ? "Each cell is one small graph, placed so flow converges toward its sink(s) at the bottom. Cells are grouped into bands of the same structural shape; the exemplar at each band's left is that motif drawn once. Toggle to Force scatter to see the same data as a hairball of blobs."
          : "Force-directed layout has nothing to pull on between disconnected components, so it scatters them arbitrarily. You cannot see how many chains, diamonds, or branching forks there are — the motif census is invisible. Switch back to Net ensemble."}
      </p>
    </div>
  )
}
