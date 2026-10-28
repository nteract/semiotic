/** Consumer fallback for LR cards with owner-local authored row rectangles. */
export interface AuthoredCard {
  x: number
  y: number
  width: number
  height: number
  rows: ReadonlyMap<string, { y: number; height: number }>
}
export interface RowConnection {
  id: string
  source: string
  target: string
  sourceRow?: string
  targetRow?: string
}

/** Recompute from the current authored layout, including every connection ID. */
export function authoredRowAnchors(
  cards: ReadonlyMap<string, AuthoredCard>,
  connections: readonly RowConnection[],
) {
  const anchor = (id: string, rowId: string | undefined, source: boolean) => {
    const card = cards.get(id)
    if (!card) throw new Error(`Missing authored card: ${id}`)
    const row = rowId === undefined ? undefined : card.rows.get(rowId)
    if (rowId !== undefined && !row) throw new Error(`Missing authored row: ${id}/${rowId}`)
    return {
      x: card.x + (source ? card.width : 0),
      y: card.y + (row ? row.y + row.height / 2 : card.height / 2),
    }
  }
  return connections.map((edge) => ({
    edgeId: edge.id,
    source: anchor(edge.source, edge.sourceRow, true),
    target: anchor(edge.target, edge.targetRow, false),
  }))
}
