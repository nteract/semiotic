"use client"

import * as React from "react"
import { AccessibleTableShell } from "./AccessibleTableShell"
import { DATA_TABLE_NETWORK_CLASS } from "./accessibleTableStyles"
import { SR_ONLY_STYLE } from "./AriaLiveTooltip"
import { useAccessibleTableInteraction } from "./useAccessibleTableInteraction"
import { countNetworkTableRows } from "./networkTableCounts"
import type { NetworkTableElement } from "./networkAccessibleDataTableModel"

const Content = React.lazy(() => import("./NetworkAccessibleDataTableContent"))

export interface NetworkAccessibleDataTableProps {
  nodes: NetworkTableElement[]
  edges: NetworkTableElement[]
  sceneRevision?: number
  chartType: string
  tableId?: string
  chartTitle?: string
}

/** The summary target and focus controls exist during SSR, hydration, and loading. */
export default function NetworkAccessibleDataTable(
  props: NetworkAccessibleDataTableProps
) {
  const { nodes, edges, chartTitle, chartType, tableId } = props
  const interaction = useAccessibleTableInteraction()
  const { nodeCount, edgeCount } = countNetworkTableRows(nodes, edges)
  if (!nodeCount && !edgeCount) {
    return tableId ? (
      <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} />
    ) : null
  }
  return (
    <AccessibleTableShell
      interaction={interaction}
      tableId={tableId}
      regionLabel={`Data summary for ${chartTitle || (tableId ? `${chartType} ${tableId}` : chartType)}`}
      countLabel={`${nodeCount} nodes, ${edgeCount} edges`}
      className={DATA_TABLE_NETWORK_CLASS}
    >
      {interaction.isExpanded && (
        <React.Suspense
          fallback={<div role="status">Loading data summary…</div>}
        >
          <Content {...props} revealRows={interaction.revealRows} />
        </React.Suspense>
      )}
    </AccessibleTableShell>
  )
}
