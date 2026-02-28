import memoize from "memoize-one"
import { calculateMargin, adjustedPositionSize, keyAndObjectifyBarData } from "../svg/frameFunctions"
import { stringToFn, stringToArrayFn } from "./dataFunctions"
import { GenericObject, ProjectionTypes } from "../types/generalTypes"

export function createOrdinalPipelineCache() {
  return {
    // Memoize the margin calculation
    marginCalc: memoize((
      margin: any,
      axes: any,
      title: any,
      oLabel: any,
      projection: ProjectionTypes,
      size: number[]
    ) => {
      const calculatedMargin = calculateMargin({ margin, axes, title, oLabel, projection, size })
      const { adjustedPosition, adjustedSize } = adjustedPositionSize({
        size,
        margin: calculatedMargin,
        projection
      })
      return { margin: calculatedMargin, adjustedPosition, adjustedSize }
    }),

    // Memoize data structuring
    structureData: memoize((
      data: any[],
      renderKey: any,
      oAccessor: Function[],
      rAccessor: Array<(d: number | object, i?: number) => number>,
      originalRAccessor: any[],
      originalOAccessor: any[],
      multiAxis: boolean
    ) => {
      return keyAndObjectifyBarData({
        data,
        renderKey,
        oAccessor,
        rAccessor,
        originalRAccessor,
        originalOAccessor,
        multiAxis
      })
    }),

    // Memoize accessor conversions
    accessorConversions: memoize((
      baseOAccessor: any,
      baseRAccessor: any,
      baseRenderKey: any,
      basePieceIDAccessor: any
    ) => ({
      oAccessor: stringToArrayFn<string | number>(baseOAccessor, (d) => d.renderKey),
      rAccessor: stringToArrayFn<number>(baseRAccessor, (d) => d.value || 1),
      renderKey: stringToFn<string | number>(baseRenderKey, (d, i) => i),
      pieceIDAccessor: stringToFn<string>(basePieceIDAccessor, () => ""),
    })),
  }
}

export type OrdinalPipelineCache = ReturnType<typeof createOrdinalPipelineCache>
