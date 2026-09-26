"use client"

import * as React from "react"
import { SkipToTableLink } from "./AccessibleDataTable"
import type NetworkAccessibleDataTable from "./NetworkAccessibleDataTable"

const Table = React.lazy(() => import("./NetworkAccessibleDataTable"))

/** Keep optional network-summary UI outside the eager chart/AI entry graphs. */
export function NetworkAccessibleDataTableSlot(
  props: React.ComponentProps<typeof NetworkAccessibleDataTable> & {
    tableId: string
  }
) {
  // Reveal the skip link and its target together: never expose a dead link
  // while the summary chunk is loading.
  return (
    <React.Suspense fallback={null}>
      <SkipToTableLink tableId={props.tableId} />
      <Table {...props} />
    </React.Suspense>
  )
}
