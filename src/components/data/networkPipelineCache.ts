import memoize from "memoize-one"
import { calculateMargin, adjustedPositionSize } from "../svg/frameFunctions"
import { stringToFn } from "./dataFunctions"
import { GenericObject } from "../types/generalTypes"
import { genericFunction } from "../generic_utilities/functions"

export function createNetworkPipelineCache() {
  return {
    // Memoize the margin calculation
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

    // Memoize accessor conversions
    accessorConversions: memoize((
      nodeIDAccessor: any,
      sourceAccessor: any,
      targetAccessor: any,
      nodeSizeAccessor: any,
      edgeWidthAccessor: any
    ) => ({
      nodeIDAccessor: stringToFn<string>(nodeIDAccessor, (d) => d.id),
      sourceAccessor: stringToFn<string | GenericObject>(sourceAccessor, (d) => d.source),
      targetAccessor: stringToFn<string | GenericObject>(targetAccessor, (d) => d.target),
      nodeSizeAccessor: typeof nodeSizeAccessor === "number"
        ? genericFunction(nodeSizeAccessor)
        : stringToFn<number>(nodeSizeAccessor, genericFunction(5)),
      edgeWidthAccessor: stringToFn<number>(edgeWidthAccessor, (d) => d.weight),
    })),
  }
}

export type NetworkPipelineCache = ReturnType<typeof createNetworkPipelineCache>
