import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NetworkCustomChart } from "semiotic/network"
import { adjacencyFlowLayout, aggregateAdjacencyFlow } from "semiotic/recipes"
import "./AdjacencyFlow.css"

const GROUPS = ["ABC", "DEF", "GHI"]

const journeyNodes = [
  { id: "A", label: "A", group: "ABC" },
  { id: "B", label: "B", group: "ABC" },
  { id: "C", label: "C", group: "ABC" },
  { id: "D", label: "D", group: "DEF" },
  { id: "E", label: "E", group: "DEF" },
  { id: "F", label: "F", group: "DEF" },
  { id: "G", label: "G", group: "GHI" },
  { id: "H", label: "H", group: "GHI" },
  { id: "I", label: "I", group: "GHI" },
]

// Three common phases with a few reversals and long-range jumps. Internal
// totals are 45 / 40 / 49; cross-phase totals match the summary readout.
const journeyEdges = [
  { source: "A", target: "B", value: 10 },
  { source: "A", target: "C", value: 2 },
  { source: "B", target: "C", value: 25 },
  { source: "C", target: "A", value: 3 },
  { source: "C", target: "B", value: 5 },
  { source: "D", target: "E", value: 7 },
  { source: "D", target: "F", value: 8 },
  { source: "E", target: "D", value: 3 },
  { source: "E", target: "F", value: 12 },
  { source: "F", target: "D", value: 2 },
  { source: "F", target: "E", value: 8 },
  { source: "G", target: "H", value: 22 },
  { source: "G", target: "I", value: 8 },
  { source: "H", target: "I", value: 14 },
  { source: "I", target: "G", value: 5 },
  { source: "A", target: "D", value: 3 },
  { source: "A", target: "F", value: 2 },
  { source: "B", target: "D", value: 3 },
  { source: "C", target: "D", value: 3 },
  { source: "C", target: "E", value: 5 },
  { source: "C", target: "F", value: 2 },
  { source: "D", target: "A", value: 2 },
  { source: "D", target: "B", value: 3 },
  { source: "F", target: "A", value: 2 },
  { source: "A", target: "G", value: 2 },
  { source: "B", target: "G", value: 2 },
  { source: "C", target: "H", value: 3 },
  { source: "D", target: "G", value: 7 },
  { source: "E", target: "G", value: 6 },
  { source: "E", target: "H", value: 2 },
  { source: "F", target: "G", value: 4 },
  { source: "F", target: "H", value: 5 },
  { source: "G", target: "F", value: 2 },
  { source: "I", target: "D", value: 2 },
]

function useMeasuredWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const style = window.getComputedStyle(element)
      const horizontalPadding =
        (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
      const next = Math.max(1, Math.floor(element.clientWidth - horizontalPadding))
      setWidth((previous) => (previous === next ? previous : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          color: "var(--text-secondary)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "inline-flex",
          overflow: "hidden",
          border: "1px solid var(--surface-3)",
          borderRadius: 7,
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            style={{
              padding: "6px 11px",
              border: 0,
              background: value === option.value ? "var(--accent)" : "transparent",
              color:
                value === option.value
                  ? "var(--adjacency-flow-control-selected-text, #082f49)"
                  : "var(--text-primary)",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: value === option.value ? 700 : 500,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ checked, children, onChange }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--text-secondary)",
        cursor: "pointer",
        fontSize: 12.5,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  )
}

function FlowTooltip(datum) {
  if (datum.source != null && datum.target != null) {
    return (
      <div>
        <strong>
          {String(datum.source).replace("group:", "")} →{" "}
          {String(datum.target).replace("group:", "")}
        </strong>
        <div>{datum.value} journeys</div>
        {datum.edgeCount > 1 && <div>{datum.edgeCount} records combined</div>}
      </div>
    )
  }
  return (
    <div>
      <strong>{datum.label ?? datum.id}</strong>
      <div>{datum.aggregate ? datum.memberCount + " steps collapsed" : "Phase " + datum.group}</div>
      <div>
        {datum.incomingValue ?? 0} in · {datum.outgoingValue ?? 0} out
      </div>
      {(datum.internalValue ?? 0) > 0 && <div>{datum.internalValue} within phase</div>}
    </div>
  )
}

export default function AdjacencyFlow() {
  const [containerRef, width] = useMeasuredWidth()
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(GROUPS))
  const [showArrows, setShowArrows] = useState(true)
  const [showValues, setShowValues] = useState(true)
  const [colorMode, setColorMode] = useState("single")

  const result = useMemo(
    () =>
      aggregateAdjacencyFlow(journeyNodes, journeyEdges, {
        expandedGroups,
      }),
    [expandedGroups],
  )
  const isDetail = expandedGroups.size === GROUPS.length
  const isSummary = expandedGroups.size === 0

  const setView = (view) => {
    setExpandedGroups(new Set(view === "detail" ? GROUPS : []))
  }
  const toggleGroup = useCallback((group) => {
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }, [])
  const handleNodeClick = useCallback(
    (datum) => {
      if (datum?.group) toggleGroup(String(datum.group))
    },
    [toggleGroup],
  )

  const height = width == null ? 620 : Math.min(700, Math.max(380, width * 0.78))
  const layoutConfig = useMemo(
    () => ({
      colorMode,
      edgeColor: colorMode === "single" ? "#63b3c9" : undefined,
      nodeColor: colorMode === "single" ? "#173f5f" : undefined,
      nodeTextColor: "#ffffff",
      showArrows,
      showValues,
      maxCellSize: isSummary ? 116 : 92,
      cornerRadius: isSummary ? 13 : 9,
    }),
    [colorMode, isSummary, showArrows, showValues],
  )

  return (
    <div
      ref={containerRef}
      className="adjacency-flow-demo"
      style={{
        padding: 16,
        borderRadius: 10,
        background: "var(--surface-0)",
        color: "var(--text-primary)",
        fontFamily: "var(--semiotic-font-family, system-ui, sans-serif)",
        "--semiotic-text": "var(--text-primary)",
        "--semiotic-bg": "var(--surface-0)",
        "--semiotic-border": "var(--surface-3)",
        "--semiotic-adjacency-flow-arrow-fill": "rgba(255, 255, 255, 0.72)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 16,
          marginBottom: 8,
        }}
      >
        <Segmented
          label="Level of detail"
          value={isDetail ? "detail" : isSummary ? "summary" : "mixed"}
          onChange={setView}
          options={[
            { value: "detail", label: "9 steps" },
            { value: "summary", label: "3 phases" },
          ]}
        />
        <Segmented
          label="Flow color"
          value={colorMode}
          onChange={setColorMode}
          options={[
            { value: "single", label: "Unified" },
            { value: "source", label: "By source" },
          ]}
        />
        <div style={{ display: "flex", gap: 12, paddingBottom: 6 }}>
          <Toggle checked={showArrows} onChange={setShowArrows}>
            Direction arrows
          </Toggle>
          <Toggle checked={showValues} onChange={setShowValues}>
            Values
          </Toggle>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
        <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>Click a node or phase:</span>
        {GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            aria-pressed={expandedGroups.has(group)}
            onClick={() => toggleGroup(group)}
            style={{
              padding: "3px 9px",
              border: "1px solid var(--surface-3)",
              borderRadius: 999,
              background: expandedGroups.has(group) ? "var(--surface-2)" : "transparent",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {expandedGroups.has(group) ? "− " + group : "+ " + group}
          </button>
        ))}
      </div>

      {width ? (
        <NetworkCustomChart
          nodes={result.nodes}
          edges={result.edges}
          nodeIDAccessor="id"
          sourceAccessor="source"
          targetAccessor="target"
          layout={adjacencyFlowLayout}
          layoutConfig={layoutConfig}
          colorScheme={["#0e7490", "#b45309", "#3f6212", "#6d28d9"]}
          width={width}
          height={height}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          enableHover
          tooltip={FlowTooltip}
          onClick={handleNodeClick}
          title="Adjacency flow journey"
          description={
            "An ordered adjacency-flow diagram with " +
            result.nodes.length +
            " visible steps and " +
            result.edges.length +
            " weighted routes. Forward routes occupy the upper-right matrix and reversals occupy the lower-left."
          }
          summary="Three journey phases dominate. The middle phase has the most reversals, while flows consolidate into G before the final two steps."
          accessibleTable
          className="adjacency-flow-frame"
        />
      ) : (
        <div style={{ height }} aria-hidden />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 8,
          marginTop: 4,
          color: "var(--text-secondary)",
          fontSize: 12,
        }}
      >
        <span>↗ Upper-right: forward in sequence</span>
        <span>↙ Lower-left: reversals and backtracking</span>
        <span>↻ Diagonal loops: within collapsed phases</span>
      </div>
    </div>
  )
}
