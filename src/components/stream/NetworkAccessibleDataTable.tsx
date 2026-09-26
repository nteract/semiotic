"use client"
import * as React from "react"
import { AccessibleTableMoreRows } from "./AccessibleTableMoreRows"
import { AccessibleDataRowsTable } from "./AccessibleDataRowsTable"
import { AccessibleTableShell } from "./AccessibleTableShell"
import {
  SAMPLE_SIZE,
  PAGE_SIZE,
  DATA_TABLE_NETWORK_CLASS,
  VISIBLE_TABLE_STYLE
} from "./accessibleTableStyles"
import { SR_ONLY_STYLE } from "./AriaLiveTooltip"
import { useAccessibleTableInteraction } from "./useAccessibleTableInteraction"
import {
  buildNetworkTableModel,
  countNetworkTableRows,
  type NetworkTableElement
} from "./networkAccessibleDataTableModel"

// ── NetworkAccessibleDataTable ──────────────────────────────────────────

interface NetworkAccessibleDataTableProps {
  nodes: NetworkTableElement[]
  edges: NetworkTableElement[]
  sceneRevision?: number
  chartType: string
  tableId?: string
  chartTitle?: string
}

/**
 * JIT accessible data summary for network charts.
 */
export default function NetworkAccessibleDataTable({
  nodes,
  edges,
  sceneRevision,
  chartType,
  tableId,
  chartTitle
}: NetworkAccessibleDataTableProps) {
  const [visibleNodeCount, setVisibleNodeCount] = React.useState(SAMPLE_SIZE)
  const [visibleEdgeCount, setVisibleEdgeCount] = React.useState(SAMPLE_SIZE)
  const interaction = useAccessibleTableInteraction()
  const { isExpanded, revealRows } = interaction
  const nodeKey = sceneRevision ?? nodes
  const edgeKey = sceneRevision ?? edges
  // Geometry-only animation replaces scene arrays without changing their data.
  const model = React.useMemo(
    () => (isExpanded ? buildNetworkTableModel(nodes, edges) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isExpanded, nodeKey, edgeKey]
  )
  const regionLabel = chartTitle
    ? `Data summary for ${chartTitle}`
    : tableId
      ? `Data summary for ${chartType} ${tableId}`
      : `Data summary for ${chartType}`

  // Reset paging on any collapse path (close button, blur, ChartContainer
  // toggle) so reopening never re-renders the full network at once.
  React.useEffect(() => {
    if (!isExpanded) {
      setVisibleNodeCount(SAMPLE_SIZE)
      setVisibleEdgeCount(SAMPLE_SIZE)
    }
  }, [isExpanded])

  const { nodeCount, edgeCount } = countNetworkTableRows(nodes, edges)

  if (nodeCount === 0 && edgeCount === 0) {
    return tableId ? (
      <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} />
    ) : null
  }

  const shell = {
    interaction,
    tableId,
    regionLabel,
    countLabel: `${nodeCount} nodes, ${edgeCount} edges`
  }
  if (!isExpanded)
    return (
      <AccessibleTableShell {...shell} className={DATA_TABLE_NETWORK_CLASS} />
    )

  const { nodeRows, edgeRows, hasWeights, summary } = model!

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
    <AccessibleTableShell
      {...shell}
      summary={summary}
      className={DATA_TABLE_NETWORK_CLASS}
    >
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
      <AccessibleTableMoreRows remaining={remainingNodes} onClick={showMoreNodes} kind="node" />
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
      <AccessibleTableMoreRows remaining={remainingEdges} onClick={showMoreEdges} kind="edge" />
    </AccessibleTableShell>
  )
}
