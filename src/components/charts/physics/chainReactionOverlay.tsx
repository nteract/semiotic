import * as React from "react"
import type { Datum } from "../shared/datumTypes"
import type {
  DependencyMachine,
  DependencyMachineNode,
  DependencyTrackLayout
} from "./dependencyMachine"
import type { RuntimeState } from "./chainReactionRuntime"

// Theme tokens match themeToCSS / ThemeProvider.

function statusColor<TDatum extends Datum>(
  node: DependencyMachineNode<TDatum>,
  runtime: RuntimeState
): string {
  if (runtime.completed.has(node.id)) return "var(--semiotic-success, #2b8a66)"
  if (runtime.blockers.has(node.id)) return "var(--semiotic-danger, #c64035)"
  if (node.status === "in-progress") return "var(--semiotic-warning, #d18a22)"
  if (runtime.armed.has(node.id)) return "var(--semiotic-primary, #2474a6)"
  return "var(--semiotic-text-secondary, #75818a)"
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
 * tracks + delivery sockets, and task cards. Cards stay upright for reading;
 * completion is a fill/status change, not a full tipple that destroys the DAG.
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
  const hasFocus = selectedSet.size > 0 || downstreamSet.size > 0
  const focusSet = React.useMemo(() => {
    const set = new Set<string>([...selectedSet, ...downstreamSet])
    // Include direct parents of the selected task so the blocked edge is visible.
    for (const id of selectedSet) {
      for (const edge of machine.incoming.get(id) ?? []) set.add(edge.sourceID)
    }
    return set
  }, [downstreamSet, machine.incoming, selectedSet])

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
          <feDropShadow
            dx="0"
            dy="1.5"
            stdDeviation="1.5"
            floodColor="var(--semiotic-text, #243039)"
            floodOpacity="0.16"
          />
        </filter>
      </defs>

      {/* Lane rails + labels */}
      {machine.lanes.map((lane, laneIndex) => {
        const laneTasks = layout.tasks.filter((task) => task.laneIndex === laneIndex)
        const x = laneTasks[0]?.x ?? 0
        return (
          <g key={lane}>
            <line
              x1={x}
              x2={x}
              y1={36}
              y2={height - 20}
              stroke="var(--semiotic-grid, #d7dde0)"
              strokeWidth={1}
              strokeDasharray="3 7"
              opacity={0.7}
            />
            <text
              x={x}
              y={24}
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

      {/* Dependency routes — dim everything not on the focus path when a task is selected */}
      {layout.routes.map((route) => {
        const delivered = runtime.delivered.has(route.edgeID)
        const active = runtime.inFlight.has(route.edgeID)
        const onPath =
          !hasFocus ||
          (focusSet.has(route.sourceID) && focusSet.has(route.targetID)) ||
          selectedSet.has(route.sourceID) ||
          selectedSet.has(route.targetID) ||
          downstreamSet.has(route.targetID)
        const points = route.points.map((point) => `${point.x},${point.y}`).join(" ")
        return (
          <polyline
            key={route.edgeID}
            points={points}
            fill="none"
            stroke={
              onPath
                ? delivered
                  ? "var(--semiotic-success, #2b8a66)"
                  : active
                    ? "var(--semiotic-warning, #e08a1e)"
                    : "var(--semiotic-primary, #2474a6)"
                : "var(--semiotic-border, #aeb8bd)"
            }
            strokeWidth={onPath ? (active ? 3.5 : 2.5) : 1.25}
            strokeOpacity={onPath ? 0.95 : hasFocus ? 0.12 : 0.35}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}

      {/* Receiving sockets */}
      {layout.sockets.map((socket) => {
        const delivered = runtime.delivered.has(socket.edgeID)
        const route = layout.routeByEdgeID.get(socket.edgeID)
        const onPath =
          !hasFocus ||
          (route &&
            (focusSet.has(route.sourceID) ||
              focusSet.has(route.targetID) ||
              selectedSet.has(route.targetID)))
        return (
          <g key={socket.id} opacity={onPath ? 1 : hasFocus ? 0.15 : 0.7}>
            <circle
              cx={socket.x}
              cy={socket.y}
              r={socket.radius + 2}
              fill="var(--semiotic-bg, #fff)"
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

      {/* Task cards — upright, non-overlapping; completion = status paint, not a tipple */}
      {machine.nodes.map((node) => {
        const task = layout.taskByID.get(node.id)
        if (!task) return null
        const completed = runtime.completed.has(node.id)
        const blocked = runtime.blockers.has(node.id)
        const previewed = runtime.previewTaskID === node.id
        const selected = selectedSet.has(node.id) || previewed
        const downstream = downstreamSet.has(node.id)
        const inFocus = !hasFocus || focusSet.has(node.id) || selected || downstream
        const color = statusColor(node, runtime)
        const x = task.x - task.width / 2
        const y = task.y - task.height / 2
        const progressHeight = Math.max(2, task.height * Math.max(0.08, node.progress))
        return (
          <g key={node.id} opacity={inFocus ? 1 : 0.18}>
            <g
              style={{
                // Mild tip only when complete — full 76° tipple made the DAG unreadable
                // and looked like stacked cards. Keep identity, signal done with fill.
                transform: completed && !reduced ? "rotate(8deg)" : "none",
                transformBox: "fill-box",
                transformOrigin: "50% 100%",
                transition: reduced ? "none" : "transform 420ms cubic-bezier(.2,.8,.25,1)",
                filter: selected || downstream ? `url(#chain-shadow-${seed})` : undefined,
              }}
            >
              <rect
                x={x}
                y={y}
                width={task.width}
                height={task.height}
                rx={node.milestone ? 12 : 5}
                fill="var(--semiotic-bg, #fff)"
                stroke={
                  selected
                    ? "var(--semiotic-warning, #e08a1e)"
                    : downstream
                      ? "var(--semiotic-primary, #2474a6)"
                      : color
                }
                strokeWidth={selected ? 3.5 : downstream ? 2.75 : 1.75}
              />
              <rect
                x={x + 3}
                y={y + task.height - progressHeight + 1}
                width={task.width - 6}
                height={Math.max(0, progressHeight - 4)}
                rx={2}
                fill={color}
                opacity={completed ? 0.9 : 0.48}
              />
            </g>
            {blocked && (
              <g opacity={previewed ? 0.35 : 1}>
                <line
                  x1={x - 6}
                  x2={x + 12}
                  y1={task.y + 8}
                  y2={task.y - 8}
                  stroke="var(--semiotic-danger, #c64035)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                <circle cx={x - 6} cy={task.y + 8} r={2.5} fill="var(--semiotic-danger, #c64035)" />
              </g>
            )}
            {downstream && !selected && (
              <text
                x={x + task.width - 4}
                y={y + 11}
                textAnchor="end"
                fontSize={8}
                fontWeight={800}
                fill="var(--semiotic-primary, #2474a6)"
              >
                ↓ stuck
              </text>
            )}
            <g
              onPointerDown={() => onSelectTask(node.id)}
              style={{ cursor: "pointer", pointerEvents: "auto" }}
            >
              <rect x={x} y={y} width={task.width} height={task.height} fill="transparent" />
              <text
                x={task.x}
                y={task.y - 5}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={700}
                fill="var(--semiotic-text, #243039)"
              >
                {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
              </text>
              <text
                x={task.x}
                y={task.y + 11}
                textAnchor="middle"
                fontSize={9.5}
                fill="var(--semiotic-text-secondary, #5f6b72)"
              >
                {Math.round(node.progress * 100)}% ·{" "}
                {completed
                  ? "done"
                  : blocked
                    ? "blocked"
                    : runtime.armed.has(node.id)
                      ? "ready"
                      : "waiting"}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
