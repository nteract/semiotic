import * as React from "react"

import {
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom
} from "../constants/coordinateNames"

import { extent as d3Extent } from "d3-array"
import { voronoi } from "d3-voronoi"
import { Mark } from "semiotic-mark"

import { CustomHoverType } from "../types/annotationTypes"

import {
  InteractionLayerProps,
  VoronoiEntryType
} from "../types/interactionTypes"

const constructDataObject = (
  d?: { data?: object[]; type?: string },
  points?: Object[]
) => {
  if (d === undefined) return d
  return d && d.data ? { points, ...d.data, ...d } : { points, ...d }
}

export const changeVoronoi = (
  voronoiHover: Function,
  d: { type?: string; data?: object[] },
  customHoverTypes: CustomHoverType,
  customHoverBehavior: Function,
  points: Object[],
  e: any
) => {
  //Until semiotic 2
  const dataObject = constructDataObject(d, points)
  if (customHoverBehavior) customHoverBehavior(dataObject)

  if (!d) voronoiHover(null)
  else if (customHoverTypes === true) {
    const vorD = Object.assign({}, dataObject)
    vorD.type = vorD.type === "column-hover" ? "column-hover" : "frame-hover"
    voronoiHover(vorD, e)
  } else if (customHoverTypes) {
    const arrayWrappedHoverTypes = Array.isArray(customHoverTypes)
      ? customHoverTypes
      : [customHoverTypes]
    const mappedHoverTypes = arrayWrappedHoverTypes
      .map((c) => {
        const finalC = typeof c === "function" ? c(dataObject) : c
        if (!finalC) return undefined
        return Object.assign({}, dataObject, finalC)
      })
      .filter((d) => d)

    voronoiHover(mappedHoverTypes, e)
  }
}

export const clickVoronoi = (
  d: Object,
  customClickBehavior: Function,
  points: Object[],
  e: any
) => {
  //Until semiotic 2
  const dataObject = constructDataObject(d, points)

  if (customClickBehavior) customClickBehavior(dataObject, e)
}
export const doubleclickVoronoi = (
  d: Object,
  customDoubleClickBehavior: Function,
  points: Object[],
  e
) => {
  //Until semiotic 2
  const dataObject = constructDataObject(d, points)

  if (customDoubleClickBehavior) customDoubleClickBehavior(dataObject, e)
}

export const brushStart = (
  e?: number[] | number[][],
  columnName?: string,
  data?: object,
  columnData?: object,
  interaction?
) => {
  if (interaction && interaction.start)
    interaction.start(e, columnName, data, columnData)
}

export const brushing = (
  e?: number[] | number[][],
  columnName?: string,
  data?: object,
  columnData?: object,
  interaction?
) => {
  if (interaction && interaction.during)
    interaction.during(e, columnName, data, columnData)
}

export const brushEnd = (
  e?: number[] | number[][],
  columnName?: string,
  data?: object,
  columnData?: object,
  interaction?
) => {
  if (interaction && interaction.end)
    interaction.end(e, columnName, data, columnData)
}

