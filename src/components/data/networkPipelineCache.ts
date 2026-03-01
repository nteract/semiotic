import memoize from "memoize-one"
import { calculateMargin, adjustedPositionSize } from "../svg/frameFunctions"
import { stringToFn } from "./dataFunctions"

import { genericFunction } from "../generic_utilities/functions"

export function createNetworkPipelineCache() {
  return {
    marginCalc: memoize((
      margin: any,
      title: any,
      size: number[]
    ) => {
      const calculatedMargin = calculateMargin({ margin, title, size })
      const { adjustedPosition, adjustedSize } = adjustedPositionSize({
        size,
        margin: calculatedMargin
      })
      return { margin: calculatedMargin, adjustedPosition, adjustedSize }
    }),

    accessorConversions: memoize((
      nodeIDAccessor: any,
      sourceAccessor: any,
      targetAccessor: any,
      nodeSizeAccessor: any,
      edgeWidthAccessor: any
    ) => ({
      nodeIDAccessor: stringToFn<string>(nodeIDAccessor, (d) => d ? d.id : undefined),
      sourceAccessor: stringToFn<string | Record<string, any>>(sourceAccessor, (d) => d.source),
      targetAccessor: stringToFn<string | Record<string, any>>(targetAccessor, (d) => d.target),
      nodeSizeAccessor: typeof nodeSizeAccessor === "number"
        ? genericFunction(nodeSizeAccessor)
        : stringToFn<number>(nodeSizeAccessor, genericFunction(5)),
      edgeWidthAccessor: stringToFn<number>(edgeWidthAccessor, (d) => d.weight || 1),
    })),

    nodeStyleFns: memoize((
      nodeStyle: any,
      nodeClass: any,
      nodeRenderMode: any,
      canvasNodes: any
    ) => ({
      nodeStyleFn: stringToFn<Record<string, any>>(nodeStyle, () => ({}), true),
      nodeClassFn: stringToFn<string>(nodeClass, () => "", true),
      nodeRenderModeFn: stringToFn<string | Record<string, any>>(nodeRenderMode, undefined, true),
      nodeCanvasRenderFn: canvasNodes ? stringToFn<boolean>(canvasNodes, undefined, true) : undefined,
    })),

    edgeStyleFns: memoize((
      edgeStyle: any,
      edgeClass: any,
      edgeRenderMode: any,
      canvasEdges: any
    ) => ({
      edgeStyleFn: stringToFn<Record<string, any>>(edgeStyle, () => ({}), true),
      edgeClassFn: stringToFn<string>(edgeClass, () => "", true),
      edgeRenderModeFn: stringToFn<string | Record<string, any>>(edgeRenderMode, undefined, true),
      edgeCanvasRenderFn: canvasEdges ? stringToFn<boolean>(canvasEdges, undefined, true) : undefined,
    })),
  }
}

export type NetworkPipelineCache = ReturnType<typeof createNetworkPipelineCache>
