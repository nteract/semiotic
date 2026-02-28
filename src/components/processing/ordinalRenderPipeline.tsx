import * as React from "react"

import { orFrameConnectionRenderer } from "../svg/frameFunctions"
import { renderLaidOutPieces } from "../svg/pieceDrawing"
import { renderLaidOutSummaries } from "../svg/summaryLayouts"

import {
  OrdinalFrameProps,
  OrdinalFrameState,
  PieceTypeSettings,
  ProjectedOrdinalSummary
} from "../types/ordinalTypes"

import { AxisProps } from "../types/annotationTypes"

import { GenericObject, MarginType, GenericAccessor } from "../types/generalTypes"

import { midMod, zeroFunction, naturalLanguageTypes } from "./ordinalConstants"

import { ScaleBand, ScaleLinear } from "d3-scale"

export interface AssembleRenderPipelineArgs {
  // Piece / overlay data
  usesPieceOverlays: boolean
  shouldRecalculateOverlay: boolean
  calculatedPieceData: GenericObject[]
  projection: string
  customClickBehavior?: Function
  customDoubleClickBehavior?: Function
  customHoverBehavior?: Function
  currentState: OrdinalFrameState

  // Render config (all style/class/renderMode values are pre-converted functions from the cache)
  connectorStyle: Function
  connectorClass: Function
  connectorRenderMode: Function
  connectorCanvasRender: Function
  summaryCanvasRender: Function
  pieceCanvasRender: Function
  connectorType: GenericObject
  eventListenersGenerator: () => Record<string, never>
  pieceType: PieceTypeSettings
  summaryStyle: Function
  summaryClass: Function
  pieceStyle: Function
  pieceClass: Function

  // Data
  keyedData: { [key: string]: GenericObject[] }
  oExtent: string[]
  projectedColumns: { [key: string]: GenericObject }
  calculatedSummaries: ProjectedOrdinalSummary
  oAccessor: Function[]

  // Scales
  rScale: ScaleLinear<number, number>

  // Extent
  calculatedRExtent: number[]
  calculatedOExtent: string[]
  rExtentSettings: GenericObject
  oExtentSettings: { extent?: string[]; onChange?: Function }

  // Layout
  adjustedPosition: number[]
  adjustedSize: number[]
  margin: MarginType

  // Additional props
  backgroundGraphics?: React.ReactNode | Function
  foregroundGraphics?: React.ReactNode | Function
  arrayWrappedAxis?: AxisProps[]
  axis: React.ReactNode[]
  axesTickLines: object[]
  oLabels: React.ReactNode
  title: object
  columnOverlays: GenericObject[]
  oScaleType: ScaleBand<string>
  instantiatedRScaleType: ScaleLinear<number, number>
  oScale: ScaleBand<string>
  rExtent: number[]
  legend?: object | boolean
  pieceIDAccessor: GenericAccessor<string>
  currentProps: OrdinalFrameProps
}

