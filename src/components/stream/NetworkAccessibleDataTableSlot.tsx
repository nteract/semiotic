"use client"

import * as React from "react"
import { SkipToTableLink } from "./AccessibleDataTable"
import NetworkAccessibleDataTable from "./NetworkAccessibleDataTable"

/** Keep the link and its target eager; the table defers only expanded content. */
export function NetworkAccessibleDataTableSlot(
  props: React.ComponentProps<typeof NetworkAccessibleDataTable> & {
    tableId: string
  }
) {
  return (
    <>
      <SkipToTableLink tableId={props.tableId} />
      <NetworkAccessibleDataTable {...props} />
    </>
  )
}