export const calculateOverlay = (
  props: InteractionLayerProps,
  voronoiHover: Function
) => {
  let voronoiPaths = []
  const {
    xScale,
    yScale,
    points,
    projectedX,
    showLinePoints,
    size,
    overlay,
    interactionOverflow = { top: 0, bottom: 0, left: 0, right: 0 },
    customClickBehavior,
    customDoubleClickBehavior,
    customHoverBehavior,
    hoverAnnotation,
    margin,
    advancedSettings = {}
  } = props
  const whichPoints = {
    top: projectedYTop,
    bottom: projectedYBottom
  }

  const pointerStyle =
    customClickBehavior || customDoubleClickBehavior
      ? { cursor: "pointer" }
      : {}

  if (points && hoverAnnotation && !overlay) {
    const { voronoiFilter = () => true } = advancedSettings
    const voronoiDataset: VoronoiEntryType[] = []
    const voronoiUniqueMap = new Map()

    for (const d of points) {
      if (voronoiFilter({ ...d, ...d.data })) {
        const xValue = Math.floor(xScale(d[projectedX]))
        const yValue = Math.floor(
          yScale(
            showLinePoints && d[whichPoints[showLinePoints]] !== undefined
              ? d[whichPoints[showLinePoints]]
              : d[projectedYMiddle] !== undefined
              ? d[projectedYMiddle]
              : d[projectedY]
          )
        )
        if (
          xValue >= 0 - margin.left &&
          xValue <= size[0] + margin.right &&
          yValue >= 0 - margin.top &&
          yValue <= size[1] + margin.bottom &&
          xValue !== undefined &&
          yValue !== undefined &&
          isNaN(xValue) === false &&
          isNaN(yValue) === false
        ) {
          const pointKey = `${xValue},${yValue}`
          if (!voronoiUniqueMap.has(pointKey)) {
            const voronoiPoint = {
              ...d,
              coincidentPoints: [d],
              voronoiX: xValue,
              voronoiY: yValue
            }
            voronoiDataset.push(voronoiPoint)
            voronoiUniqueMap.set(pointKey, voronoiPoint)
          } else voronoiUniqueMap.get(pointKey).coincidentPoints.push(d)
        }
      }
    }

    const voronoiXExtent = d3Extent(voronoiDataset.map((d) => d.voronoiX))
    const voronoiYExtent = d3Extent(voronoiDataset.map((d) => d.voronoiY))

    const voronoiExtent = [
      [
        Math.min(voronoiXExtent[0] - 5, -interactionOverflow.left),
        Math.min(voronoiYExtent[0] - 5, -interactionOverflow.top)
      ],
      [
        Math.max(voronoiXExtent[1] + 5, size[0] + interactionOverflow.right),
        Math.max(voronoiYExtent[1] + 5, size[1] + interactionOverflow.bottom)
      ]
    ]

    const voronoiDiagram = voronoi()
      .extent(voronoiExtent)
      .x((d: VoronoiEntryType) => d.voronoiX)
      .y((d: VoronoiEntryType) => d.voronoiY)

    const voronoiData = voronoiDiagram.polygons(voronoiDataset)

    voronoiPaths = voronoiData.map((d: Array<number>, i: number) => {
      let clipPath = null
      if (advancedSettings.voronoiClipping) {
        const circleSize =
          advancedSettings.voronoiClipping === true
            ? 50
            : advancedSettings.voronoiClipping
        const correspondingD = voronoiDataset[i]
        clipPath = (
          <clipPath id={`voronoi-${i}`}>
            <circle
              r={circleSize}
              cx={correspondingD.voronoiX}
              cy={correspondingD.voronoiY}
            />
          </clipPath>
        )
      }
      return (
        <g key={`voronoi-${i}`}>
          <path
            onClick={(e) => {
              clickVoronoi(voronoiDataset[i], customClickBehavior, points, e)
            }}
            onDoubleClick={(e) => {
              doubleclickVoronoi(
                voronoiDataset[i],
                customDoubleClickBehavior,
                points,
                e
              )
            }}
            onMouseEnter={(e) => {
              changeVoronoi(
                voronoiHover,
                voronoiDataset[i],
                hoverAnnotation,
                customHoverBehavior,
                points,
                e
              )
            }}
            onMouseLeave={(e) => {
              changeVoronoi(
                voronoiHover,
                undefined,
                undefined,
                customHoverBehavior,
                undefined,
                e
              )
            }}
            key={`interactionVoronoi${i}`}
            d={`M${d.join("L")}Z`}
            style={{
              fillOpacity: 0,
              ...pointerStyle
            }}
            clipPath={`url(#voronoi-${i})`}
          />
          {clipPath}
        </g>
      )
    }, this)

    return voronoiPaths
  } else if (overlay) {
    const renderedOverlay: Array<React.ReactNode> = overlay.map(
      (
        overlayRegion: {
          overlayData: object
          renderElement: React.ReactNode
        },
        i: number
      ) => {
        const { overlayData, ...rest } = overlayRegion
        const overlayProps = {
          key: `overlay-${i}`,
          onMouseEnter: (e) => {
            changeVoronoi(
              voronoiHover,
              overlayData,
              props.hoverAnnotation,
              customHoverBehavior,
              points,
              e
            )
          },
          onMouseLeave: (e) => {
            changeVoronoi(
              voronoiHover,
              undefined,
              undefined,
              customHoverBehavior,
              undefined,
              e
            )
          },
          onClick: (e) => {
            clickVoronoi(overlayData, customClickBehavior, points, e)
          },
          onDoubleClick: (e) => {
            doubleclickVoronoi(
              overlayData,
              customDoubleClickBehavior,
              points,
              e
            )
          },
          style: { opacity: 0, ...pointerStyle }
        }

        if (React.isValidElement(overlayRegion.renderElement)) {
          return React.cloneElement(overlayRegion.renderElement, overlayProps)
        } else {
          return (
            <Mark
              forceUpdate={true}
              {...rest}
              key={`overlay-${i}`}
              {...overlayProps}
            />
          )
        }
      }
    )

    return renderedOverlay
  }
}
