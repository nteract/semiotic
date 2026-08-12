import * as React from "react"
import type { Datum } from "../shared/datumTypes"
import {
  calculateBlockerAmplification,
  type DependencyMachine
} from "./dependencyMachine"
import type { RuntimeState } from "./chainReactionRuntime"

const hiddenTableStyle: React.CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1
}

export function ChainReactionAccessibleTable<TDatum extends Datum>({
  blockerSummary,
  machine,
  runtime
}: {
  blockerSummary: string
  machine: DependencyMachine<TDatum>
  runtime: RuntimeState
}) {
  return (
    <table style={hiddenTableStyle}>
      <caption>{blockerSummary}</caption>
      <thead>
        <tr>
          <th>Task</th>
          <th>Lane</th>
          <th>Progress</th>
          <th>State</th>
          <th>Waiting on</th>
          <th>Downstream reach</th>
        </tr>
      </thead>
      <tbody>
        {machine.nodes.map((node) => {
          const amplification = calculateBlockerAmplification(
            machine,
            node.id,
            { completedTaskIDs: runtime.completed }
          )
          const state = runtime.completed.has(node.id)
            ? "Completed"
            : runtime.blockers.has(node.id)
              ? "Blocked"
              : runtime.armed.has(node.id)
                ? "Armed"
                : "Waiting"
          const waitingOn =
            runtime.blockers.get(node.id) ??
            (node.dependencyIDs
              .filter((id) => !runtime.completed.has(id))
              .join(", ") ||
              "None")
          return (
            <tr key={node.id}>
              <th scope="row">{node.label}</th>
              <td>{node.lane}</td>
              <td>{Math.round(node.progress * 100)}%</td>
              <td>{state}</td>
              <td>{waitingOn}</td>
              <td>
                {amplification.downstreamTaskCount} tasks /{" "}
                {amplification.affectedLaneCount} lanes
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
