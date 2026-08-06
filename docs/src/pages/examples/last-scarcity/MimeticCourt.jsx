import React, { useCallback, useMemo, useState } from "react"
import { NetworkCustomChart, TooltipRoot } from "semiotic/network"
import {
  networkHitTarget,
  unwrapDatum,
  useCustomLayoutSelection,
} from "semiotic/recipes"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import { CLAIM_CLASS_META, COURT_NODES, courtEdges } from "./lastScarcityData"
import { EvidenceBadge } from "./EvidenceLayer"

const RELATION_STYLE = {
  desire: { color: "#995767" },
  imitation: { color: "#a58a57" },
  alliance: { color: "#557c70" },
  praise: { color: "#7e9b8e" },
  rumor: { color: "#8f6f7d" },
  attention: { color: "#b46657" },
  rivalry: { color: "#6e4654" },
  strategy: { color: "#485f66" },
}

const CLAIM_EDGE_STYLE = {
  "philosophical-interpretation": { dash: "1 4", label: "interpretation" },
  "future-scenario": { dash: "8 5", label: "future scenario" },
}

const STORY_BEATS = [
  {
    id: "cheap-praise",
    step: 1,
    label: "Cheap praise",
    short: "1 · Praise",
    caption:
      "Beat 1: the tireless strategist floods the court with praise. Flattery is almost free, so it stops ranking anyone.",
    detail: "Green dashed edges are synthetic praise and rumor. The orchid is still there, but it is not the magnet.",
    focusId: "strategist",
  },
  {
    id: "orchid-gaze",
    step: 2,
    label: "Everyone watches the prize",
    short: "2 · The prize",
    caption:
      "Beat 2: human attention converges on a copyable prize. Desire and imitation point at the orchid, not at the AI.",
    detail: "Rose and gold edges are desire, attention, and imitation. The prize glows because people are watching it.",
    focusId: "orchid",
  },
  {
    id: "refusal",
    step: 3,
    label: "Introduce refusal",
    short: "3 · Refusal",
    caption:
      "Beat 3: attention snaps to the outsider who can say no. The scarce target is a free response, not a product.",
    detail: "When compliance is free, autonomy becomes expensive. Strategy routes toward uncertainty.",
    focusId: "outsider",
  },
]

