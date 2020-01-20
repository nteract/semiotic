import * as React from "react"

import { scaleLinear, ScaleLinear } from "d3-scale"

import Axis from "../Axis"


import { XYFrameProps, XYFrameState } from "../types/xyTypes"

import {
    axisPieces,
    axisLines,
    baselineGenerator
} from "../visualizationLayerBehavior/axis"

import {
    calculateDataExtent,
    stringToFn,
    stringToArrayFn
} from "../data/dataFunctions"

import AnnotationCallout from "react-annotation/lib/Types/AnnotationCallout"

import {
    createPoints,
    createLines,
    createSummaries
} from "../visualizationLayerBehavior/general"

import {
    calculateMargin,
    adjustedPositionSize,
    objectifyType
} from "../svg/frameFunctions"

import {
    ProjectedPoint,
    MarginType,
    CanvasPostProcessTypes,
    accessorType,
    ProjectedSummary,
    ProjectedBin,
    ProjectedLine,
    GenericObject,
    LineTypeSettings,
    SummaryTypeSettings,
    RawLine,
    RawSummary,
    RawPoint,
    GenericAccessor,
    RenderPipelineType,
    ExtentType
} from "../types/generalTypes"

const screenScales = ({
    xExtent,
    yExtent,
    adjustedSize,
    xScaleType,
    yScaleType
}: {
    xExtent: number[]
    yExtent: number[]
    adjustedSize: number[]
    xScaleType: ScaleLinear<number, number>
    yScaleType: ScaleLinear<number, number>
}) => {
    const xDomain = [0, adjustedSize[0]]
    const yDomain = [adjustedSize[1], 0]

    const xScale = xScaleType
    const yScale = yScaleType

    if (xScaleType.domain) {
        xScaleType.domain(xExtent)
    }
    if (yScaleType.domain) {
        yScaleType.domain(yExtent)
    }
    xScaleType.range(xDomain)
    yScaleType.range(yDomain)

    return { xScale, yScale }
}

const naturalLanguageLineType = {
    line: { items: "line", chart: "line chart" },
    area: { items: "summary", chart: "summary chart" },
    summary: { items: "summary", chart: "summary chart" },
    cumulative: { items: "line", chart: "cumulative chart" },
    "cumulative-reverse": { items: "line", chart: "cumulative chart" },
    linepercent: { items: "line", chart: "line chart" },
    stackedarea: { items: "stacked area", chart: "stacked area chart" },
    "stackedarea-invert": { items: "stacked area", chart: "stacked area chart" },
    stackedpercent: { items: "stacked area", chart: "stacked area chart" },
    "stackedpercent-invert": {
        items: "stacked area",
        chart: "stacked area chart"
    },
    bumparea: { items: "ranked area", chart: "ranked area chart" },
    "bumparea-invert": { items: "ranked area", chart: "ranked area chart" },
    bumpline: { items: "ranked line", chart: "ranked line chart" },
    difference: {
        items: "line",
        chart: "difference chart"
    }
}

const emptyObjectReturnFunction = () => ({})
const emptyStringReturnFunction = () => ""

