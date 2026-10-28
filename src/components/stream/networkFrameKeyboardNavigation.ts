"use client"

import { useCallback, useRef } from "react"
import type { HoverData } from "../realtime/types"
import type { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkSceneNode } from "./networkTypes"
import { buildHoverData } from "./hoverUtils"
import { extractNetworkNavPoints, nextNetworkIndex } from "./networkKeyboardNav"
import {
  resolvePosition,
  type NavGraph,
  type NavPoint
} from "./navigationGraph"
import {
  useGraphKeyboardNavigation,
  type KeyboardInteractionParams
} from "./graphKeyboardNavigation"

function networkPointToHover(point: NavPoint): HoverData {
  return buildHoverData(point.datum || {}, point.x, point.y, {
    nodeOrEdge: "node"
  })
}

/** Adapt the network store to the same retained-scene keyboard lifecycle. */
export function useNetworkKeyboardNavigation(
  params: KeyboardInteractionParams<NetworkPipelineStore, NetworkSceneNode>
) {
  const { storeRef } = params
  const adapterRef = useRef({
    get scene() {
      return storeRef.current?.sceneNodes ?? []
    },
    get version() {
      return storeRef.current?.layoutVersion ?? -1
    }
  })
  const nextConnected = useCallback(
    (
      key: string,
      graph: NavGraph,
      index: number,
      neighbor: { current: number }
    ) =>
      nextNetworkIndex(
        key,
        index < 0
          ? { flatIndex: -1, group: "", indexInGroup: -1 }
          : resolvePosition(graph, index),
        graph,
        storeRef.current?.sceneEdges ?? [],
        neighbor
      ),
    [storeRef]
  )

  return useGraphKeyboardNavigation<
    NetworkSceneNode,
    typeof adapterRef.current
  >({
    ...params,
    storeRef: adapterRef,
    extractPoints: extractNetworkNavPoints,
    toHover: networkPointToHover,
    nextConnected
  })
}
