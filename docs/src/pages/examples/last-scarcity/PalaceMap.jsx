import React, { useCallback, useMemo, useState } from "react"
import { NetworkCustomChart, TooltipRoot } from "semiotic/network"
import { networkHitTarget, unwrapDatum, useCustomLayoutSelection } from "semiotic/recipes"
import { CHAPTERS, CLAIM_CLASS_META, PALACE_EDGES, PALACE_ROOMS } from "./lastScarcityData"

const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((chapter) => [chapter.id, chapter]))

/** Rooms enriched with chapter title/thesis for tooltips and the sticky readout. */
const PALACE_ROOMS_WITH_META = Object.freeze(
  PALACE_ROOMS.map((room) => {
    const chapter = CHAPTER_BY_ID[room.chapter]
    return {
      ...room,
      numeral: chapter?.numeral ?? String(room.reveal),
      title: chapter?.title ?? room.label,
      summary: chapter?.thesis ?? "",
    }
  }),
)

const ROOM_COLORS = {
  machine: "#607a70",
  office: "#889d8d",
  mirrors: "#ad9562",
  court: "#8f5965",
  bedroom: "#aa635b",
  arena: "#9a764b",
  barracks: "#4d6064",
  garden: "#6f8a67",
  commons: "#4f7769",
  observatory: "#53767d",
}

const EDGE_STYLES = {
  measurement: { dash: undefined, width: 1.35, opacity: 0.72 },
  "observed-association": { dash: "2 5", width: 1.8, opacity: 0.72 },
  "transparent-model": { dash: "10 3 2 3", width: 2.2, opacity: 0.82 },
  "philosophical-interpretation": { dash: "1 4", width: 1.65, opacity: 0.68 },
  "future-scenario": { dash: "8 6", width: 1.45, opacity: 0.58 },
  "reader-signal": { dash: "2 3", width: 1.8, opacity: 0.74 },
}

export default function PalaceMap({ stage, width, reducedMotion, onNavigate, onInspectEdge }) {
  const [inspectedRoom, setInspectedRoom] = useState(null)
  const height = Math.max(330, Math.min(470, Math.round(width * 0.72)))
  const visibleRooms = useMemo(
    () => PALACE_ROOMS_WITH_META.filter((room) => room.reveal <= stage),
    [stage],
  )

  const handleObservation = useCallback((event) => {
    if (event.type === "hover" && event.datum) {
      const datum = unwrapDatum(event.datum)
      setInspectedRoom(datum?.chapter || datum?.kind === "proposition" ? datum : null)
    } else if (event.type === "hover-end") {
      setInspectedRoom(null)
    }
  }, [])

  const handleClick = useCallback(
    (datum) => {
      const room = unwrapDatum(datum)
      if (room?.chapter) onNavigate?.(room.chapter)
    },
    [onNavigate],
  )

  return (
    <div className={`ls-palace ${stage >= 4 ? "is-baroque" : "is-modern"}`}>
      <div className="ls-palace__heading">
        <div>
          <span>Where you are</span>
          <h2>Chapter map</h2>
        </div>
        <span className="ls-palace__room-count">
          {stage === 0 ? "4 steps" : `${visibleRooms.length} of 10 sections`}
        </span>
      </div>

      <NetworkCustomChart
        nodes={PALACE_ROOMS_WITH_META}
        edges={PALACE_EDGES}
        layout={palaceLayout}
        layoutConfig={{ stage, reducedMotion }}
        width={width}
        height={height}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        chartId="last-scarcity-palace"
        selection={{ name: "last-scarcity-palace-selection" }}
        linkedHover={{ name: "last-scarcity-palace-selection", fields: ["id"] }}
        enableHover
        onObservation={handleObservation}
        onClick={handleClick}
        accessibleTable
        description="An evolving palace floor plan that begins as a four-step abundance diagram and progressively opens later chapters."
        summary={`Chapter ${stage + 1} of 9. ${stage === 0 ? "The map shows only abundant intelligence, production, free time, and human flourishing." : `${visibleRooms.length} of 10 rooms and ${PALACE_EDGES.filter((edge) => edge.reveal <= stage).length} relationships are visible.`}`}
        frameProps={{
          background: "transparent",
          tooltipContent: palaceTooltip,
        }}
      />

      <div className="ls-palace__readout" aria-live="polite">
        {inspectedRoom?.chapter ? (
          <>
            <span>{inspectedRoom.numeral}</span>
            <strong>{inspectedRoom.title}</strong>
            <small>{inspectedRoom.summary}</small>
            <button type="button" onClick={() => onNavigate?.(inspectedRoom.chapter)}>
              Go there
            </button>
          </>
        ) : inspectedRoom?.kind === "proposition" ? (
          <>
            <span>Prologue</span>
            <strong>{inspectedRoom.title ?? inspectedRoom.label}</strong>
            <small>{inspectedRoom.summary}</small>
          </>
        ) : (
          <>
            <span>Chapter {stage + 1} of 9</span>
            <strong>
              {stage === 0
                ? "The pitch"
                : (visibleRooms.at(-1)?.title ?? visibleRooms.at(-1)?.label)}
            </strong>
            <small>Hover a section, then click to jump.</small>
          </>
        )}
      </div>

      <PalaceAccessibleTranscript stage={stage} onInspectEdge={onInspectEdge} />
    </div>
  )
}

