"use client"

import * as React from "react"
import type { AccessibleDataTableProps } from "./AccessibleDataTable"
import type { useAccessibleTableInteraction } from "./useAccessibleTableInteraction"
import { AccessibleDataRowsTable } from "./AccessibleDataRowsTable"
import { AccessibleTableMoreRows } from "./AccessibleTableMoreRows"
import {
  SAMPLE_SIZE,
  PAGE_SIZE,
  SUMMARY_NOTE_STYLE
} from "./accessibleTableStyles"
import { extractAllRows } from "./accessibleDataRows"
import { computeFieldStats, formatSummary } from "./accessibleDataTableModel"

/** Loaded only on expansion; unmounting on collapse resets pagination. */
export default function AccessibleDataTableContent({
  scene,
  sceneRevision,
  chartType,
  revealRows
}: AccessibleDataTableProps &
  Pick<ReturnType<typeof useAccessibleTableInteraction>, "revealRows">) {
  const [visibleCount, setVisibleCount] = React.useState(SAMPLE_SIZE)
  const sceneKey = sceneRevision ?? scene
  const { allRows, summary } = React.useMemo(() => {
    const allRows = extractAllRows(scene)
    return {
      allRows,
      summary: formatSummary(allRows.length, computeFieldStats(allRows))
    }
    // A semantic revision is authoritative across geometry-only builds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey])
  const shownCount = Math.min(visibleCount, allRows.length)
  const remaining = allRows.length - shownCount
  const showMore = (event: React.MouseEvent<HTMLButtonElement>) => {
    revealRows(
      event.currentTarget,
      shownCount,
      Math.min(shownCount + PAGE_SIZE, allRows.length),
      allRows.length
    )
    setVisibleCount((c) => c + PAGE_SIZE)
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
      <AccessibleDataRowsTable
        rows={allRows.slice(0, shownCount)}
        label={`Sample data for ${chartType}`}
        typeLabel="type"
        caption={
          remaining > 0
            ? `First ${shownCount} of ${allRows.length} data points`
            : `All ${allRows.length} data points`
        }
      />
      <AccessibleTableMoreRows
        remaining={remaining}
        onClick={showMore}
        kind="row"
      />
    </>
  )
}
