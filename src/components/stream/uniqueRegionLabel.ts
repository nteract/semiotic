import * as React from "react"

/**
 * Several charts on one page share a human summary name such as
 * "Data summary for line chart". The name must not include the React id,
 * and duplicate landmarks still need distinct accessible names.
 * The first instance keeps the base name. Later instances add " (2)", " (3)".
 */
const groups = new Map<string, Set<symbol>>()
const listeners = new Map<symbol, (ordinal: number) => void>()

type SummaryScope = {
  firstId: string | null
  counts: Map<string, number>
  ordinals: Map<string, number>
}

// One scope per React render. Layout effects do not run on the server, so the
// ordinal has to be assigned while the tree renders. Seeing the first id again
// starts a new render; a microtask drops the scope so the next request does
// not continue the count. The id itself never appears in the accessible name.
let summaryScope: SummaryScope | null = null
let summaryScopeClear = false

function reactIdIndex(id: string): number {
  const matches = id.match(/\d+/g)
  return matches ? Number(matches[matches.length - 1]) : 0
}

function freshSummaryScope(): SummaryScope {
  const scope: SummaryScope = { firstId: null, counts: new Map(), ordinals: new Map() }
  summaryScope = scope
  if (!summaryScopeClear) {
    summaryScopeClear = true
    queueMicrotask(() => {
      summaryScope = null
      summaryScopeClear = false
    })
  }
  return scope
}

function takeRenderOrdinal(base: string, reactId: string): number {
  const current = summaryScope
  const nextIndex = reactIdIndex(reactId)
  const newRender = current == null
    || (current.firstId === reactId && current.ordinals.has(reactId))
    || (current.firstId != null && nextIndex < reactIdIndex(current.firstId))
  const scope = newRender || current == null ? freshSummaryScope() : current
  const existing = scope.ordinals.get(reactId)
  if (existing != null) return existing
  const ordinal = (scope.counts.get(base) ?? 0) + 1
  scope.counts.set(base, ordinal)
  scope.ordinals.set(reactId, ordinal)
  if (scope.firstId == null) scope.firstId = reactId
  return ordinal
}

function publish(group: Set<symbol>) {
  let ordinal = 1
  for (const member of group) {
    listeners.get(member)?.(ordinal)
    ordinal += 1
  }
}

export function useUniqueRegionLabel(base: string): string {
  const reactId = React.useId()
  const tokenRef = React.useRef<symbol | null>(null)
  if (tokenRef.current == null) tokenRef.current = Symbol("summary-region")
  const token = tokenRef.current
  const initialOrdinal = React.useRef<number | null>(null)
  if (initialOrdinal.current == null) initialOrdinal.current = takeRenderOrdinal(base, reactId)
  const [ordinal, setOrdinal] = React.useState(initialOrdinal.current)

  React.useLayoutEffect(() => {
    listeners.set(token, setOrdinal)
    let group = groups.get(base)
    if (!group) {
      group = new Set()
      groups.set(base, group)
    }
    group.add(token)
    publish(group)
    return () => {
      listeners.delete(token)
      group!.delete(token)
      if (group!.size === 0) groups.delete(base)
      else publish(group!)
    }
  }, [base, token])

  return ordinal === 1 ? base : `${base} (${ordinal})`
}