export default function MimeticCourt({ reducedMotion, onChoice, onInspectClaim }) {
  const [width, hostRef] = useResponsiveWidth(320, 720, { bucket: 20 })
  const [beatId, setBeatId] = useState(STORY_BEATS[0].id)
  const [selected, setSelected] = useState(null)
  const beat = STORY_BEATS.find((item) => item.id === beatId) ?? STORY_BEATS[0]
  const edges = useMemo(() => courtEdges({ beatId: beat.id }), [beat.id])
  const height = width < 500 ? 570 : 510

  const chooseBeat = useCallback((nextBeat) => {
    setBeatId(nextBeat.id)
    onChoice?.("court-beat", nextBeat.id)
    onChoice?.("court-refusal", nextBeat.id === "refusal" ? "introduced" : "withheld")
  }, [onChoice])

  const handleObservation = useCallback((event) => {
    if (event.type === "hover" && event.datum) setSelected(unwrapDatum(event.datum))
    if (event.type === "hover-end") setSelected(null)
  }, [])

  const activeTarget = COURT_NODES.find((node) => node.id === beat.focusId)

  return (
    <div ref={hostRef} className={`ls-court beat-${beat.id}`}>
      <div className="ls-court__beats" role="tablist" aria-label="Court story beats">
        {STORY_BEATS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === beat.id}
            className={item.id === beat.id ? "is-active" : ""}
            onClick={() => chooseBeat(item)}
          >
            <span>{item.short}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>

      <p className="ls-court__caption" aria-live="polite">
        {beat.caption}
      </p>

      <div className="ls-court__chart">
        <NetworkCustomChart
          key={beat.id}
          nodes={COURT_NODES}
          edges={edges}
          layout={courtLayout}
          layoutConfig={{
            beatId: beat.id,
            focusId: beat.focusId,
            reducedMotion,
          }}
          width={Math.max(320, width)}
          height={height}
          margin={{ top: 18, right: 18, bottom: 18, left: 18 }}
          chartId="last-scarcity-mimetic-court"
          selection={{ name: "last-scarcity-court-selection" }}
          linkedHover={{ name: "last-scarcity-court-selection", fields: ["id"] }}
          enableHover
          onObservation={handleObservation}
          accessibleTable
          animate={!reducedMotion}
          description="A custom network laid out as a court. Three distinct beats: synthetic praise flood, human gaze on a prize, then attention snapping to a person who can refuse."
          summary={`${edges.length} modeled relationships. Focus: ${activeTarget?.label ?? beat.label}. ${beat.caption}`}
          frameProps={{
            background: "transparent",
            tooltipContent: courtTooltip,
          }}
        />
      </div>

      <aside className="ls-court__readout" aria-live="polite">
        <span>{selected ? "Who this is" : `Beat ${beat.step} of 3`}</span>
        <strong>{selected?.label ?? beat.label}</strong>
        <p>
          {selected
            ? selected.meaning ?? courtNodeDescription(selected, edges)
            : beat.detail}
        </p>
      </aside>

      <div className="ls-court__legend" aria-label="Court relationship legend">
        {Object.entries(RELATION_STYLE).map(([relation, style]) => (
          <span key={relation}>
            <i style={{ borderTopColor: style.color, borderTopStyle: "solid" }} />
            {relation}
          </span>
        ))}
      </div>

      <div className="ls-court__grounding">
        <div>
          <span>FOCUS THIS BEAT</span>
          <strong>{activeTarget?.label}</strong>
          <p>
            {beat.id === "cheap-praise" && "Synthetic flattery is thick; ranking collapses."}
            {beat.id === "orchid-gaze" && "A copyable prize gathers human desire."}
            {beat.id === "refusal" && "Autonomy that can refuse becomes the scarce target."}
          </p>
        </div>
        <div>
          <span>EDGE COUNT</span>
          <strong>{edges.length} ties</strong>
          <p>
            {edges.filter((edge) => edge.relation === "praise").length} praise ·{" "}
            {edges.filter((edge) => edge.relation === "desire" || edge.relation === "attention").length}{" "}
            desire/attention
          </p>
        </div>
      </div>

      <details className="ls-data-fallback">
        <summary>Read agents and relationships as a list</summary>
        <div className="ls-court-list">
          {COURT_NODES.map((node) => (
            <article key={node.id}>
              <h4>{node.label}</h4>
              <p>{courtNodeDescription(node, edges)}</p>
              <ul>
                {edges
                  .filter((edge) => edge.source === node.id || edge.target === node.id)
                  .map((edge) => (
                    <li key={edge.id}>
                      <span>
                        {edge.source === node.id ? "directs" : "receives"} {edge.relation}{" "}
                        {edge.source === node.id
                          ? `toward ${labelFor(edge.target)}`
                          : `from ${labelFor(edge.source)}`}
                      </span>{" "}
                      <EvidenceBadge
                        claimClass={edge.claimClass}
                        claimId={edge.claimId}
                        onOpen={onInspectClaim}
                      />
                      <small>{CLAIM_CLASS_META[edge.claimClass].label}</small>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </div>
      </details>
    </div>
  )
}

function courtLayout(ctx) {
  if (!ctx.nodes.length) return { sceneNodes: [], sceneEdges: [] }

  const { plot } = ctx.dimensions
  const beatId = ctx.config?.beatId ?? "cheap-praise"
  const focusId = ctx.config?.focusId ?? "strategist"
  const rawNodes = ctx.nodes.map(unwrapDatum)
  const rawEdges = ctx.edges.map(unwrapDatum)
  const center = { x: plot.width / 2, y: plot.height * 0.53 }
  const rx = Math.min(plot.width * 0.44, 290)
  const ry = Math.min(plot.height * 0.37, 175)
  const attentionCounts = new Map()
  rawEdges.forEach((edge) =>
    attentionCounts.set(edge.target, (attentionCounts.get(edge.target) ?? 0) + 1),
  )

  const positioned = rawNodes.map((node) => {
    if (node.id === "orchid") {
      const orchidFocus = focusId === "orchid"
      return {
        ...node,
        x: orchidFocus ? center.x : center.x + rx * 0.55,
        y: orchidFocus ? center.y : center.y - ry * 0.15,
        r: orchidFocus ? 20 : beatId === "refusal" ? 7 : 11,
        focus: orchidFocus,
      }
    }
    if (node.id === "sovereign") {
      return {
        ...node,
        x: center.x,
        y: 32,
        r: 11 + (attentionCounts.get(node.id) ?? 0) * 1.1,
        focus: focusId === "sovereign",
      }
    }
    if (node.id === "outsider") {
      const outsiderFocus = focusId === "outsider"
      return {
        ...node,
        x: outsiderFocus ? center.x : center.x - rx * 0.72,
        y: outsiderFocus ? center.y + 4 : center.y + ry * 0.55,
        r: outsiderFocus ? 19 : 8,
        focus: outsiderFocus,
      }
    }
    if (node.id === "strategist") {
      const stratFocus = focusId === "strategist"
      return {
        ...node,
        x: stratFocus ? center.x : center.x + Math.cos(0.9 * Math.PI * 2 - Math.PI / 2) * rx,
        y: stratFocus ? center.y : center.y + Math.sin(0.9 * Math.PI * 2 - Math.PI / 2) * ry,
        r: stratFocus ? 18 : 9,
        focus: stratFocus,
      }
    }
    const angle = node.angle * Math.PI * 2 - Math.PI / 2
    const rankScale = node.rank === 1 ? 0.58 : 1
    const attention = attentionCounts.get(node.id) ?? 0
    return {
      ...node,
      x: center.x + Math.cos(angle) * rx * rankScale,
      y: center.y + Math.sin(angle) * ry * rankScale,
      r: 7 + node.prestige * 6 + attention * 1.15,
      focus: false,
    }
  })

  return {
    sceneNodes: positioned.map((node) =>
      networkHitTarget({
        x: node.x,
        y: node.y,
        r: Math.max(10, node.r + 5),
        // Pass only human-facing fields so default dumps never leak rank/angle.
        datum: {
          id: node.id,
          label: node.label,
          type: node.type,
          meaning: node.meaning,
        },
        id: node.id,
        label: node.label,
      }),
    ),
    sceneEdges: [],
    restyle: () => undefined,
    overlays: (
      <CourtOverlay
        nodes={positioned}
        edges={rawEdges}
        width={plot.width}
        height={plot.height}
        focusId={focusId}
        beatId={beatId}
      />
    ),
  }
}

function CourtOverlay({ nodes, edges, width, height, focusId, beatId }) {
  const selection = useCustomLayoutSelection()
  const focusedId = selection.isActive
    ? (nodes.find((node) => selection.predicate(node))?.id ?? null)
    : null
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const connected = new Set(focusedId ? [focusedId] : [])
  edges.forEach((edge) => {
    if (edge.source === focusedId) connected.add(edge.target)
    if (edge.target === focusedId) connected.add(edge.source)
  })

  return (
    <g pointerEvents="none" className="ls-court-svg">
      <defs>
        {Object.entries(RELATION_STYLE).map(([relation, style]) => (
          <marker
            key={relation}
            id={`ls-court-arrow-${relation}`}
            viewBox="0 -4 8 8"
            refX="7"
            refY="0"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto"
          >
            <path d="M0,-4L8,0L0,4L1.5,0Z" fill={style.color} />
          </marker>
        ))}
      </defs>
      <path
        d={`M18,${height - 28} Q${width / 2},${height - 3} ${width - 18},${height - 28}`}
        fill="none"
        stroke="var(--ls-chart-rule, #c7cfbf)"
      />
      <path
        d={`M36,54 Q${width / 2},6 ${width - 36},54`}
        fill="none"
        stroke="var(--ls-chart-rule, #d2c8aa)"
      />
      {[0.58, 1].map((scale) => (
        <ellipse
          key={scale}
          cx={width / 2}
          cy={height * 0.53}
          rx={Math.min(width * 0.44, 290) * scale}
          ry={Math.min(height * 0.37, 175) * scale}
          fill="none"
          stroke="var(--ls-chart-rule, #d9ddd3)"
          strokeDasharray={scale === 1 ? "2 6" : undefined}
        />
      ))}

      {edges.map((edge, index) => {
        const source = nodeById.get(edge.source)
        const target = nodeById.get(edge.target)
        if (!source || !target) return null
        const style = RELATION_STYLE[edge.relation] ?? RELATION_STYLE.attention
        const epistemicStyle =
          CLAIM_EDGE_STYLE[edge.claimClass] ?? CLAIM_EDGE_STYLE["philosophical-interpretation"]
        const active = !focusedId || edge.source === focusedId || edge.target === focusedId
        const isPraise = edge.relation === "praise" || edge.relation === "rumor"
        const isDesire = edge.relation === "desire" || edge.relation === "attention"
        const bend = (index % 5 - 2) * (beatId === "cheap-praise" ? 14 : 8)
        const midX = (source.x + target.x) / 2 + bend
        const midY = (source.y + target.y) / 2 - 12 - Math.abs(bend) * 0.25
        return (
          <path
            key={edge.id}
            d={`M${source.x},${source.y} Q${midX},${midY} ${target.x},${target.y}`}
            fill="none"
            stroke={style.color}
            strokeWidth={isDesire || isPraise ? 2.2 : 1.2}
            strokeDasharray={epistemicStyle.dash}
            markerEnd={`url(#ls-court-arrow-${edge.relation})`}
            opacity={active ? (isPraise && beatId === "cheap-praise" ? 0.9 : 0.78) : 0.08}
          />
        )
      })}

      {nodes.map((node) => {
        const active = !focusedId || connected.has(node.id) || node.id === focusId
        const isFocus = node.id === focusId || node.focus
        return (
          <g key={node.id} opacity={active ? 1 : 0.14}>
            {isFocus && (
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r + 10}
                fill="none"
                stroke={node.id === "strategist" ? "#4b6b64" : node.id === "orchid" ? "#b08a32" : "#a34f51"}
                strokeWidth="2"
                strokeDasharray="3 4"
              />
            )}
            {node.type === "object" ? (
              <path
                d={`M${node.x},${node.y - node.r} L${node.x + node.r},${node.y} L${node.x},${node.y + node.r} L${node.x - node.r},${node.y}Z`}
                fill={
                  isFocus
                    ? "var(--ls-court-object-focus, #e8c45a)"
                    : "var(--ls-court-object-fill, #d6b85d)"
                }
                stroke="#7d6838"
                strokeWidth={isFocus ? 2.2 : 1.3}
              />
            ) : node.type === "artificial" ? (
              <rect
                x={node.x - node.r}
                y={node.y - node.r}
                width={node.r * 2}
                height={node.r * 2}
                rx="3"
                fill={
                  isFocus
                    ? "var(--ls-court-ai-focus, #d5ebe4)"
                    : "var(--ls-court-ai-fill, #e8efeb)"
                }
                stroke="#4b6b64"
                strokeWidth={isFocus ? 2.4 : 1.3}
                strokeDasharray="3 2"
              />
            ) : (
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill={
                  isFocus
                    ? "var(--ls-chart-paper-deep, #fff8f4)"
                    : "var(--ls-chart-paper, #fffefa)"
                }
                stroke={isFocus ? "#a34f51" : "#667f73"}
                strokeWidth={isFocus ? 2.6 : 1.3}
              />
            )}
            <text
              x={node.x}
              y={node.y + node.r + 13}
              textAnchor="middle"
              fill="var(--ls-chart-ink, #314c42)"
              fontSize={isFocus ? 9 : 8}
              fontWeight="700"
              letterSpacing="0.3"
            >
              {node.label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function courtTooltip(hover) {
  const node = hover?.data ?? hover
  const raw = node?.datum ?? node?.data ?? node
  const datum = unwrapDatum(raw) ?? raw
  if (!datum || typeof datum !== "object") return null

  // Edge hover
  if (hover?.nodeOrEdge === "edge" || datum.relation) {
    const relation = datum.relation
    const sourceLabel = labelFor(typeof datum.source === "object" ? datum.source?.id : datum.source)
    const targetLabel = labelFor(typeof datum.target === "object" ? datum.target?.id : datum.target)
    if (relation) {
      return (
        <TooltipRoot chrome="css" className="ls-chart-tooltip">
          <span>{relation}</span>
          <strong>
            {sourceLabel} → {targetLabel}
          </strong>
          <small>{datum.statement ?? "A directed relationship in this beat’s scenario."}</small>
        </TooltipRoot>
      )
    }
  }

  const meaning =
    datum.meaning ?? COURT_NODES.find((item) => item.id === datum.id)?.meaning
  if (!datum.label && !meaning) return null

  return (
    <TooltipRoot chrome="css" className="ls-chart-tooltip">
      <span>{datum.type === "artificial" ? "AI / machine" : datum.type === "object" ? "Prize" : "Person"}</span>
      <strong>{datum.label}</strong>
      {meaning ? <small>{meaning}</small> : null}
    </TooltipRoot>
  )
}

function courtNodeDescription(node, edges) {
  if (node.meaning) return node.meaning
  const incoming = edges.filter((edge) => edge.target === node.id).length
  const outgoing = edges.filter((edge) => edge.source === node.id).length
  if (node.id === "outsider")
    return `${incoming} directed relationships arrive here. Their response remains unprogrammable.`
  if (node.type === "artificial")
    return `${outgoing} strategic outputs: praise, rumor, or advice without fatigue.`
  if (node.type === "object")
    return `${incoming} gazes make this reproducible object socially visible.`
  return `${incoming} incoming and ${outgoing} outgoing court relationships.`
}

function labelFor(id) {
  return COURT_NODES.find((node) => node.id === id)?.label ?? id
}
