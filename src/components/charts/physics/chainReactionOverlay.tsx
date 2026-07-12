import * as React from "react"
import type { Datum } from "../shared/datumTypes"
import type {
  DependencyMachine,
  DependencyMachineNode,
  DependencyTrackLayout
} from "./dependencyMachine"
import type { RuntimeState } from "./chainReactionRuntime"

function statusColor<TDatum extends Datum>(
  node: DependencyMachineNode<TDatum>,
  runtime: RuntimeState
): string {
  if (runtime.completed.has(node.id)) return "var(--semiotic-success, #2b8a66)"
  if (runtime.blockers.has(node.id)) return "var(--semiotic-error, #c64035)"
  if (node.status === "in-progress") return "var(--semiotic-warning, #d18a22)"
  if (runtime.armed.has(node.id)) return "var(--semiotic-primary, #2474a6)"
  return "var(--semiotic-muted, #75818a)"
}

export interface ChainReactionOverlayProps<TDatum extends Datum = Datum> {
  machine: DependencyMachine<TDatum>
  layout: DependencyTrackLayout
  runtime: RuntimeState
  downstreamSet: ReadonlySet<string>
  selectedSet: ReadonlySet<string>
  width: number
  height: number
  seed: number
  reduced: boolean
  onSelectTask: (taskID: string) => void
}

/**
 * SVG chrome painted above the physics canvas: workstream lanes, dependency
 * tracks + delivery sockets, and the domino task cards (which topple on
 * completion). Interaction is delegated back through `onSelectTask`.
 */
export function ChainReactionOverlay<TDatum extends Datum = Datum>({
  machine,
  layout,
  runtime,
  downstreamSet,
  selectedSet,
  width,
  height,
  seed,
  reduced,
  onSelectTask
}: ChainReactionOverlayProps<TDatum>): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
    >
      <defs>
        <filter id={`chain-shadow-${seed}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>
      {machine.lanes.map((lane, laneIndex) => {
        const laneTasks = layout.tasks.filter((task) => task.laneIndex === laneIndex)
        const x = laneTasks[0]?.x ?? 0
        return (
          <g key={lane}>
            <line
              x1={x}
              x2={x}
              y1={32}
              y2={height - 24}
              stroke="var(--semiotic-grid, #d7dde0)"
              strokeWidth={1}
              strokeDasharray="3 7"
            />
            <text
              x={x}
              y={23}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="var(--semiotic-text, #243039)"
            >
              {lane}
            </text>
          </g>
        )
      })}
      {layout.routes.map((route) => {
        const delivered = runtime.delivered.has(route.edgeID)
        const active = runtime.inFlight.has(route.edgeID)
        const highlighted = downstreamSet.has(route.targetID) || downstreamSet.has(route.sourceID)
        const points = route.points.map((point) => `${point.x},${point.y}`).join(" ")
        return (
          <polyline
            key={route.edgeID}
            points={points}
            fill="none"
            stroke={highlighted
              ? "var(--semiotic-highlight, #e08a1e)"
              : delivered
                ? "var(--semiotic-success, #2b8a66)"
                : "var(--semiotic-grid, #aeb8bd)"}
            strokeWidth={highlighted ? 4 : active ? 3 : 2}
            strokeOpacity={delivered || active || highlighted ? 0.95 : 0.48}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
      {layout.sockets.map((socket) => {
        const delivered = runtime.delivered.has(socket.edgeID)
        return (
          <g key={socket.id}>
            <circle
              cx={socket.x}
              cy={socket.y}
              r={socket.radius + 2}
              fill="var(--semiotic-background, #fff)"
              stroke="var(--semiotic-text, #243039)"
              strokeWidth={1.5}
            />
            {delivered && (
              <circle
                cx={socket.x}
                cy={socket.y}
                r={socket.radius - 0.5}
                fill="var(--semiotic-success, #2b8a66)"
              />
            )}
          </g>
        )
      })}
      {machine.nodes.map((node) => {
        const task = layout.taskByID.get(node.id)
        if (!task) return null
        const completed = runtime.completed.has(node.id)
        const blocked = runtime.blockers.has(node.id)
        const previewed = runtime.previewTaskID === node.id
        const selected = selectedSet.has(node.id) || previewed
        const downstream = downstreamSet.has(node.id)
        const color = statusColor(node, runtime)
        const x = task.x - task.width / 2
        const y = task.y - task.height / 2
        const progressHeight = Math.max(2, task.height * node.progress)
        return (
          <g key={node.id}>
            <g
              style={{
                transform: `rotate(${completed ? 76 : 0}deg)`,
                transformBox: "fill-box",
                transformOrigin: "50% 100%",
                transition: reduced ? "none" : "transform 520ms cubic-bezier(.2,.8,.25,1)",
                filter: "url(#chain-shadow-" + seed + ")"
              }}
            >
              <rect
                x={x}
                y={y}
                width={task.width}
                height={task.height}
                rx={node.milestone ? 12 : 4}
                fill="var(--semiotic-background, #fff)"
                stroke={selected || downstream ? "var(--semiotic-highlight, #e08a1e)" : color}
                strokeWidth={selected ? 4 : downstream ? 3 : 2}
              />
              <rect
                x={x + 3}
                y={y + task.height - progressHeight + 1}
                width={task.width - 6}
                height={Math.max(0, progressHeight - 4)}
                rx={2}
                fill={color}
                opacity={completed ? 0.86 : 0.46}
              />
            </g>
            {blocked && (
              <g opacity={previewed ? 0.28 : 1}>
                <line
                  x1={x - 8}
                  x2={x + 14}
                  y1={task.y + 9}
                  y2={task.y - 9}
                  stroke="var(--semiotic-error, #c64035)"
                  strokeWidth={7}
                  strokeLinecap="round"
                />
                <circle cx={x - 8} cy={task.y + 9} r={3} fill="var(--semiotic-error, #c64035)" />
              </g>
            )}
            <g
              onPointerDown={() => onSelectTask(node.id)}
              style={{ cursor: "pointer", pointerEvents: "auto" }}
            >
              <rect x={x} y={y} width={task.width} height={task.height} fill="transparent" />
              <text
                x={task.x}
                y={task.y - 4}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={700}
                fill="var(--semiotic-text, #243039)"
              >
                {node.label.length > 24 ? `${node.label.slice(0, 22)}…` : node.label}
              </text>
              <text
                x={task.x}
                y={task.y + 12}
                textAnchor="middle"
                fontSize={9.5}
                fill="var(--semiotic-text-muted, #5f6b72)"
              >
                {Math.round(node.progress * 100)}% · {completed ? "done" : blocked ? "blocked" : runtime.armed.has(node.id) ? "ready" : "waiting"}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
