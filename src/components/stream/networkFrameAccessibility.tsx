import * as React from "react"
import { AccessibleTablePortal, ScreenReaderSummary } from "./AccessibleDataTable"
import { NetworkAccessibleDataTableSlot } from "./NetworkAccessibleDataTableSlot"
import type { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { StreamNetworkFrameProps } from "./networkTypes"

/** Use the same authored table and summary markup before and after hydration. */
export function networkFrameAccessibility(
  props: StreamNetworkFrameProps,
  store: NetworkPipelineStore,
  tableId: string,
  sceneRevision?: number
) {
  const { accessibleTable = true, summary, title } = props
  return (
    <>
      {accessibleTable && (
        <AccessibleTablePortal accessibleTable={accessibleTable}>
          <NetworkAccessibleDataTableSlot
            sceneRevision={sceneRevision}
            nodes={store.sceneNodes}
            edges={store.sceneEdges}
            chartType="Network chart"
            tableId={tableId}
            chartTitle={typeof title === "string" ? title : undefined}
          />
        </AccessibleTablePortal>
      )}
      <ScreenReaderSummary summary={summary} />
    </>
  )
}
