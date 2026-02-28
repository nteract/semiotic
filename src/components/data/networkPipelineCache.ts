import memoize from "memoize-one"
import { calculateMargin, adjustedPositionSize } from "../svg/frameFunctions"
import { stringToFn } from "./dataFunctions"
import { GenericObject } from "../types/generalTypes"
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
      sourceAccessor: stringToFn<string | GenericObject>(sourceAccessor, (d) => d.source),
      targetAccessor: stringToFn<string | GenericObject>(targetAccessor, (d) => d.target),
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
      nodeStyleFn: stringToFn<GenericObject>(nodeStyle, () => ({}), true),
      nodeClassFn: stringToFn<string>(nodeClass, () => "", true),
      nodeRenderModeFn: stringToFn<string | GenericObject>(nodeRenderMode, undefined, true),
      nodeCanvasRenderFn: canvasNodes ? stringToFn<boolean>(canvasNodes, undefined, true) : undefined,
    })),

    edgeStyleFns: memoize((
      edgeStyle: any,
      edgeClass: any,
      edgeRenderMode: any,
      canvasEdges: any
    ) => ({
      edgeStyleFn: stringToFn<GenericObject>(edgeStyle, () => ({}), true),
      edgeClassFn: stringToFn<string>(edgeClass, () => "", true),
      edgeRenderModeFn: stringToFn<string | GenericObject>(edgeRenderMode, undefined, true),
      edgeCanvasRenderFn: canvasEdges ? stringToFn<boolean>(canvasEdges, undefined, true) : undefined,
    })),
  }
}

export type NetworkPipelineCache = ReturnType<typeof createNetworkPipelineCache>
