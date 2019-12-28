import * as React from "react"
import memoize from "memoize-one"

import {
  xyframeproptypes,
  ordinalframeproptypes,
  networkframeproptypes,
  responsiveprops
} from "./constants/frame_props"

import { OrdinalFrameProps } from "./types/ordinalTypes"
import { XYFrameProps } from "./types/xyTypes"

import { CustomHoverType } from "./types/annotationTypes"

const framePropHash = {
  NetworkFrame: networkframeproptypes,
  XYFrame: xyframeproptypes,
  OrdinalFrame: ordinalframeproptypes,
  ResponsiveNetworkFrame: { ...networkframeproptypes, ...responsiveprops },
  ResponsiveXYFrame: { ...xyframeproptypes, ...responsiveprops },
  ResponsiveOrdinalFrame: { ...ordinalframeproptypes, ...responsiveprops },
  SparkNetworkFrame: { ...networkframeproptypes },
  SparkXYFrame: { ...xyframeproptypes },
  SparkOrdinalFrame: { ...ordinalframeproptypes }
}

const invertKeys = {
  rExtent: "invertR",
  xExtent: "invertX",
  yExtent: "invertY",

}

const buildNewState = (prevState, extentValue, extentType, extentPosition, invertedExtent) => {
  const oldExtents: object = prevState.rawExtents[extentType] || {}
  oldExtents[extentPosition] = extentValue

  const extentMinMaxValues = Object.values(oldExtents)
    .flat()
    .filter(d => d !== undefined && d !== null && !isNaN(d))

  let baseExtent = [Math.min(...extentMinMaxValues), Math.max(...extentMinMaxValues)]

  if (invertedExtent) {
    baseExtent = baseExtent.reverse()
  }


  return {
    extents: {
      ...prevState.extents,
      [extentType]:
        extentMinMaxValues.length === 0
          ? undefined
          : baseExtent
    },
    rawExtents: {
      ...prevState.rawExtents,
      [extentType]: oldExtents
    }
  }
}

function validFrameProps(originalProps, frameType) {
  const newProps = {}
  const frameProps = framePropHash[frameType]
  Object.keys(originalProps).forEach(key => {
    if (frameProps[key]) {
      newProps[key] = originalProps[key]
    }
  })
  return newProps
}

interface FacetControllerProps {
  children: Element
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
}

class FacetController extends React.Component<Props, State> {
  state = {
    extents: {},
    rawExtents: {},
    facetHover: undefined
  }
  /**
   * Helper for creating extent if we have a  min/max value
   * use that else use the onChange version so we can in return
   * normalize all of the facets to have the same extents
   */
  createExtent = (extentType: string, state: State, index: number) => {
    return state.extents && state.extents[extentType]
      ? {
        onChange: this.extentHandler(extentType, index),
        extent: state.extents[extentType]
      }
      : { onChange: this.extentHandler(extentType, index) }
  }

  /**
   * Whenever the extent changes, create the min/max values for each extentType
   * so this could be rExtent for OrdinalFrame or x/yExtent for the XYFrame
   */
  extentHandler = (extentType: string, extentPosition: number) => {
    const invertedExtent = this.props[invertKeys[extentType]] || false
    return (extentValue: Array<number>) => {
      this.setState(prevState => {
        return buildNewState(prevState, extentValue, extentType, extentPosition, invertedExtent)
      })

      return extentValue
    }
  }

