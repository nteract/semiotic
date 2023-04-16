import * as React from "react"
import { useState } from "react"
import memoize from "memoize-one"

import { OrdinalFrameProps } from "../types/ordinalTypes"
import { XYFrameProps } from "../types/xyTypes"

import { CustomHoverType } from "../types/annotationTypes"

const framePropHash = {
  NetworkFrame: true,
  XYFrame: true,
  OrdinalFrame: true,
  ResponsiveNetworkFrame: true,
  ResponsiveXYFrame: true,
  ResponsiveOrdinalFrame: true,
  SparkNetworkFrame: true,
  SparkXYFrame: true,
  SparkOrdinalFrame: true
}

const invertKeys = {
  rExtent: "invertR",
  xExtent: "invertX",
  yExtent: "invertY"
}

const buildNewState = (
  prevState,
  extentValue,
  extentType,
  extentPosition,
  invertedExtent
) => {
  const oldExtents: object = prevState.rawExtents[extentType] || {}
  oldExtents[extentPosition] = extentValue

  const extentMinMaxValues = Object.values(oldExtents)
    .flat()
    .filter((d) => d !== undefined && d !== null && !isNaN(d))

  let baseExtent = [
    Math.min(...extentMinMaxValues),
    Math.max(...extentMinMaxValues)
  ]

  if (invertedExtent) {
    baseExtent = baseExtent.reverse()
  }

  return {
    extents: {
      ...prevState.extents,
      [extentType]: extentMinMaxValues.length === 0 ? undefined : baseExtent
    },
    rawExtents: {
      ...prevState.rawExtents,
      [extentType]: oldExtents
    }
  }
}

function validFrameProps(originalProps) {
  const newProps = { ...originalProps }
  return newProps
}

interface FacetControllerProps {
  children: React.ReactElement
  sharedRExtent: boolean
  sharedXExtent: boolean
  sharedYExtent: boolean
}

type Props = FacetControllerProps & OrdinalFrameProps & XYFrameProps

interface State {
  extents: object
  rawExtents: object
  facetHover?: object
  facetHoverAnnotations?: CustomHoverType
  changeExtents: Function
  changeRawExtents: Function
  changeFacetHover: Function
  changeFacetHoverAnnotations: Function
}

const processFacetController = memoize((props: Props, state: State) => {
  return React.Children.map(
    props.children as unknown as React.ReactElement[],
    (child: React.ReactElement, index) => {
      if (!child) return null
      return mapChildrenWithAppropriateProps({
        child,
        index,
        originalAnnotations: child.props.annotations || [],
        props,
        state
      })
    }
  )
})

/**
 * Helper for creating extent if we have a  min/max value
 * use that else use the onChange version so we can in return
 * normalize all of the facets to have the same extents
 */
const createExtent = (
  extentType: string,
  props: Props,
  state: State,
  index: number
) => {
  return state.extents && state.extents[extentType]
    ? {
        onChange: extentHandler(extentType, props, state, index),
        extent: state.extents[extentType]
      }
    : { onChange: extentHandler(extentType, props, state, index) }
}

/**
 * Whenever the extent changes, create the min/max values for each extentType
 * so this could be rExtent for OrdinalFrame or x/yExtent for the XYFrame
 */
const extentHandler = (
  extentType: string,
  props: Props,
  state: State,
  extentPosition: number
) => {
  const invertedExtent = props[invertKeys[extentType]] || false
  return (extentValue: Array<number>) => {
    const newState = buildNewState(
      state,
      extentValue,
      extentType,
      extentPosition,
      invertedExtent
    )

    state.changeRawExtents(newState.rawExtents)
    state.changeExtents(newState.extents)

    return extentValue
  }
}

/**
 * Map hover annotations and extent to child. Initially the extent is an object with
 * an onChange handler however once each of those resolve we then create an
 * extent that matches between all of them. This logic can be found in createExtent and also
 * extentHandler
 */
