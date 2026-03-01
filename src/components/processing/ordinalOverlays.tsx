import { ProjectionTypes } from "../types/generalTypes"

interface PieArc {
  markD: string
  centroid: number[]
  translate: number[]
  midAngle: number
}

interface ProjectedColumn {
  width: number
  x: number
  middle: number
  y: number
  pieceData: Record<string, any>[]
  pieArc?: PieArc
  [key: string]: unknown
}

export interface GenerateColumnOverlaysArgs {
  oExtent: string[]
  projectedColumns: { [key: string]: ProjectedColumn }
  rScale: { range: () => number[] }
  pieArcs: PieArc[]
  padding: number
  projection: ProjectionTypes
  customDoubleClickBehavior?: Function
  customClickBehavior?: Function
  customHoverBehavior?: Function
}

export function generateColumnOverlays({
  oExtent,
  projectedColumns,
  rScale,
  pieArcs,
  padding,
  projection,
  customDoubleClickBehavior,
  customClickBehavior,
  customHoverBehavior
}: GenerateColumnOverlaysArgs): Record<string, any>[] {
  return oExtent.map((d, i) => {
    const barColumnWidth = projectedColumns[d].width
    let xPosition = projectedColumns[d].x
    let yPosition = 0
    let height = rScale.range()[1]
    let width = barColumnWidth + padding
    if (projection === "horizontal") {
      yPosition = projectedColumns[d].x
      xPosition = 0
      width = rScale.range()[1]
      height = barColumnWidth
    }

    if (projection === "radial") {
      const { markD, centroid, translate, midAngle } = pieArcs[i]
      const radialMousePackage = {
        type: "column-hover",
        column: projectedColumns[d],
        pieces: projectedColumns[d].pieceData,
        summary: projectedColumns[d].pieceData,
        arcAngles: {
          centroid,
          translate,
          midAngle,
          length: rScale.range()[1] / 2
        }
      }
      return {
        markType: "path",
        key: `hover${d}`,
        d: markD,
        transform: `translate(${translate.join(",")})`,
        style: { opacity: 0 },
        overlayData: radialMousePackage,
        onDoubleClick:
          customDoubleClickBehavior &&
          ((e) => {
            customDoubleClickBehavior(radialMousePackage, e)
          }),
        onClick:
          customClickBehavior &&
          ((e) => {
            customClickBehavior(radialMousePackage, e)
          }),
        onMouseEnter:
          customHoverBehavior &&
          ((e) => {
            customHoverBehavior(radialMousePackage, e)
          }),
        onMouseLeave:
          customHoverBehavior &&
          ((e) => {
            customHoverBehavior(e)
          })
      }
    }

    const baseMousePackage = {
      type: "column-hover",
      column: projectedColumns[d],
      pieces: projectedColumns[d].pieceData,
      summary: projectedColumns[d].pieceData
    }
    return {
      markType: "rect",
      key: `hover-${d}`,
      x: xPosition,
      y: yPosition,
      height: height,
      width: width,
      style: { opacity: 0 },
      onDoubleClick:
        customDoubleClickBehavior &&
        ((e) => {
          customDoubleClickBehavior(baseMousePackage, e)
        }),
      onClick:
        customClickBehavior &&
        ((e) => {
          customClickBehavior(baseMousePackage, e)
        }),
      onMouseEnter:
        customHoverBehavior &&
        ((e) => {
          customHoverBehavior(baseMousePackage, e)
        }),
      onMouseLeave: (e) => {
        customHoverBehavior(undefined, e)
      },
      overlayData: baseMousePackage
    }
  })
}
