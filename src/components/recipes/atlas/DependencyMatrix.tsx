import * as React from "react"
import {
  dependencyMatrix,
  type DependencyForestProjection
} from "./dependencyForest"

export function DependencyMatrix({
  forest,
  nodeIds,
  onSelectEdges
}: {
  forest: DependencyForestProjection
  nodeIds: string[]
  onSelectEdges?: (ids: string[]) => void
}) {
  const cells = dependencyMatrix(forest, nodeIds)
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        aria-label="Local directed adjacency matrix"
        style={{
          borderCollapse: "collapse",
          width: "100%",
          textAlign: "center"
        }}
      >
        <caption>
          Rows are sources; columns are destinations. Cells count original edge
          IDs.
        </caption>
        <thead>
          <tr>
            <th scope="col">From / to</th>
            {nodeIds.map((id) => (
              <th key={id} scope="col">
                {id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nodeIds.map((source) => (
            <tr key={source}>
              <th scope="row">{source}</th>
              {nodeIds.map((target) => {
                const cell = cells.find(
                  (item) => item.source === source && item.target === target
                )
                return (
                  <td
                    key={target}
                    style={{
                      border: "1px solid var(--semiotic-border, currentColor)",
                      padding: 5
                    }}
                  >
                    {cell ? (
                      <button
                        style={{
                          color: "var(--semiotic-text, inherit)",
                          background: "var(--semiotic-surface, transparent)",
                          border:
                            "1px solid var(--semiotic-border, currentColor)",
                          borderRadius: 4,
                          minWidth: 32,
                          minHeight: 32
                        }}
                        type="button"
                        title={cell.edgeIds.join(", ")}
                        aria-label={`${source} to ${target}: ${cell.edgeIds.join(", ")}`}
                        onClick={() => onSelectEdges?.(cell.edgeIds)}
                      >
                        {cell.edgeIds.length}
                      </button>
                    ) : (
                      "·"
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