const mapChildrenWithAppropriateProps = ({
  child,
  index,
  originalAnnotations,
  props,
  state
}: {
  child: React.ReactElement
  props: Props
  index: number
  state: State
  originalAnnotations: Array<Object>
}) => {
  const childType = child.type as unknown as { displayName?: string }
  const frameType = childType.displayName
  const annotations = generateChildAnnotations({
    state,
    props,
    originalAnnotations
  })
  const customProps = { ...props, annotations }

  if (!framePropHash[frameType]) {
    return React.cloneElement(child, { facetprops: customProps })
  }

  // pieceHoverAnnotation could be an object, so we need to be explicit in checking for true
  if (props.hoverAnnotation || props.pieceHoverAnnotation) {
    customProps.customHoverBehavior = (d) => {
      state.changeFacetHover(d)
      state.changeFacetHoverAnnotations(
        props.hoverAnnotation || props.pieceHoverAnnotation
      )
    }
  }

  if (
    (frameType === "OrdinalFrame" ||
      frameType === "ResponsiveOrdinalFrame" ||
      frameType === "SparkOrdinalFrame") &&
    props.sharedRExtent === true
  ) {
    const invertedExtent = customProps[invertKeys["rExtent"]] || false

    customProps.rExtent = createExtent("rExtent", props, state, index)
    customProps.onUnmount = () => {
      const newState = buildNewState(
        state,
        [],
        "rExtent",
        index,
        invertedExtent
      )
      state.changeRawExtents(newState.rawExtents)
      state.changeExtents(newState.extents)
    }
  }

  if (
    (frameType === "XYFrame" ||
      frameType === "ResponsiveXYFrame" ||
      frameType === "SparkXYFrame") &&
    props.sharedXExtent === true
  ) {
    const invertedExtent = customProps[invertKeys["xExtent"]] || false
    customProps.xExtent = createExtent("xExtent", props, state, index)
    customProps.onUnmount = () => {
      const newState = buildNewState(
        state,
        [],
        "xExtent",
        index,
        invertedExtent
      )
      state.changeRawExtents(newState.rawExtents)
      state.changeExtents(newState.extents)
    }
  }

  if (
    (frameType === "XYFrame" ||
      frameType === "ResponsiveXYFrame" ||
      frameType === "SparkXYFrame") &&
    props.sharedYExtent === true
  ) {
    const invertedExtent = customProps[invertKeys["yExtent"]] || false
    customProps.yExtent = createExtent("yExtent", props, state, index)
    customProps.onUnmount = () => {
      const newState = buildNewState(
        state,
        [],
        "yExtent",
        index,
        invertedExtent
      )
      state.changeRawExtents(newState.rawExtents)
      state.changeExtents(newState.extents)
    }
  }
  if (customProps.pieceHoverAnnotation) {
    customProps.pieceHoverAnnotation = []
  } else if (customProps.hoverAnnotation) {
    customProps.hoverAnnotation = []
  }

  return React.cloneElement(child, validFrameProps(customProps))
}

/**
 * Remove and add required annotation props for specific annotation types.
 */

const generateChildAnnotations = ({
  originalAnnotations,
  state,
  props
}: {
  originalAnnotations: Array<Object>
  state: State
  props: Props
}) => {
  let annotationBase = state.facetHoverAnnotations

  const { hoverAnnotation, pieceHoverAnnotation } = props
  const annotationSettings = hoverAnnotation || pieceHoverAnnotation

  if (!annotationSettings || !annotationBase) {
    return originalAnnotations
  }

  if (state.facetHover) {
    const annotations = [...originalAnnotations]

    if (annotationSettings === true) {
      annotationBase = [{ ...state.facetHover }]
    } else {
      const annotationMap = annotationSettings as object[]
      annotationBase = annotationMap.map((annotation) => {
        const decoratedAnnotation =
          typeof annotation === "function"
            ? annotation(state.facetHover)
            : { ...state.facetHover, ...annotation }

        return decoratedAnnotation
      })
    }

    if (Array.isArray(annotationBase)) {
      annotationBase.forEach((annotation) => {
        if (typeof annotation !== "function") {
          if (annotation.type === "column-hover") {
            annotation.facetColumn = annotation.column.name
            annotation.column = undefined
          } else {
            if (!annotation.type) {
              annotation.type = "frame-hover"
            }
            annotation.y = undefined
            annotation.yBottom = undefined
            annotation.yMiddle = undefined
            annotation.yTop = undefined
          }
        }
      })

      annotations.push(...annotationBase)
    }
    return annotations
  }

  return originalAnnotations
}

export default function FacetController(props: Props) {
  const [extents, changeExtents] = useState({})
  const [rawExtents, changeRawExtents] = useState({})
  const [facetHover, changeFacetHover] = useState(undefined)
  const [facetHoverAnnotations, changeFacetHoverAnnotations] =
    useState(undefined)

  return (
    <React.Fragment>
      {processFacetController(props, {
        extents,
        rawExtents,
        facetHover,
        facetHoverAnnotations,
        changeFacetHoverAnnotations,
        changeExtents,
        changeRawExtents,
        changeFacetHover
      })}
    </React.Fragment>
  )
}