function palaceTooltip(hover) {
  // StreamNetworkFrame passes HoverData: { data: RealtimeNode, ... }.
  // Custom hit targets store the user object on node.datum (not node.data).
  const node = hover?.data ?? hover
  const raw = node?.datum ?? node?.data ?? node
  const datum = unwrapDatum(raw) ?? raw
  if (!datum || typeof datum !== "object") return null

  if (datum.kind === "proposition") {
    return (
      <TooltipRoot chrome="css" className="ls-chart-tooltip">
        <span>Prologue</span>
        <strong>{datum.title ?? datum.label}</strong>
        {datum.summary ? <small>{datum.summary}</small> : null}
      </TooltipRoot>
    )
  }

  if (datum.chapter || datum.title || datum.numeral) {
    return (
      <TooltipRoot chrome="css" className="ls-chart-tooltip">
        <span>{datum.numeral ?? `Chapter ${datum.reveal ?? ""}`}</span>
        <strong>{datum.title ?? datum.label}</strong>
        {datum.summary ? <small>{datum.summary}</small> : null}
      </TooltipRoot>
    )
  }

  return null
}

function palaceLayout(ctx) {
  const { plot } = ctx.dimensions
  const stage = ctx.config?.stage ?? 0

  if (stage === 0) {
    const steps = goodFutureSteps(plot.width, plot.height)
    const stepSummaries = [
      "Smarter machines enter the story as abundant means.",
      "Production gets easier once intelligence is cheap.",
      "Hours come free when production needs less human labor.",
      "The pitch ends in flourishing, as if free hours decide themselves.",
    ]
    return {
      sceneNodes: steps.map((step, index) => ({
        ...networkHitTarget({
          x: step.x,
          y: step.y - 20,
          width: step.width,
          height: 40,
          datum: {
            id: `good-future-${index + 1}`,
            label: step.label,
            kind: "proposition",
            numeral: "Prologue",
            title: step.label,
            summary: stepSummaries[index] ?? "",
          },
          id: `good-future-${index + 1}`,
          label: `Prologue step ${index + 1}: ${step.label}`,
        }),
        accessibility: {
          label: `Prologue step ${index + 1}: ${step.label}. ${stepSummaries[index] ?? ""}`,
          tableFields: {
            Chapter: "Prologue",
            Title: step.label,
            Summary: stepSummaries[index] ?? "",
          },
        },
      })),
      sceneEdges: [],
      restyle: () => undefined,
      overlays: <GoodFuturePlan width={plot.width} height={plot.height} />,
    }
  }

  if (!ctx.nodes.length) return { sceneNodes: [], sceneEdges: [] }

  const rooms = ctx.nodes
    .map(unwrapDatum)
    .filter((room) => room.reveal <= stage)
    .map((room) => ({
      ...room,
      px: (room.x / 100) * plot.width,
      py: (room.y / 100) * plot.height,
      pw: (room.w / 100) * plot.width,
      ph: (room.h / 100) * plot.height,
    }))

  const sceneNodes = rooms.map((room) => {
    const accessibilityLabel = `${room.numeral}: ${room.title}. ${room.summary}`
    return {
      ...networkHitTarget({
        x: room.px,
        y: room.py,
        width: room.pw,
        height: room.ph,
        datum: {
          id: room.id,
          chapter: room.chapter,
          label: room.label,
          short: room.short,
          numeral: room.numeral,
          title: room.title,
          summary: room.summary,
          reveal: room.reveal,
          kind: room.kind,
        },
        id: room.id,
        label: accessibilityLabel,
      }),
      accessibility: {
        label: accessibilityLabel,
        tableFields: {
          Chapter: room.numeral,
          Title: room.title,
          Summary: room.summary,
        },
      },
    }
  })

  return {
    sceneNodes,
    sceneEdges: [],
    restyle: () => undefined,
    overlays: (
      <PalaceOverlay
        rooms={rooms}
        edges={PALACE_EDGES.filter((edge) => edge.reveal <= stage)}
        stage={stage}
        plotWidth={plot.width}
        plotHeight={plot.height}
        reducedMotion={Boolean(ctx.config?.reducedMotion)}
      />
    ),
  }
}

