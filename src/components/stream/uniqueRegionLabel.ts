import * as React from "react"

/**
 * Several charts on one page share a human summary name such as
 * "Data summary for line chart". The name must not include the React id,
 * and duplicate landmarks still need distinct accessible names.
 * The first instance keeps the base name. Later instances add " (2)", " (3)".
 */
const groups = new Map<string, Set<symbol>>()
const listeners = new Map<symbol, (ordinal: number) => void>()

function publish(group: Set<symbol>) {
  let ordinal = 1
  for (const member of group) {
    listeners.get(member)?.(ordinal)
    ordinal += 1
  }
}

export function useUniqueRegionLabel(base: string): string {
  const tokenRef = React.useRef<symbol | null>(null)
  if (tokenRef.current == null) tokenRef.current = Symbol("summary-region")
  const token = tokenRef.current
  const [ordinal, setOrdinal] = React.useState(1)

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
