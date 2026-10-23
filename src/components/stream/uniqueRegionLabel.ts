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
  counts: Map<string, number>
  ordinals: Map<string, number>
}

// One scope per server render. React's useId is `_` + identifierPrefix +
// `R_`/`r_` + an opaque tree token. The prefix owns the render: two
// identifierPrefix values never share a count. The token is not a decimal
// counter (`_R_a_` follows `_R_9_`, and a nested tree can step backwards),
// so ordinals follow encounter order. Token `0` is the render root; seeing
// it after another chart starts the next same-prefix render. A microtask
// retires the map so a later request cannot continue an unseen id.
const scopesByOwner = new Map<string, SummaryScope>()
let scopeRetirement = false

function freshSummaryScope(): SummaryScope {
  return { counts: new Map(), ordinals: new Map() }
}

function renderOwner(id: string): { owner: string; token: string } {
  const match = /^_(.*?)[Rr]_([^H_]+)/.exec(id)
  return match ? { owner: match[1], token: match[2] } : { owner: id, token: "" }
}

function automaticScope(id: string): SummaryScope {
  const { owner, token } = renderOwner(id)
  let scope = scopesByOwner.get(owner)
  if (scope && token === "0" && !scope.ordinals.has(id) && scope.ordinals.size > 0) {
    scope = undefined
  }
  if (!scope) {
    scope = freshSummaryScope()
    scopesByOwner.set(owner, scope)
    if (!scopeRetirement) {
      scopeRetirement = true
      queueMicrotask(() => {
        scopesByOwner.clear()
        scopeRetirement = false
      })
    }
  }
  return scope
}

function takeRenderOrdinal(scope: SummaryScope, base: string, reactId: string): number {
  const existing = scope.ordinals.get(reactId)
  if (existing != null) return existing
  const ordinal = (scope.counts.get(base) ?? 0) + 1
  scope.counts.set(base, ordinal)
  scope.ordinals.set(reactId, ordinal)
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
  if (initialOrdinal.current == null) {
    initialOrdinal.current = takeRenderOrdinal(automaticScope(reactId), base, reactId)
  }
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