  /**
   * Remove and add required annotation props for specific annotation types.
   */
  generateChildAnnotations = ({
    originalAnnotations,
    state
  }: {
    originalAnnotations: Array<Object>
    state: State
  }) => {
    let annotationBase = state.facetHoverAnnotations
    const annotationSettings =
      this.props.hoverAnnotation || this.props.pieceHoverAnnotation

    if (!annotationSettings || !annotationBase) {
      return originalAnnotations
    }

    if (state.facetHover) {
      const annotations = [...originalAnnotations]

      if (annotationSettings === true) {
        annotationBase = [{ ...state.facetHover }]
      } else {
        const annotationMap = annotationSettings as object[]
        annotationBase = annotationMap.map(annotation => {
          const decoratedAnnotation =
            typeof annotation === "function"
              ? annotation(state.facetHover)
              : { ...state.facetHover, ...annotation }

          return decoratedAnnotation
        })
      }

      if (Array.isArray(annotationBase)) {
        annotationBase.forEach(annotation => {
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

  /**
   * Map hover annotations and extent to child. Initially the extent is an object with
   * an onChange handler however once each of those resolve we then create an
   * extent that matches between all of them. This logic can be found in createExtent and also
   * extentHandler
   */
  mapChildrenWithAppropriateProps = ({
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
    const childType = (child.type as unknown) as { displayName?: string }
    const frameType = childType.displayName
    const annotations = this.generateChildAnnotations({
      state,
      originalAnnotations
    })
    const customProps = { ...props, annotations }

    if (!framePropHash[frameType]) {
      return React.cloneElement(child, { facetprops: customProps })
    }

    // pieceHoverAnnotation could be an object, so we need to be explicit in checking for true
    if (props.hoverAnnotation || props.pieceHoverAnnotation) {
      customProps.customHoverBehavior = d => {
        this.setState({
          facetHover: d,
          facetHoverAnnotations:
            props.hoverAnnotation || props.pieceHoverAnnotation
        })
      }
    }

    if (
      (frameType === "OrdinalFrame" ||
        frameType === "ResponsiveOrdinalFrame" ||
        frameType === "SparkOrdinalFrame") &&
      props.sharedRExtent === true
    ) {
      const invertedExtent = customProps[invertKeys["rExtent"]] || false

      customProps.rExtent = this.createExtent("rExtent", state, index)
      customProps.onUnmount = () => {
        this.setState(prevState => {
          return buildNewState(prevState, [], "rExtent", index, invertedExtent)
        })
      }
    }

    if (
      (frameType === "XYFrame" ||
        frameType === "ResponsiveXYFrame" ||
        frameType === "SparkXYFrame") &&
      props.sharedXExtent === true
    ) {
      const invertedExtent = customProps[invertKeys["xExtent"]] || false
      customProps.xExtent = this.createExtent("xExtent", state, index)
      customProps.onUnmount = () => {
        this.setState(prevState => {
          return buildNewState(prevState, [], "xExtent", index, invertedExtent)
        })
      }
    }

    if (
      (frameType === "XYFrame" ||
        frameType === "ResponsiveXYFrame" ||
        frameType === "SparkXYFrame") &&
      props.sharedYExtent === true
    ) {
      const invertedExtent = customProps[invertKeys["yExtent"]] || false
      customProps.yExtent = this.createExtent("yExtent", state, index)
      customProps.onUnmount = () => {
        this.setState(prevState => {
          return buildNewState(prevState, [], "yExtent", index, invertedExtent)
        })
      }
    }
    if (customProps.pieceHoverAnnotation) {
      customProps.pieceHoverAnnotation = []
    } else if (customProps.hoverAnnotation) {
      customProps.hoverAnnotation = []
    }

    return React.cloneElement(child, validFrameProps(customProps, frameType))
  }

  /**
   * Memoize the mapping to prevent unecessary updates and not have
   * to use the lifecycle methods.
   */
  processFacetController = memoize((props: Props, state: State) => {
    return React.Children.map(
      (props.children as unknown) as React.ReactElement[],
      (child: React.ReactElement, index) => {
        if (!child) return null
        return this.mapChildrenWithAppropriateProps({
          child,
          index,
          originalAnnotations: child.props.annotations || [],
          props,
          state
        })
      }
    )
  })

  render() {
    return (
      <React.Fragment>
        {this.processFacetController(this.props, this.state)}
      </React.Fragment>
    )
  }
}

export default FacetController