export function assembleRenderPipeline(args: AssembleRenderPipelineArgs) {
  const {
    usesPieceOverlays,
    shouldRecalculateOverlay,
    calculatedPieceData,
    projection,
    customClickBehavior,
    customDoubleClickBehavior,
    customHoverBehavior,
    currentState,

    connectorStyle,
    connectorClass,
    connectorRenderMode,
    connectorCanvasRender,
    summaryCanvasRender,
    pieceCanvasRender,
    connectorType,
    eventListenersGenerator,
    pieceType,
    summaryStyle,
    summaryClass,
    pieceStyle,
    pieceClass,

    keyedData,
    oExtent,
    projectedColumns,
    calculatedSummaries,
    oAccessor,

    rScale,

    calculatedRExtent,
    calculatedOExtent,
    rExtentSettings,
    oExtentSettings,

    adjustedPosition,
    adjustedSize,
    margin,

    backgroundGraphics,
    foregroundGraphics,
    arrayWrappedAxis,
    axis,
    axesTickLines,
    oLabels,
    title,
    oScaleType,
    instantiatedRScaleType,
    oScale,
    rExtent,
    legend,
    pieceIDAccessor,
    currentProps
  } = args

  let { columnOverlays } = args

  // Piece overlays for bar/clusterbar/timeline types
  if (usesPieceOverlays) {
    const yMod = projection === "horizontal" ? midMod : zeroFunction
    const xMod = projection === "vertical" ? midMod : zeroFunction
    if (shouldRecalculateOverlay) {
      columnOverlays = calculatedPieceData.map((d, i) => {
        const mousePackage = {
          ...d.piece,
          x: d.xy.x + xMod(d.xy),
          y: d.xy.y + yMod(d.xy)
        }
        if (React.isValidElement(d.renderElement)) {
          return {
            renderElement: d.renderElement,
            overlayData: mousePackage
          }
        }
        return {
          ...d.renderElement,
          key: `hover-${i}`,
          style: { opacity: 0 },
          overlayData: mousePackage,
          onClick:
            customClickBehavior &&
            ((e) => {
              customClickBehavior(mousePackage.data, e)
            }),
          onDoubleClick:
            customDoubleClickBehavior &&
            ((e) => {
              customDoubleClickBehavior(mousePackage.data, e)
            }),
          onMouseEnter:
            customHoverBehavior &&
            ((e) => {
              customHoverBehavior(mousePackage.data, e)
            }),
          onMouseLeave:
            customHoverBehavior &&
            ((e) => {
              customHoverBehavior(undefined, e)
            })
        }
      })
    } else {
      columnOverlays = currentState.columnOverlays
    }
  }

  const typeAriaLabel = (pieceType.type !== undefined &&
    typeof pieceType.type !== "function" &&
    naturalLanguageTypes[pieceType.type]) || {
    items: "piece",
    chart: "ordinal chart"
  }

  const orFrameRender = {
    connectors: {
      accessibleTransform: (data, i) => data[i],
      projection,
      data: { keyedData, oExtent } as unknown as object[],
      styleFn: connectorStyle,
      classFn: connectorClass,
      renderMode: connectorRenderMode,
      canvasRender: connectorCanvasRender,
      behavior: orFrameConnectionRenderer,
      type: connectorType,
      eventListenersGenerator,
      pieceType
    },
    summaries: {
      accessibleTransform: (data, i) => {
        const columnName = oExtent[i]

        const summaryPackage = {
          type: "column-hover",
          column: projectedColumns[columnName],
          pieces: projectedColumns[columnName].pieceData,
          summary: projectedColumns[columnName].pieceData,
          oAccessor
        }
        return summaryPackage
      },
      data: calculatedSummaries.marks,
      behavior: renderLaidOutSummaries,
      canvasRender: summaryCanvasRender,
      styleFn: summaryStyle,
      classFn: summaryClass
    },
    pieces: {
      accessibleTransform: (data, i) => ({
        ...(data[i].piece ? { ...data[i].piece, ...data[i].xy } : data[i]),
        type: "frame-hover"
      }),
      shouldRender: pieceType.type && pieceType.type !== "none",
      data: calculatedPieceData,
      behavior: renderLaidOutPieces,
      canvasRender: pieceCanvasRender,
      styleFn: pieceStyle,
      classFn: pieceClass,
      axis: arrayWrappedAxis,
      ariaLabel: typeAriaLabel
    }
  }

  if (
    rExtentSettings.onChange &&
    (currentState.calculatedRExtent || []).join(",") !==
      (calculatedRExtent || []).join(",")
  ) {
    rExtentSettings.onChange(calculatedRExtent)
  }

  if (
    oExtentSettings.onChange &&
    (currentState.calculatedOExtent || []).join(",") !==
      (calculatedOExtent || []).join(",")
  ) {
    oExtentSettings.onChange(calculatedOExtent)
  }

  let legendSettings

  if (legend) {
    legendSettings = legend === true ? {} : legend
  }

  return {
    adjustedPosition,
    adjustedSize,
    backgroundGraphics,
    foregroundGraphics,
    axisData: arrayWrappedAxis,
    axes: axis,
    axesTickLines,
    oLabels: { labels: oLabels },
    title,
    columnOverlays,
    renderNumber: currentState.renderNumber + 1,
    oScaleType,
    rScaleType: instantiatedRScaleType,
    oExtent,
    rExtent,
    oScale,
    rScale,
    calculatedOExtent,
    calculatedRExtent,
    projectedColumns,
    margin,
    legendSettings,
    orFrameRender,
    pieceIDAccessor,
    props: currentProps
  }
}
