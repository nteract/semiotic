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

// One allocator per server document. `SummaryRegionRoot` owns that document.
// Charts rendered without it share a single fallback scope: `useId` is unique
// inside one render, so seeing an id again means the next render reused the
// tree and the old counts must not leak. The id text is not interpreted.
// A microtask drops the fallback so a later turn cannot continue unseen ids.
const SummaryScopeContext = /* @__PURE__ */ React.createContext<SummaryScope | null>(null)
let automaticScopeState: SummaryScope | null = null
let scopeRetirement = false

function freshSummaryScope(): SummaryScope {
  return { counts: new Map(), ordinals: new Map() }
}

function retireAutomaticScope(): void {
  if (scopeRetirement) return
  scopeRetirement = true
  queueMicrotask(() => {
    automaticScopeState = null
    scopeRetirement = false
  })
}

function automaticScope(reactId: string): SummaryScope {
  if (automaticScopeState?.ordinals.has(reactId)) automaticScopeState = null
  if (!automaticScopeState) {
    automaticScopeState = freshSummaryScope()
    retireAutomaticScope()
  }
  return automaticScopeState
}

/** One summary counter for every chart in a server document. */
export function SummaryRegionRoot({
  children
}: {
  children: React.ReactNode
}): React.ReactElement {
  const scope = React.useRef<SummaryScope | null>(null)
  if (scope.current == null) scope.current = freshSummaryScope()
  return React.createElement(
    SummaryScopeContext.Provider,
    { value: scope.current },
    children
  )
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
  const providedScope = React.useContext(SummaryScopeContext)
  const initialOrdinal = React.useRef<number | null>(null)
  if (initialOrdinal.current == null) {
    initialOrdinal.current = takeRenderOrdinal(
      providedScope ?? automaticScope(reactId),
      base,
      reactId
    )
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
