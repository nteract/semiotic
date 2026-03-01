import memoize from "memoize-one"
import { ProjectedLine, RawPoint, RawSummary } from "../types/generalTypes"
import { calculateMargin, adjustedPositionSize } from "../svg/frameFunctions"
import { stringToFn, stringToArrayFn } from "./dataFunctions"

const emptyObjectReturnFunction = () => ({})
const emptyStringReturnFunction = () => ""

export function createXYPipelineCache() {
  return {
    annotatedSettings: memoize((
      xAccessor: any,
      yAccessor: any,
      summaryDataAccessor: any,
      lineDataAccessor: any,
      renderKey: any,
      lineType: any,
      summaryType: any,
      lineIDAccessor: any
    ) => ({
      xAccessor: stringToArrayFn<number>(xAccessor, (d: number[]) => d[0]),
      yAccessor: stringToArrayFn<number>(yAccessor, (d: number[]) => d[1]),
      summaryDataAccessor: stringToArrayFn<RawPoint[]>(
        summaryDataAccessor,
        (d: RawSummary | number[]) => (Array.isArray(d) ? d : d.coordinates)
      ),
      lineDataAccessor: stringToArrayFn<RawPoint[]>(
        lineDataAccessor,
        (d: ProjectedLine | number[]) => (Array.isArray(d) ? d : d.coordinates)
      ),
      renderKeyFn: stringToFn<string>(
        renderKey,
        (d: Record<string, any>, i: number) => `line-${i}`,
        true
      ),
      lineIDAccessor: stringToFn<string>(lineIDAccessor, (l) => l.semioticLineID),
    })),

    marginCalc: memoize((
      margin: any,
      axes: any,
      title: any,
      size: number[]
    ) => {
      const calculatedMargin = calculateMargin({ margin, axes, title, size })
      const { adjustedPosition, adjustedSize } = adjustedPositionSize({
        size,
        margin: calculatedMargin
      })
      return { margin: calculatedMargin, adjustedPosition, adjustedSize }
    }),

    summaryStyleFns: memoize((
      summaryStyle: any,
      summaryClass: any,
      summaryRenderMode: any
    ) => ({
      summaryStyleFn: stringToFn<Record<string, any>>(summaryStyle, emptyObjectReturnFunction, true),
      summaryClassFn: stringToFn<string>(summaryClass, emptyStringReturnFunction, true),
      summaryRenderModeFn: stringToFn<Record<string, any> | string>(summaryRenderMode, undefined, true),
    })),

    lineStyleFns: memoize((
      lineStyle: any,
      lineClass: any,
      lineRenderMode: any,
      canvasLines: any
    ) => ({
      styleFn: stringToFn<Record<string, any>>(lineStyle, emptyObjectReturnFunction, true),
      classFn: stringToFn<string>(lineClass, emptyStringReturnFunction, true),
      renderMode: stringToFn<Record<string, any> | string>(lineRenderMode, undefined, true),
      canvasRender: stringToFn<boolean>(canvasLines, undefined, true),
    })),

    pointStyleFns: memoize((
      pointStyle: any,
      pointClass: any,
      pointRenderMode: any,
      canvasPoints: any
    ) => ({
      styleFn: stringToFn<Record<string, any>>(pointStyle, emptyObjectReturnFunction, true),
      classFn: stringToFn<string>(pointClass, emptyStringReturnFunction, true),
      renderMode: stringToFn<Record<string, any> | string>(pointRenderMode, undefined, true),
      canvasRender: stringToFn<boolean>(canvasPoints, undefined, true),
    })),

    summaryCanvasRender: memoize((canvasSummaries: any) =>
      stringToFn<boolean>(canvasSummaries, undefined, true)
    ),
  }
}

export type XYPipelineCache = ReturnType<typeof createXYPipelineCache>