export const calculateXYFrame = (currentProps: XYFrameProps, prevState: XYFrameState, updateData: boolean) => {
    const {
        legend,
        lines,
        lineClass,
        pointStyle,
        pointRenderMode,
        pointClass,
        summaryClass,
        canvasLines,
        canvasPoints,
        canvasSummaries,
        defined,
        size,
        renderKey,
        lineType,
        summaryType,
        customLineMark,
        customPointMark,
        customSummaryMark,
        summaryStyle,
        summaryRenderMode,
        lineStyle,
        lineRenderMode,
        xExtent: baseXExtent,
        yExtent: baseYExtent,
        title,
        xScaleType: baseXScaleType = scaleLinear(),
        yScaleType: baseYScaleType = scaleLinear(),
        lineIDAccessor,
        invertX,
        invertY,
        showLinePoints,
        showSummaryPoints,
        points,
        lineDataAccessor,
        summaryDataAccessor,
        yAccessor,
        xAccessor,
        useSummariesAsInteractionLayer,
        baseMarkProps,
        filterRenderedLines,
        filterRenderedSummaries,
        filterRenderedPoints,
        annotations
    } = currentProps
    let {
        projectedLines,
        projectedPoints,
        projectedSummaries,
        summaries,
        fullDataset
    } = currentProps

    if (summaryType && points && !summaries) {
        summaries = [{ coordinates: points }]
    }

    const castXScaleType = (baseXScaleType as unknown) as Function

    const xScaleType = baseXScaleType.domain ? baseXScaleType : castXScaleType()

    const castYScaleType = (baseYScaleType as unknown) as Function

    const yScaleType = baseYScaleType.domain ? baseYScaleType : castYScaleType()

    const annotatedSettings = {
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
        lineType: objectifyType(lineType) as LineTypeSettings,
        summaryType: objectifyType(summaryType) as SummaryTypeSettings,
        lineIDAccessor: stringToFn<string>(lineIDAccessor, l => l.semioticLineID),
        summaries:
            !summaries || (Array.isArray(summaries) && summaries.length === 0)
                ? undefined
                : !Array.isArray(summaries)
                    ? [summaries]
                    : !summaryDataAccessor && !summaries[0].coordinates
                        ? [{ coordinates: summaries }]
                        : summaries,
        lines:
            !lines || (Array.isArray(lines) && lines.length === 0)
                ? undefined
                : !Array.isArray(lines)
                    ? [lines]
                    : !lineDataAccessor && !lines[0].coordinates
                        ? [{ coordinates: lines }]
                        : lines,
        title:
            typeof title === "object" &&
                !React.isValidElement(title) &&
                title !== null
                ? title
                : { title, orient: "top" },
        xExtent: Array.isArray(baseXExtent)
            ? baseXExtent
            : !baseXExtent
                ? undefined
                : baseXExtent.extent,
        yExtent: Array.isArray(baseYExtent)
            ? baseYExtent
            : !baseYExtent
                ? undefined
                : baseYExtent.extent
    }

    if (annotatedSettings.lineType.type === "area") {
        annotatedSettings.lineType.y1 = () => 0
        annotatedSettings.lineType.simpleLine = false
    }

    const summaryStyleFn = stringToFn<GenericObject>(
        summaryStyle,
        emptyObjectReturnFunction,
        true
    )
    const summaryClassFn = stringToFn<string>(
        summaryClass,
        emptyStringReturnFunction,
        true
    )
    const summaryRenderModeFn = stringToFn<GenericObject | string>(
        summaryRenderMode,
        undefined,
        true
    )

    const generatedAxes =
        currentProps.axes &&
        currentProps.axes.map(axisFnOrObject =>
            typeof axisFnOrObject === "function"
                ? axisFnOrObject({ size: currentProps.size })
                : axisFnOrObject
        )

    const margin = calculateMargin({
        margin: currentProps.margin,
        axes: generatedAxes,
        title: annotatedSettings.title,
        size: currentProps.size
    })
    const { adjustedPosition, adjustedSize } = adjustedPositionSize({
        size: currentProps.size,
        margin
    })

    let calculatedXExtent = [],
        calculatedYExtent = [],
        yExtent,
        xExtent,
        xExtentSettings,
        yExtentSettings

    if (typeof baseXExtent === "object") {
        xExtentSettings = baseXExtent
    } else {
        xExtentSettings = { extent: baseXExtent }
    }

    if (typeof baseYExtent === "object") {
        yExtentSettings = baseYExtent
    } else {
        yExtentSettings = { extent: baseYExtent }
    }

    let xScale, yScale

    if (
        updateData ||
        (currentProps.dataVersion &&
            currentProps.dataVersion !== prevState.dataVersion)
    ) {
        //This will always fire at this point because xExtent/yExtent are just defined up there so revisit this logic
        if (
            !xExtent ||
            !yExtent ||
            !fullDataset ||
            (!projectedLines && !projectedPoints && !projectedSummaries)
        ) {
            ; ({
                xExtent,
                yExtent,
                projectedLines,
                projectedPoints,
                projectedSummaries,
                fullDataset,
                calculatedXExtent,
                calculatedYExtent
            } = calculateDataExtent({
                lineDataAccessor: annotatedSettings.lineDataAccessor,
                summaryDataAccessor: annotatedSettings.summaryDataAccessor,
                xAccessor: annotatedSettings.xAccessor,
                yAccessor: annotatedSettings.yAccessor,
                lineType: annotatedSettings.lineType,
                summaryType: annotatedSettings.summaryType,
                summaries: annotatedSettings.summaries,
                points,
                lines: annotatedSettings.lines,
                showLinePoints,
                showSummaryPoints,
                xExtent: baseXExtent,
                yExtent: baseYExtent,
                invertX,
                invertY,
                adjustedSize,
                margin,
                baseMarkProps,
                summaryStyleFn,
                summaryClassFn,
                summaryRenderModeFn,
                chartSize: size,
                xScaleType,
                yScaleType,
                defined,
                filterRenderedLines,
                filterRenderedSummaries,
                filterRenderedPoints,
                annotations
            }))
        }

        ; ({ xScale, yScale } = screenScales({
            xExtent,
            yExtent,
            adjustedSize,
            xScaleType: xScaleType.copy(),
            yScaleType: yScaleType.copy()
        }))
    } else {
        ; ({
            xExtent,
            yExtent,
            projectedLines,
            projectedPoints,
            projectedSummaries,
            fullDataset,
            calculatedXExtent,
            calculatedYExtent
        } = prevState)
        if (
            adjustedSize[0] === prevState.adjustedSize[0] &&
            adjustedSize[1] === prevState.adjustedSize[1]
        ) {
            xScale = prevState.xScale
            yScale = prevState.yScale
        } else {
            ; ({ xScale, yScale } = screenScales({
                xExtent,
                yExtent,
                adjustedSize,
                xScaleType,
                yScaleType
            }))
        }
    }

    xExtent =
        Array.isArray(xExtentSettings.extent) &&
            xExtentSettings.extent.length === 2
            ? xExtentSettings.extent
            : xExtent
    yExtent =
        Array.isArray(yExtentSettings.extent) &&
            yExtentSettings.extent.length === 2
            ? yExtentSettings.extent
            : yExtent

    const canvasDrawing = []

    let axes
    let axesTickLines

    const existingBaselines = {}

    if (generatedAxes) {
        axesTickLines = []
        axes = generatedAxes.map((d, i) => {
            let axisClassname = d.className || ""
            axisClassname += " axis"
            let axisScale = yScale
            if (existingBaselines[d.orient]) {
                d.baseline = d.baseline || false
            }
            existingBaselines[d.orient] = true
            if (d.orient === "top" || d.orient === "bottom") {
                axisClassname += " x"
                axisScale = xScale
            } else {
                axisClassname += " y"
            }
            axisClassname += ` ${d.orient}`

            let tickValues
            if (d.tickValues && Array.isArray(d.tickValues)) {
                tickValues = d.tickValues
            } else if (d.tickValues instanceof Function) {
                //otherwise assume a function
                tickValues = d.tickValues(fullDataset, currentProps.size, axisScale)
            }
            const axisSize = [adjustedSize[0], adjustedSize[1]]

            const axisParts = axisPieces({
                padding: d.padding,
                tickValues,
                scale: axisScale,
                ticks: d.ticks,
                orient: d.orient,
                size: axisSize,
                footer: d.footer,
                tickSize: d.tickSize,
                jaggedBase: d.jaggedBase
            })
            const axisTickLines = (
                <g key={`axes-tick-lines-${i}`} className={`axis ${axisClassname}`}>
                    {axisLines({
                        axisParts,
                        orient: d.orient,
                        tickLineGenerator: d.tickLineGenerator,
                        baseMarkProps,
                        className: axisClassname,
                        jaggedBase: d.jaggedBase,
                        scale: axisScale
                    })}
                    {d.baseline === "under" &&
                        baselineGenerator(d.orient, adjustedSize, d.className)}
                </g>
            )
            axesTickLines.push(axisTickLines)
            return (
                <Axis
                    {...d}
                    key={d.key || `axis-${i}`}
                    annotationFunction={d.axisAnnotationFunction}
                    axisParts={axisParts}
                    size={axisSize}
                    margin={margin}
                    tickValues={tickValues}
                    scale={axisScale}
                    className={axisClassname}
                    xyPoints={fullDataset}
                />
            )
        })
    }
    let legendSettings

    if (legend) {
        legendSettings = legend === true ? {} : legend
        if (projectedLines && !legendSettings.legendGroups) {
            const typeString = annotatedSettings.lineType.type
            const type =
                typeof typeString === "string" &&
                    ["stackedarea", "stackedpercent", "bumparea"].indexOf(typeString) ===
                    -1
                    ? "line"
                    : "fill"
            const legendGroups = [
                {
                    styleFn: currentProps.lineStyle,
                    type,
                    items: projectedLines.map(d =>
                        Object.assign({ label: annotatedSettings.lineIDAccessor(d) }, d)
                    )
                }
            ]
            legendSettings.legendGroups = legendGroups
        }
    }
    const areaAnnotations = []

    if (annotatedSettings.summaryType.label && projectedSummaries) {
        projectedSummaries.forEach((d, i) => {
            if (d.bounds) {
                const bounds = Array.isArray(d.bounds) ? d.bounds : [d.bounds]
                bounds.forEach(labelBounds => {
                    const label =
                        typeof annotatedSettings.summaryType.label === "function"
                            ? annotatedSettings.summaryType.label(d)
                            : annotatedSettings.summaryType.label
                    if (label && label !== null) {
                        const labelPosition = label.position || "center"
                        const labelCenter = [
                            xScale(labelBounds[labelPosition][0]),
                            yScale(labelBounds[labelPosition][1])
                        ] || [xScale(d._xyfCoordinates[0]), yScale(d._xyfCoordinates[1])]
                        const labelContent = label.content || (p => p.value || p.id || i)

                        areaAnnotations.push({
                            x: labelCenter[0],
                            y: labelCenter[1],
                            dx: label.dx,
                            dy: label.dy,
                            className: label.className,
                            type: label.type || AnnotationCallout,
                            note: label.note || { title: labelContent(d) },
                            subject: label.subject || { text: labelContent(d) },
                            connector: label.connector
                        })
                    }
                })
            }
        })
    }

    const lineAriaLabel =
        annotatedSettings.lineType.type !== undefined &&
        typeof annotatedSettings.lineType.type === "string" &&
        naturalLanguageLineType[annotatedSettings.lineType.type]

    const xyFrameRender = {
        lines: {
            accessibleTransform: (data, i) => ({
                ...data[i].data[data[i].data.length - 1],
                type: "frame-hover"
            }),
            data: projectedLines,
            styleFn: stringToFn<GenericObject>(
                lineStyle,
                emptyObjectReturnFunction,
                true
            ),
            classFn: stringToFn<string>(lineClass, emptyStringReturnFunction, true),
            renderMode: stringToFn<GenericObject | string>(
                lineRenderMode,
                undefined,
                true
            ),
            canvasRender: stringToFn<boolean>(canvasLines, undefined, true),
            customMark: customLineMark,
            type: annotatedSettings.lineType,
            defined: defined,
            renderKeyFn: annotatedSettings.renderKeyFn,
            ariaLabel: lineAriaLabel,
            axesData: generatedAxes,
            behavior: createLines
        },
        summaries: {
            accessibleTransform: (data, i) => ({ ...data[i], type: "frame-hover" }),
            data: projectedSummaries,
            styleFn: summaryStyleFn,
            classFn: summaryClassFn,
            renderMode: summaryRenderModeFn,
            canvasRender: stringToFn<boolean>(canvasSummaries, undefined, true),
            customMark: customSummaryMark,
            type: annotatedSettings.summaryType,
            renderKeyFn: annotatedSettings.renderKeyFn,
            behavior: createSummaries
        },
        points: {
            accessibleTransform: (data, i) => ({
                type: "frame-hover",
                ...(data[i].data || data[i])
            }),
            data: projectedPoints,
            styleFn: stringToFn<GenericObject>(
                pointStyle,
                emptyObjectReturnFunction,
                true
            ),
            classFn: stringToFn<string>(
                pointClass,
                emptyStringReturnFunction,
                true
            ),
            renderMode: stringToFn<GenericObject | string>(
                pointRenderMode,
                undefined,
                true
            ),
            canvasRender: stringToFn<boolean>(canvasPoints, undefined, true),
            customMark: customPointMark,
            renderKeyFn: annotatedSettings.renderKeyFn,
            showLinePoints,
            behavior: createPoints
        }
    }

    if (
        xExtentSettings.onChange &&
        prevState.calculatedXExtent.join(",") !== calculatedXExtent.join(",")
    ) {
        xExtentSettings.onChange(calculatedXExtent)
    }
    if (
        yExtentSettings.onChange &&
        prevState.calculatedYExtent.join(",") !== calculatedYExtent.join(",")
    ) {
        yExtentSettings.onChange(calculatedYExtent)
    }

    let overlay = undefined
    if (useSummariesAsInteractionLayer && projectedSummaries) {
        overlay = createSummaries({
            xScale,
            yScale,
            data: projectedSummaries
        }).map((m, i) => ({
            ...m.props,
            style: { fillOpacity: 0 },
            overlayData: projectedSummaries && projectedSummaries[i] // luckily createSummaries is a map fn
        }))
    }

    return {
        lineData: currentProps.lines,
        pointData: currentProps.points,
        summaryData: currentProps.summaries,
        dataVersion: currentProps.dataVersion,
        projectedLines,
        projectedPoints,
        projectedSummaries,
        canvasDrawing,
        fullDataset,
        adjustedPosition,
        adjustedSize,
        backgroundGraphics: currentProps.backgroundGraphics,
        foregroundGraphics: currentProps.foregroundGraphics,
        axesData: generatedAxes,
        axes,
        axesTickLines,
        renderNumber: prevState.renderNumber + 1,
        xScale,
        yScale,
        xAccessor: annotatedSettings.xAccessor,
        yAccessor: annotatedSettings.yAccessor,
        xExtent: [
            xExtent[0] === undefined ? calculatedXExtent[0] : xExtent[0],
            xExtent[1] === undefined ? calculatedXExtent[1] : xExtent[1]
        ],
        yExtent: [
            yExtent[0] === undefined ? calculatedYExtent[0] : yExtent[0],
            yExtent[1] === undefined ? calculatedYExtent[1] : yExtent[1]
        ],
        calculatedXExtent,
        calculatedYExtent,
        margin,
        legendSettings,
        areaAnnotations,
        xyFrameRender,
        size,
        annotatedSettings,
        overlay,
        props: currentProps
    }
}
