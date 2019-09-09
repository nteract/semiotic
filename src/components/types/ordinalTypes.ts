
import {
    AnnotationHandling,
    CustomHoverType,
    AnnotationType
} from "./annotationTypes"

import {
    CanvasPostProcessTypes,
    ProjectionTypes,
    accessorType,
    GenericObject,
    OrdinalSummaryTypeSettings
} from "./generalTypes"

import {
    ScaleLinear,
    ScaleBand
} from "d3-scale"

import { AxisProps, AxisGeneratingFunction } from "./annotationTypes"

import { Interactivity } from "./interactionTypes"

import {
    MarginType,
    GenericAccessor,
    RenderPipelineType
} from "./generalTypes"

export type OExtentObject = { extent?: Array<string>; onChange?: Function }

type OExtentSettingsType = Array<string> | OExtentObject

interface RExtentObject {
    extent?: Array<number>
    onChange?: Function
    includeAnnotations?: boolean
}

type PieceTypes =
    | "none"
    | "bar"
    | "clusterbar"
    | "point"
    | "swarm"
    | "timeline"
    | "barpercent"

export type PieceTypeSettings = {
    type: PieceTypes
    offsetAngle?: number
    angleRange?: number[]
}

export type ProjectedOrdinalSummary = {
    originalData?: { x?: number; y?: number }
    xyPoints?: object[]
    marks?: object[]
}

export type OrdinalFrameProps = {
    type: PieceTypeSettings
    summaryType: OrdinalSummaryTypeSettings
    connectorType?: Function
    className?: string
    annotationSettings?: AnnotationHandling
    size: Array<number>
    rAccessor?: accessorType<number>
    oAccessor?: accessorType<string | number>
    oExtent?: OExtentSettingsType
    rExtent?: RExtentObject | number[]
    name?: string
    annotations: Array<object>
    matte?: boolean | object | Element | Function
    renderKey?: accessorType<string | number>
    interaction?: Interactivity
    customClickBehavior?: Function
    customHoverBehavior?: Function
    customDoubleClickBehavior?: Function
    invertR: boolean
    projection: ProjectionTypes
    backgroundGraphics?: React.ReactNode | Function
    foregroundGraphics?: React.ReactNode | Function
    afterElements?: React.ReactNode
    beforeElements?: React.ReactNode
    disableContext?: boolean
    summaryHoverAnnotation?: CustomHoverType
    pieceHoverAnnotation?: CustomHoverType
    hoverAnnotation?: CustomHoverType
    canvasPostProcess?: CanvasPostProcessTypes
    baseMarkProps?: object
    useSpans: boolean
    canvasPieces?: boolean | accessorType<boolean>
    canvasSummaries?: boolean | accessorType<boolean>
    connectorClass?: string | accessorType<string>
    pieceClass?: string | accessorType<string>
    summaryClass?: string | accessorType<string>
    connectorRenderMode?: string | accessorType<string | GenericObject>
    connectorStyle?: object | accessorType<GenericObject>
    canvasConnectors?: boolean | accessorType<boolean>
    summaryStyle?: object | accessorType<object>
    style?: object | accessorType<object>
    sortO?: (a: any, b: any, c: object[], d: object[]) => number
    oSort?: (a: any, b: any, c: object[], d: object[]) => number
    dynamicColumnWidth?: string | accessorType<number>
    pieceIDAccessor?: string | accessorType<string>
    ordinalAlign?: string
    oLabel?: boolean | accessorType<string | Element>
    margin?:
    | number
    | { top?: number; left?: number; right?: number; bottom?: number }
    | ((
        args: object
    ) =>
        | number
        | { top?: number; left?: number; right?: number; bottom?: number }
    )
    renderMode?: object | string | accessorType<string | object>
    summaryRenderMode?: object | string | accessorType<string | object>
    dataVersion?: string
    svgAnnotationRules?: Function
    htmlAnnotationRules?: Function
    pixelColumnWidth?: number
    title?: React.ReactNode
    oScaleType: ScaleBand<string>
    rScaleType: ScaleLinear<number, number>
    legend?: object
    data: Array<object | number>
    oPadding?: number
    axis?: AxisProps | Array<AxisProps>
    axes?:
    | AxisGeneratingFunction
    | AxisProps
    | Array<AxisProps | AxisGeneratingFunction>
    summaryPosition?: Function
    additionalDefs?: React.ReactNode
    tooltipContent?: Function
    optimizeCustomTooltipPosition?: boolean
    renderOrder?: ReadonlyArray<"pieces" | "summaries" | "connectors">
    multiAxis?: boolean
    onUnmount?: Function
}

export type OrdinalFrameState = {
    dataVersion?: string
    pieceDataXY: Array<object>
    adjustedPosition: Array<number>
    adjustedSize: Array<number>
    backgroundGraphics: React.ReactNode
    foregroundGraphics: React.ReactNode
    axisData?: AxisProps[]
    axes?: React.ReactNode[]
    axesTickLines?: React.ReactNode
    oLabels: React.ReactNode
    title: object
    columnOverlays: Array<object>
    renderNumber: number
    oAccessor: Array<Function>
    rAccessor: Array<Function>
    oScaleType: ScaleBand<string>
    rScaleType: ScaleLinear<number, number>
    oExtent: Array<string>
    rExtent: Array<number>
    oScale: ScaleBand<string>
    rScale: ScaleLinear<number, number>
    calculatedOExtent: Array<string>
    calculatedRExtent: Array<number>
    projectedColumns: object
    margin: MarginType
    legendSettings: object
    orFrameRender: RenderPipelineType
    pieceIDAccessor: GenericAccessor<string>
    type: object
    summaryType: object
    props: OrdinalFrameProps
}
