"use client"
import * as React from "react"
import { AccessibleTableMoreRows } from "./AccessibleTableMoreRows"
import { AccessibleDataRowsTable } from "./AccessibleDataRowsTable"
import {
  SAMPLE_SIZE,
  PAGE_SIZE,
  SUMMARY_NOTE_STYLE,
  VISIBLE_TABLE_STYLE
} from "./accessibleTableStyles"
import type { useAccessibleTableInteraction } from "./useAccessibleTableInteraction"
import type { NetworkAccessibleDataTableProps } from "./NetworkAccessibleDataTable"
import { buildNetworkTableModel } from "./networkAccessibleDataTableModel"

/** Expanded rows and statistics load only after the eager summary is opened. */
export default function NetworkAccessibleDataTableContent({
  nodes,
  edges,
  sceneRevision,
  chartType,
  revealRows
}: NetworkAccessibleDataTableProps &
  Pick<ReturnType<typeof useAccessibleTableInteraction>, "revealRows">) {
  const [visibleNodeCount, setVisibleNodeCount] = React.useState(SAMPLE_SIZE)
  const [visibleEdgeCount, setVisibleEdgeCount] = React.useState(SAMPLE_SIZE)
  const nodeKey = sceneRevision ?? nodes
  const edgeKey = sceneRevision ?? edges
  // Geometry-only animation replaces scene arrays without changing their data.
  const model = React.useMemo(
    () => buildNetworkTableModel(nodes, edges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeKey, edgeKey]
  )
  const { nodeRows, edgeRows, hasWeights, summary } = model

  const shownNodeCount = Math.min(visibleNodeCount, nodeRows.length)
  const sampleNodes = nodeRows.slice(0, shownNodeCount)
  const remainingNodes = nodeRows.length - shownNodeCount
  const shownEdgeCount = Math.min(visibleEdgeCount, edgeRows.length)
  const sampleEdges = edgeRows.slice(0, shownEdgeCount)
  const remainingEdges = edgeRows.length - shownEdgeCount

  const degreeColumns = [
    { label: "degree", values: sampleNodes.map((row) => row.degree) },
    { label: "in", values: sampleNodes.map((row) => row.inDeg) },
    { label: "out", values: sampleNodes.map((row) => row.outDeg) },
    ...(hasWeights
      ? [
          { label: "w. degree", values: sampleNodes.map((row) => row.wDegree) },
          { label: "w. in", values: sampleNodes.map((row) => row.wInDeg) },
          { label: "w. out", values: sampleNodes.map((row) => row.wOutDeg) }
        ]
      : [])
  ]

  const showMoreNodes = (event: React.MouseEvent<HTMLButtonElement>) => {
    revealRows(
      event.currentTarget,
      shownNodeCount,
      Math.min(shownNodeCount + PAGE_SIZE, nodeRows.length),
      nodeRows.length,
      "nodes"
    )
    setVisibleNodeCount((c) => c + PAGE_SIZE)
  }
  const showMoreEdges = (event: React.MouseEvent<HTMLButtonElement>) => {
    revealRows(
      event.currentTarget,
      shownEdgeCount,
      Math.min(shownEdgeCount + PAGE_SIZE, edgeRows.length),
      edgeRows.length,
      "edges"
    )
    setVisibleEdgeCount((c) => c + PAGE_SIZE)
  }

  return (
    <>
      <div
        className="semiotic-accessible-data-table-summary"
        role="note"
        style={SUMMARY_NOTE_STYLE}
      >
        {summary}
      </div>
      {nodeRows.length > 0 && (
        <AccessibleDataRowsTable
          rows={sampleNodes.map((row) => row.semantic)}
          label={`Node data and degree summary for ${chartType}`}
          typeLabel="node"
          labelRows
          extraColumns={degreeColumns}
          caption={
            remainingNodes > 0
              ? `Top ${shownNodeCount} of ${nodeRows.length} nodes by degree`
              : `All ${nodeRows.length} nodes by degree`
          }
        />
      )}
      <AccessibleTableMoreRows
        remaining={remainingNodes}
        onClick={showMoreNodes}
        kind="node"
      />
      {edgeRows.length > 0 && (
        <AccessibleDataRowsTable
          rows={sampleEdges}
          label={`Edge data for ${chartType}`}
          typeLabel="edge"
          labelRows
          className="semiotic-accessible-data-table-table semiotic-accessible-data-table-edges"
          style={{ ...VISIBLE_TABLE_STYLE, marginTop: 12 }}
          caption={
            remainingEdges > 0
              ? `First ${shownEdgeCount} of ${edgeRows.length} edges`
              : `All ${edgeRows.length} edges`
          }
        />
      )}
      <AccessibleTableMoreRows
        remaining={remainingEdges}
        onClick={showMoreEdges}
        kind="edge"
      />
    </>
  )
}
