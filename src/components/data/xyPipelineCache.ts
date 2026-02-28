import memoize from "memoize-one"
import { ProjectedLine, RawPoint, RawSummary, GenericObject } from "../types/generalTypes"
import { calculateMargin, adjustedPositionSize } from "../svg/frameFunctions"
import { stringToFn, stringToArrayFn } from "./dataFunctions"

export function createXYPipelineCache() {
  return {
    // Memoize the stringToFn/stringToArrayFn conversions that create new function references
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
        (d: GenericObject, i: number) => `line-${i}`,
        true
      ),
      lineIDAccessor: stringToFn<string>(lineIDAccessor, (l) => l.semioticLineID),
    })),

    // Memoize margin calculation
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
  }
}

export type XYPipelineCache = ReturnType<typeof createXYPipelineCache>
