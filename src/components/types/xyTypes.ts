import { AxisProps, CustomHoverType, AnnotationHandling, AxisGeneratingFunction } from "./annotationTypes";
import { TitleType } from "../svg/frameFunctions";
import { CanvasPostProcessTypes, GenericAccessor, RawLine, RawPoint, RawSummary, ExtentType, accessorType, LineTypeSettings, SummaryTypeSettings, ProjectedPoint, ProjectedBin, ProjectedSummary, ProjectedLine, MarginType, RenderPipelineType } from "./generalTypes"
import { Interactivity } from "./interactionTypes";
import { ScaleLinear } from "d3-scale";

export type XYFrameProps = {
    useSpans: boolean
    title?: string | object
    margin?:
    | number
    | { top?: number; bottom?: number; left?: number; right?: number }
    | ((
        args: object
    ) =>
        | number
        | { top?: number; left?: number; right?: number; bottom?: number }
    )
    name: string
    dataVersion?: string
    frameKey?: string
    size: number[]
    canvasPostProcess?: CanvasPostProcessTypes
    additionalDefs?: React.ReactNode
    className?: string
    customHoverBehavior?: Function
    customClickBehavior?: Function
    customDoubleClickBehavior?: Function
    hoverAnnotation?: CustomHoverType
    disableContext?: boolean
    interaction?: Interactivity
    svgAnnotationRules?: Function
    htmlAnnotationRules?: Function
    tooltipContent?: Function
    optimizeCustomTooltipPosition?: boolean
    annotations: object[]
    baseMarkProps?: object
    backgroundGraphics?: React.ReactNode | Function
    foregroundGraphics?: React.ReactNode | Function
    beforeElements?: React.ReactNode
    afterElements?: React.ReactNode
    annotationSettings?: AnnotationHandling
    renderKey?: string | GenericAccessor<string>
    legend?: object | boolean
    lines?: RawLine[] | RawLine
    points?: RawPoint[]
    areas?: RawSummary[] | RawSummary
    summaries?: RawSummary[] | RawSummary
    axes?: Array<AxisProps | AxisGeneratingFunction>
    matte?: object
    xScaleType?: ScaleLinear<number, number>
    yScaleType?: ScaleLinear<number, number>
    xExtent?: ExtentType
    yExtent?: ExtentType
    invertX?: boolean
    invertY?: boolean
    xAccessor?: accessorType<number>
    yAccessor?: accessorType<number>
    lineDataAccessor?: accessorType<RawPoint[]>
    areaDataAccessor?: accessorType<RawPoint[]>
    summaryDataAccessor?: accessorType<RawPoint[]>
    lineType: LineTypeSettings
    areaType: SummaryTypeSettings
    summaryType: SummaryTypeSettings
    lineRenderMode?: string | object | Function
    pointRenderMode?: string | object | Function
    areaRenderMode?: string | object | Function
    summaryRenderMode?: string | object | Function
    showLinePoints?: boolean | string
    showSummaryPoints?: boolean
    defined?: Function
    lineStyle?: GenericAccessor<object> | object
    pointStyle?: GenericAccessor<object> | object
    areaStyle?: GenericAccessor<object> | object
    summaryStyle?: GenericAccessor<object> | object
    lineClass?: GenericAccessor<string> | string
    pointClass?: GenericAccessor<string> | string
    areaClass?: GenericAccessor<string> | string
    summaryClass?: GenericAccessor<string> | string
    canvasPoints?: GenericAccessor<boolean> | boolean
    canvasLines?: GenericAccessor<boolean> | boolean
    canvasAreas?: GenericAccessor<boolean> | boolean
    canvasSummaries?: GenericAccessor<boolean> | boolean
    customPointMark?: Function | object
    customLineMark?: Function
    customAreaMark?: Function
    customSummaryMark?: Function
    lineIDAccessor?: GenericAccessor<string> | string
    minimap?: object
    fullDataset?: Array<ProjectedPoint | ProjectedBin | ProjectedSummary>
    projectedLines?: ProjectedLine[]
    projectedAreas?: Array<ProjectedSummary>
    projectedSummaries?: Array<ProjectedSummary>
    projectedPoints?: ProjectedPoint[]
    renderOrder?: ReadonlyArray<"lines" | "points" | "summaries">
    useAreasAsInteractionLayer?: boolean
    useSummariesAsInteractionLayer?: boolean
    onUnmount?: Function
    filterRenderedLines?: (
        value: ProjectedLine,
        index: number,
        array: ProjectedLine[]
    ) => any
    filterRenderedSummaries?: (
        value: ProjectedSummary,
        index: number,
        array: ProjectedSummary[]
    ) => any
    filterRenderedPoints?: (
        value: ProjectedPoint | ProjectedBin | ProjectedSummary,
        index: number,
        array: (ProjectedPoint | ProjectedBin | ProjectedSummary)[]
    ) => any
}

export type AnnotatedSettingsProps = {
    xAccessor?: GenericAccessor<number>[]
    yAccessor?: GenericAccessor<number>[]
    summaryDataAccessor?: GenericAccessor<RawPoint[]>[]
    lineDataAccessor?: GenericAccessor<RawPoint[]>[]
    renderKeyFn?: GenericAccessor<string>
    lineType?: LineTypeSettings
    summaryType?: SummaryTypeSettings
    lineIDAccessor?: GenericAccessor<string>
    summaries?: object[]
    lines?: object[]
    title?: TitleType
    xExtent?: number[]
    yExtent?: number[]
}

export type XYFrameState = {
    dataVersion?: string
    lineData?: RawLine[] | RawLine
    pointData?: RawPoint[] | RawPoint
    summaryData?: RawSummary[] | RawSummary
    projectedLines?: ProjectedLine[]
    projectedPoints?: ProjectedPoint[]
    projectedSummaries?: ProjectedSummary[]
    fullDataset: Array<ProjectedPoint | ProjectedBin | ProjectedSummary>
    adjustedPosition: number[]
    adjustedSize: number[]
    backgroundGraphics?: React.ReactNode | Function
    foregroundGraphics?: React.ReactNode | Function
    axesData?: AxisProps[]
    axes?: React.ReactNode[]
    axesTickLines?: React.ReactNode
    renderNumber: number
    margin: MarginType
    matte?: boolean | object | Element | Function
    calculatedXExtent: number[]
    calculatedYExtent: number[]
    xAccessor: GenericAccessor<number>[]
    yAccessor: GenericAccessor<number>[]
    xScale: ScaleLinear<number, number>
    yScale: ScaleLinear<number, number>
    xExtent: number[]
    yExtent: number[]
    areaAnnotations: object[]
    legendSettings?: object
    xyFrameRender: RenderPipelineType
    canvasDrawing: object[]
    size: number[]
    annotatedSettings: AnnotatedSettingsProps
    overlay?: object[]
    props: XYFrameProps
}