function PalaceOverlay({ rooms, edges, stage, plotWidth, plotHeight, reducedMotion }) {
  const selection = useCustomLayoutSelection()
  const focusedId = selection.isActive
    ? (rooms.find((room) => selection.predicate(room))?.id ?? null)
    : null
  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const related = new Set(focusedId ? [focusedId] : [])
  if (focusedId) {
    edges.forEach((edge) => {
      if (edge.source === focusedId) related.add(edge.target)
      if (edge.target === focusedId) related.add(edge.source)
    })
  }

  if (stage === 0) {
    return <GoodFuturePlan width={plotWidth} height={plotHeight} />
  }

  return (
    <g className={`ls-palace-svg ${reducedMotion ? "is-reduced" : ""}`} pointerEvents="none">
      <defs>
        <marker
          id="ls-palace-arrow"
          viewBox="0 -4 8 8"
          refX="7"
          refY="0"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path
            d="M0,-4L8,0L0,4L1.6,0Z"
            fill="var(--ls-chart-ink-soft, #425e54)"
          />
        </marker>
        <pattern
          id="ls-palace-model-hatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <path
            d="M0 0V7"
            stroke="var(--ls-chart-rule, #6f8a67)"
            strokeWidth="1"
            opacity="0.22"
          />
        </pattern>
      </defs>

      <PalaceGround width={plotWidth} height={plotHeight} stage={stage} />

      {edges.map((edge) => {
        const source = roomById.get(edge.source)
        const target = roomById.get(edge.target)
        if (!source || !target) return null
        const active = !focusedId || edge.source === focusedId || edge.target === focusedId
        const style = EDGE_STYLES[edge.claimClass] ?? EDGE_STYLES["philosophical-interpretation"]
        const d = corridorPath(source, target, stage)
        return (
          <g key={edge.id} opacity={active ? style.opacity : 0.08}>
            <path
              d={d}
              fill="none"
              stroke="var(--ls-chart-paper-deep, #f8f6ee)"
              strokeWidth={style.width + 4.5}
            />
            <path
              d={d}
              fill="none"
              stroke="var(--ls-chart-ink-soft, #425e54)"
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              markerEnd={
                edge.claimClass === "transparent-model" ? "url(#ls-palace-arrow)" : undefined
              }
            />
          </g>
        )
      })}

      {rooms.map((room) => {
        const active = !focusedId || related.has(room.id)
        const current = room.reveal === stage
        return (
          <PalaceRoom
            key={room.id}
            room={room}
            stage={stage}
            opacity={active ? 1 : 0.2}
            current={current}
            focused={focusedId === room.id}
          />
        )
      })}

      {stage >= 3 && <VegetalFiligree width={plotWidth} height={plotHeight} density={stage} />}
    </g>
  )
}

