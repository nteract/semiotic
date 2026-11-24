"use client"
import { useCallback, useMemo, useRef, useState } from "react"
import type { Ref, RefObject } from "react"
import type { Datum } from "../../shared/datumTypes"
import type { ChartAccessor } from "../../shared/types"
import type { RealtimeFrameHandle } from "../../../realtime/types"
import { useFrameImperativeHandle } from "../../shared/useFrameImperativeHandle"
import { inferNodesFromEdges } from "../../shared/networkUtils"
import { filterSparseArray } from "../../shared/sparseArray"
import type { StreamNetworkFrameHandle } from "../../../stream/networkTypes"
import { readChartAccessor } from "./accessors"

export interface UseProcessSankeyPushOptions<
  TNode extends Datum,
  TEdge extends Datum,
> {
  ref: Ref<RealtimeFrameHandle>
  rawNodesProp: TNode[] | undefined
  rawEdgesProp: TEdge[] | undefined
  nodeIdAccessor: ChartAccessor<TNode, string>
  edgeIdAccessor: ChartAccessor<TEdge, string>
  sourceAccessor: ChartAccessor<TEdge, string>
  targetAccessor: ChartAccessor<TEdge, string>
  scalesRef: RefObject<unknown>
  layoutSnapshotRef: RefObject<unknown>
}

export interface UseProcessSankeyPushResult<
  TNode extends Datum,
  TEdge extends Datum,
> {
  rawNodes: TNode[]
  rawEdges: TEdge[]
  frameRef: RefObject<StreamNetworkFrameHandle | null>
  getNodeId: (n: TNode) => string
  getEdgeId: (e: TEdge, i: number) => string
  isControlled: boolean
}

/**
 * Owns ProcessSankey push buffers + the network imperative handle.
 * Controlled `edges` prop freezes the edge list; nodes always merge push + prop.
 */
export function useProcessSankeyPush<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum,
>(
  options: UseProcessSankeyPushOptions<TNode, TEdge>,
): UseProcessSankeyPushResult<TNode, TEdge> {
  const {
    ref,
    rawNodesProp,
    rawEdgesProp,
    nodeIdAccessor,
    edgeIdAccessor,
    sourceAccessor,
    targetAccessor,
    scalesRef,
    layoutSnapshotRef,
  } = options

  const [pushedEdges, setPushedEdges] = useState<TEdge[]>([])
  const [pushedNodes, setPushedNodes] = useState<TNode[]>([])
  const pushedEdgesRef = useRef<TEdge[]>(pushedEdges)
  const pushedNodesRef = useRef<TNode[]>(pushedNodes)
  pushedEdgesRef.current = pushedEdges
  pushedNodesRef.current = pushedNodes

  const writePushedEdges = useCallback((next: TEdge[]) => {
    pushedEdgesRef.current = next
    setPushedEdges(next)
  }, [])
  const writePushedNodes = useCallback((next: TNode[]) => {
    pushedNodesRef.current = next
    setPushedNodes(next)
  }, [])

  const isControlled = rawEdgesProp !== undefined
  const rawEdges = filterSparseArray(isControlled ? rawEdgesProp : pushedEdges)

  const rawNodes = useMemo<TNode[]>(() => {
    const controlled = filterSparseArray(rawNodesProp ?? []) as TNode[]
    const seen = new Set<string>()
    const merged: TNode[] = []
    for (const group of [controlled, pushedNodes]) {
      for (const node of group) {
        const id = String(readChartAccessor(nodeIdAccessor, node))
        if (seen.has(id)) continue
        seen.add(id)
        merged.push(node)
      }
    }
    const inferred = inferNodesFromEdges(
      [],
      rawEdges as unknown as Datum[],
      sourceAccessor as string | ((d: Datum) => string),
      targetAccessor as string | ((d: Datum) => string),
    )
    for (const stub of inferred) {
      if (seen.has(stub.id)) continue
      seen.add(stub.id)
      merged.push(stub as unknown as TNode)
    }
    return merged
  }, [rawNodesProp, pushedNodes, rawEdges, nodeIdAccessor, sourceAccessor, targetAccessor])

  const frameRef = useRef<StreamNetworkFrameHandle>(null)

  const resolveEdgeId = useCallback((e: TEdge, i: number): string => {
    const fromAccessor = readChartAccessor(edgeIdAccessor, e) as unknown as string | undefined
    if (fromAccessor != null) return String(fromAccessor)
    return `${readChartAccessor(sourceAccessor, e)}-${readChartAccessor(targetAccessor, e)}-${i}`
  }, [edgeIdAccessor, sourceAccessor, targetAccessor])

  const looksLikeEdge = useCallback((item: Datum | undefined | null): boolean => {
    if (item == null) return false
    const e = item as TEdge
    return (
      readChartAccessor(sourceAccessor as ChartAccessor<TEdge, string>, e) != null &&
      readChartAccessor(targetAccessor as ChartAccessor<TEdge, string>, e) != null
    )
  }, [sourceAccessor, targetAccessor])

  const getNodeId = useCallback(
    (n: TNode): string => String(readChartAccessor(nodeIdAccessor, n)),
    [nodeIdAccessor],
  )

  function editRows(id: string | string[], updater?: (row: Datum) => Datum) {
    const ids = new Set(Array.isArray(id) ? id : [id])
    const previous: Datum[] = []
    function edit<T extends Datum>(rows: T[], getId: (row: T, index: number) => string, write: (next: T[]) => void) {
      const start = previous.length
      const next: T[] = []
      rows.forEach((row, index) => {
        if (ids.has(getId(row, index))) {
          previous.push(row)
          if (updater) next.push(updater(row) as T)
        } else {
          next.push(row)
        }
      })
      if (previous.length !== start) write(next)
    }
    if (!isControlled) edit(pushedEdgesRef.current, resolveEdgeId, writePushedEdges)
    edit(pushedNodesRef.current, getNodeId, writePushedNodes)
    return previous
  }

  useFrameImperativeHandle(ref, {
    variant: "network",
    frameRef,
    overrides: {
      push(item: Datum) {
        if (looksLikeEdge(item)) {
          if (isControlled) {
            console.warn("ProcessSankey.push: edge ignored — `edges` prop is controlled.")
            return
          }
          writePushedEdges([...pushedEdgesRef.current, item as unknown as TEdge])
        } else {
          writePushedNodes([...pushedNodesRef.current, item as unknown as TNode])
        }
      },
      pushMany(items: Datum[]) {
        const newEdges: TEdge[] = []
        const newNodes: TNode[] = []
        for (const item of items) {
          if (looksLikeEdge(item)) newEdges.push(item as unknown as TEdge)
          else newNodes.push(item as unknown as TNode)
        }
        if (newEdges.length > 0) {
          if (isControlled) {
            console.warn("ProcessSankey.pushMany: edges ignored — `edges` prop is controlled.")
          } else {
            writePushedEdges([...pushedEdgesRef.current, ...newEdges])
          }
        }
        if (newNodes.length > 0) writePushedNodes([...pushedNodesRef.current, ...newNodes])
      },
      remove: id => editRows(id),
      update: editRows,
      clear() {
        if (!isControlled) writePushedEdges([])
        writePushedNodes([])
        frameRef.current?.clear()
      },
      getData: () => (rawEdges ?? []) as unknown as Datum[],
      getScales: () => scalesRef.current,
      getCustomLayout: () => layoutSnapshotRef.current,
    },
  })

  return {
    rawNodes,
    rawEdges,
    frameRef,
    getNodeId,
    getEdgeId: resolveEdgeId,
    isControlled,
  }
}
