"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSelection } from "../store/useSelection"
import { useChartObserver } from "../store/useObservation"
import type { NavTreeNode } from "./navigationTree"
import type { Datum } from "../charts/shared/datumTypes"
/**
 * useNavigationSync — keep an `AccessibleNavTree` and a chart in sync, both ways:
 *
 *   tree → canvas : landing on a datum node highlights the matching mark (via
 *                   the selection store — pass `selection` to the chart).
 *   canvas → tree : hovering/clicking a mark moves the tree's active node (via
 *                   the observation store — give the chart a `chartId`).
 *
 * Both directions ride the existing module-global stores, so **no provider is
 * required** — the chart just needs `chartId` and `selection={sync.selection}`,
 * and the tree needs `activeId`/`onActiveChange`. Headless: BYO layout.
 *
 * @example
 * const sync = useNavigationSync({ tree, chartId: "sales", matchFields: ["month"] })
 * <LineChart chartId="sales" selection={sync.selection} {...props} />
 * <AccessibleNavTree tree={tree} activeId={sync.activeId} onActiveChange={sync.onActiveChange} />
 */

export interface UseNavigationSyncOptions {
  /** The navigation tree (from `buildNavigationTree`). */
  tree: NavTreeNode
  /** `chartId` set on the chart, so its hover/click can be matched back to a leaf. */
  chartId?: string
  /**
   * Fields that identify a datum for highlighting + matching. Defaults to the
   * primitive-valued keys of the first leaf's datum.
   */
  matchFields?: string[]
  /** Selection name shared with the chart's `selection={{ name }}`. Default "__semiotic-nav-sync". */
  selectionName?: string
  /** Which canvas observations move the tree. Default ["hover", "click"]. */
  observe?: Array<"hover" | "click">
}

export interface UseNavigationSyncResult {
  /** Controlled active node id — pass to `AccessibleNavTree`. */
  activeId: string
  /** Change handler — pass to `AccessibleNavTree` (drives the canvas highlight). */
  onActiveChange: (node: NavTreeNode) => void
  /** Pass to the chart as `selection={sync.selection}`. */
  selection: { name: string }
}

const KEY_SEP = "\u0001"

function isPrimitive(v: unknown): boolean {
  return v == null || typeof v === "string" || typeof v === "number" || typeof v === "boolean"
}

function firstLeafDatum(node: NavTreeNode): Datum | null {
  if (node.role === "datum" && node.datum) return node.datum
  for (const c of node.children ?? []) {
    const d = firstLeafDatum(c)
    if (d) return d
  }
  return null
}

function matchKey(datum: Datum | null | undefined, fields: string[]): string {
  if (!datum) return ""
  return fields.map((f) => String((datum as Record<string, unknown>)[f])).join(KEY_SEP)
}

export function useNavigationSync(options: UseNavigationSyncOptions): UseNavigationSyncResult {
  const { tree, chartId, observe = ["hover", "click"] } = options
  // Default the selection name per-chart so multiple synced charts on one page
  // don't share a selection bus (which would cross-highlight). Explicit
  // `selectionName` still wins for intentional cross-chart linking.
  const selectionName =
    options.selectionName ?? `__semiotic-nav-sync${chartId ? `:${chartId}` : ""}`

  // Match fields: explicit, or the primitive keys of the first leaf datum.
  const matchFields = useMemo(() => {
    if (options.matchFields) return options.matchFields
    const d = firstLeafDatum(tree)
    if (!d) return []
    return Object.keys(d).filter((k) => !k.startsWith("_") && isPrimitive((d as Record<string, unknown>)[k]))
  }, [options.matchFields, tree])

  // matchKey → leaf id, so a hovered datum maps back to its tree node.
  const leafByKey = useMemo(() => {
    const map = new Map<string, string>()
    const walk = (node: NavTreeNode) => {
      if (node.role === "datum" && node.datum) {
        const k = matchKey(node.datum, matchFields)
        if (!map.has(k)) map.set(k, node.id)
      }
      for (const c of node.children ?? []) walk(c)
    }
    walk(tree)
    return map
  }, [tree, matchFields])

  const { selectPoints, clear } = useSelection({ name: selectionName, fields: matchFields })
  const { latest } = useChartObserver({ chartId, types: [...observe, "hover-end"], limit: 1 })

  const [activeId, setActiveId] = useState<string>(tree.id)

  // tree → canvas: a datum node highlights its mark; a structural node clears it.
  const onActiveChange = useCallback((node: NavTreeNode) => {
    setActiveId(node.id)
    if (node.role === "datum" && node.datum && matchFields.length > 0) {
      const fieldValues: Record<string, unknown[]> = {}
      for (const f of matchFields) fieldValues[f] = [(node.datum as Record<string, unknown>)[f]]
      selectPoints(fieldValues)
    } else {
      clear()
    }
  }, [matchFields, selectPoints, clear])

  // canvas → tree: map the latest hover/click datum back to its leaf and select it.
  // Skip hover-end (sticky — leave the tree where it was rather than snapping to root).
  const lastObsRef = useRef<unknown>(null)
  useEffect(() => {
    if (!latest || latest === lastObsRef.current) return
    lastObsRef.current = latest
    if (latest.type === "hover-end") return
    const datum = (latest as { datum?: Datum }).datum
    if (!datum) return
    const id = leafByKey.get(matchKey(datum, matchFields))
    if (id && id !== activeId) setActiveId(id)
  }, [latest, leafByKey, matchFields, activeId])

  return { activeId, onActiveChange, selection: { name: selectionName } }
}