function GoodFuturePlan({ width, height }) {
  const steps = goodFutureSteps(width, height)
  const centerX = width / 2
  return (
    <g className="ls-good-future-plan" pointerEvents="none">
      <defs>
        <marker
          id="ls-palace-arrow"
          viewBox="0 -4 8 8"
          refX="7"
          refY="0"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path
            d="M0,-4L8,0L0,4L1.6,0Z"
            fill="var(--ls-chart-ink-soft, #425e54)"
          />
        </marker>
      </defs>
      {steps.map((step, index) => {
        const previous = steps[index - 1]
        return (
          <g key={step.label}>
            {previous && (
              <path
                d={`M${centerX},${previous.y + 31}V${step.y - 21}`}
                stroke="var(--ls-chart-ink-soft, #6f8a7d)"
                strokeWidth="1.4"
                markerEnd="url(#ls-palace-arrow)"
              />
            )}
            <rect
              x={step.x}
              y={step.y - 20}
              width={step.width}
              height="40"
              rx="2"
              fill="var(--ls-chart-paper, #fffef9)"
              stroke="var(--ls-chart-ink-soft, #4f7064)"
            />
            <text
              x={centerX}
              y={step.y + 4}
              textAnchor="middle"
              fill="var(--ls-chart-ink, #29483e)"
              fontSize="11"
              fontWeight="700"
              letterSpacing="1.7"
            >
              {step.label}
            </text>
          </g>
        )
      })}
      <text
        x={centerX}
        y={height - 12}
        textAnchor="middle"
        fill="var(--ls-chart-ink-soft, #8a8f87)"
        fontSize="9"
        letterSpacing="1.3"
      >
        NO RIVALRY · NO REFUSAL · NO GOVERNMENT
      </text>
    </g>
  )
}

function goodFutureSteps(width, height) {
  const labels = ["ABUNDANT INTELLIGENCE", "ABUNDANT PRODUCTION", "FREE TIME", "HUMAN FLOURISHING"]
  const boxWidth = Math.min(300, width * 0.68)
  const startY = 44
  const gap = Math.max(54, (height - 100) / 3)
  return labels.map((label, index) => ({
    label,
    x: width / 2 - boxWidth / 2,
    y: startY + index * gap,
    width: boxWidth,
  }))
}

function PalaceGround({ width, height, stage }) {
  return (
    <g>
      <rect
        x="1"
        y="1"
        width={width - 2}
        height={height - 2}
        rx={stage >= 4 ? 18 : 3}
        fill="var(--ls-chart-paper, #fffefa)"
        stroke="var(--ls-chart-rule, #b8c3b8)"
        strokeWidth="1"
      />
      <path
        d={`M${width / 2} 2V${height - 2}M2 ${height * 0.64}H${width - 2}`}
        stroke="var(--ls-chart-rule, #d9ddd3)"
        strokeWidth="0.7"
        strokeDasharray={stage >= 4 ? "2 7" : undefined}
      />
      {stage >= 4 && (
        <path
          d={`M18,${height / 2} C${width * 0.22},${height * 0.16} ${width * 0.78},${height * 0.84} ${width - 18},${height / 2}`}
          fill="none"
          stroke="var(--ls-chart-rule, #d7cfb7)"
          strokeWidth="0.8"
        />
      )}
    </g>
  )
}

