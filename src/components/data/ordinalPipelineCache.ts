import memoize from "memoize-one"
import { calculateMargin, adjustedPositionSize, keyAndObjectifyBarData } from "../svg/frameFunctions"
import { stringToFn, stringToArrayFn } from "./dataFunctions"
import { GenericObject, ProjectionTypes } from "../types/generalTypes"

export function createOrdinalPipelineCache() {
  return {
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

    styleFns: memoize((
      baseConnectorStyle: any,
      baseSummaryStyle: any,
      baseStyle: any,
      basePieceClass: any,
      baseSummaryClass: any,
      baseConnectorClass: any,
      baseRenderMode: any,
      baseSummaryRenderMode: any,
      baseConnectorRenderMode: any,
      canvasPieces: any,
      canvasSummaries: any,
      canvasConnectors: any
    ) => ({
      connectorStyle: stringToFn<GenericObject>(baseConnectorStyle, () => ({}), true),
      summaryStyle: stringToFn<GenericObject>(baseSummaryStyle, () => ({}), true),
      pieceStyle: stringToFn<GenericObject>(baseStyle, () => ({}), true),
      pieceClass: stringToFn<string>(basePieceClass, () => "", true),
      summaryClass: stringToFn<string>(baseSummaryClass, () => "", true),
      connectorClass: stringToFn<string>(baseConnectorClass, () => "", true),
      pieceRenderMode: stringToFn<GenericObject | string>(baseRenderMode, undefined, true),
      summaryRenderMode: stringToFn<GenericObject | string>(baseSummaryRenderMode, undefined, true),
      connectorRenderMode: stringToFn<GenericObject | string>(baseConnectorRenderMode, undefined, true),
      pieceCanvasRender: stringToFn<boolean>(canvasPieces, undefined, true),
      summaryCanvasRender: stringToFn<boolean>(canvasSummaries, undefined, true),
      connectorCanvasRender: stringToFn<boolean>(canvasConnectors, undefined, true),
    })),
  }
}

export type OrdinalPipelineCache = ReturnType<typeof createOrdinalPipelineCache>
