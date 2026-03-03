"use client"
import * as React from "react"
import { useRef, useCallback, useImperativeHandle, forwardRef } from "react"
import RealtimeNetworkFrame from "../../realtime-network/RealtimeNetworkFrame"
import type {
  RealtimeSankeyProps,
  RealtimeNetworkFrameHandle,
  EdgePush
} from "../../realtime-network/types"

/**
 * RealtimeSankey — Simplified wrapper for streaming Sankey diagrams.
 *
 * Wraps RealtimeNetworkFrame with Sankey-specific accessor normalization
 * and ref forwarding.
 *
 * @example
 * ```tsx
 * const ref = useRef<RealtimeNetworkFrameHandle>(null)
 *
 * // Push edges at any frequency
 * ref.current.push({ source: "Budget", target: "Rent", value: 1200 })
 *
 * <RealtimeSankey
 *   ref={ref}
 *   size={[800, 600]}
 *   showParticles
 * />
 * ```
 */
export const RealtimeSankey = forwardRef<RealtimeNetworkFrameHandle, RealtimeSankeyProps>(
  function RealtimeSankey(props, ref) {
    const {
      sourceAccessor = "source",
      targetAccessor = "target",
      valueAccessor = "value",
      initialEdges: rawInitialEdges,
      ...frameProps
    } = props

    const frameRef = useRef<RealtimeNetworkFrameHandle>(null)

    // Normalize initial edges through accessors
    const initialEdges = React.useMemo(() => {
      if (!rawInitialEdges) return undefined
      return rawInitialEdges.map((e: any) => ({
        source: typeof sourceAccessor === "string" ? e[sourceAccessor] : e.source,
        target: typeof targetAccessor === "string" ? e[targetAccessor] : e.target,
        value: typeof valueAccessor === "string" ? e[valueAccessor] : e.value
      }))
    }, [rawInitialEdges, sourceAccessor, targetAccessor, valueAccessor])

    // Normalize pushed edges through accessors
    const normalizeEdge = useCallback((edge: Record<string, any>): EdgePush => {
      return {
        source: typeof sourceAccessor === "string" ? edge[sourceAccessor] : edge.source,
        target: typeof targetAccessor === "string" ? edge[targetAccessor] : edge.target,
        value: typeof valueAccessor === "string" ? edge[valueAccessor] : edge.value
      }
    }, [sourceAccessor, targetAccessor, valueAccessor])

    useImperativeHandle(ref, () => ({
      push: (edge) => frameRef.current?.push(normalizeEdge(edge)),
      pushMany: (edges) => frameRef.current?.pushMany(edges.map(normalizeEdge)),
      clear: () => frameRef.current?.clear(),
      getTopology: () => frameRef.current?.getTopology() ?? { nodes: [], edges: [] },
      relayout: () => frameRef.current?.relayout(),
      getTension: () => frameRef.current?.getTension() ?? 0
    }), [normalizeEdge])

    return (
      <RealtimeNetworkFrame
        ref={frameRef}
        initialEdges={initialEdges}
        {...frameProps}
      />
    )
  }
)
RealtimeSankey.displayName = "RealtimeSankey"