function PalaceRoom({ room, stage, opacity, current, focused }) {
  const color = ROOM_COLORS[room.id]
  const radius = stage >= 4 ? Math.min(14, room.ph * 0.18) : 2
  const labelY = room.py + room.ph / 2
  return (
    <g opacity={opacity}>
      <rect
        x={room.px}
        y={room.py}
        width={room.pw}
        height={room.ph}
        rx={radius}
        fill={current ? `${color}1f` : "var(--ls-chart-paper, #fffefa)"}
        stroke={color}
        strokeWidth={focused || current ? 2.5 : 1.15}
      />
      {stage >= 4 && (
        <>
          <path
            d={`M${room.px + 5},${room.py + room.ph * 0.45} Q${room.px + room.pw * 0.15},${room.py + 5} ${room.px + room.pw * 0.42},${room.py + 5}`}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity="0.58"
          />
          <path
            d={`M${room.px + room.pw - 5},${room.py + room.ph * 0.55} Q${room.px + room.pw * 0.85},${room.py + room.ph - 5} ${room.px + room.pw * 0.58},${room.py + room.ph - 5}`}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity="0.58"
          />
        </>
      )}
      {room.id === "mirrors" && stage >= 3 && (
        <path
          d={`M${room.px + 8},${room.py + room.ph - 8} Q${room.px + room.pw / 2},${room.py - 7} ${room.px + room.pw - 8},${room.py + room.ph - 8}`}
          fill="none"
          stroke={color}
          opacity="0.32"
        />
      )}
      {room.id === "observatory" && (
        <circle
          cx={room.px + room.pw / 2}
          cy={room.py + room.ph / 2}
          r={Math.min(room.pw, room.ph) * 0.26}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          opacity="0.5"
        />
      )}
      <text
        x={room.px + room.pw / 2}
        y={labelY - 2}
        textAnchor="middle"
        fill="var(--ls-chart-ink, #243f36)"
        fontSize={room.pw < 62 ? 7.5 : 8.5}
        fontWeight="700"
        letterSpacing="0.45"
      >
        {room.short.toUpperCase()}
      </text>
      <text
        x={room.px + room.pw / 2}
        y={labelY + 11}
        textAnchor="middle"
        fill={color}
        fontSize="6.7"
        letterSpacing="0.7"
      >
        {room.kind.toUpperCase()}
      </text>
    </g>
  )
}

function VegetalFiligree({ width, height, density }) {
  const paths = [
    `M8,${height - 8} C42,${height - 34} 20,${height - 82} 66,${height - 108} S116,${height - 166} 92,${height - 190}`,
    `M${width - 8},8 C${width - 46},36 ${width - 24},82 ${width - 70},108 S${width - 120},166 ${width - 96},190`,
  ]
  return (
    <g fill="none" stroke="#708b70" opacity={Math.min(0.48, 0.12 + density * 0.04)}>
      {paths.map((d, index) => (
        <path key={d} d={d} strokeWidth="1.1" />
      ))}
      {density >= 6 && (
        <>
          <path
            d={`M18,${height - 38}q18-17 34 0q-18 12-34 0Z`}
            fill="#8aa07d"
            stroke="none"
            opacity="0.45"
          />
          <path
            d={`M${width - 18},38q-18 17-34 0q18-12 34 0Z`}
            fill="#8aa07d"
            stroke="none"
            opacity="0.45"
          />
        </>
      )}
    </g>
  )
}

function corridorPath(source, target, stage) {
  const sx = source.px + source.pw / 2
  const sy = source.py + source.ph / 2
  const tx = target.px + target.pw / 2
  const ty = target.py + target.ph / 2
  if (stage < 3) return `M${sx},${sy} H${(sx + tx) / 2} V${ty} H${tx}`
  const bend = Math.max(20, Math.abs(tx - sx) * 0.42)
  return `M${sx},${sy} C${sx + Math.sign(tx - sx || 1) * bend},${sy} ${tx - Math.sign(tx - sx || 1) * bend},${ty} ${tx},${ty}`
}

function PalaceAccessibleTranscript({ stage, onInspectEdge }) {
  const rooms = PALACE_ROOMS_WITH_META.filter((room) => room.reveal <= stage)
  const edges = PALACE_EDGES.filter((edge) => edge.reveal <= stage)
  return (
    <details className="ls-palace-transcript">
      <summary>Read the current palace as a tree</summary>
      {stage === 0 ? (
        <ol>
          <li>Abundant intelligence</li>
          <li>Abundant production</li>
          <li>Free time</li>
          <li>Human flourishing</li>
        </ol>
      ) : (
        <ul>
          {rooms.map((room) => (
            <li key={room.id}>
              <strong>
                {room.numeral}: {room.title}
              </strong>
              <p>{room.summary}</p>
              <ul>
                {edges
                  .filter((edge) => edge.source === room.id || edge.target === room.id)
                  .map((edge) => (
                    <li key={edge.id}>
                      <button type="button" onClick={() => onInspectEdge?.(edge)}>
                        {CLAIM_CLASS_META[edge.claimClass].shortLabel}: {edge.statement}
                      </button>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
