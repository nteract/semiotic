// @flow

import React from "react"
import memoize from "memoize-one"

import {
  xyframeproptypes,
  ordinalframeproptypes,
  networkframeproptypes,
  responsiveprops
} from "./constants/frame_props"

import type { Node, Element } from "react"
import type { OrdinalFrameProps } from "./OrdinalFrame"
import type { XYFrameProps } from "./XYFrame"

const framePropHash = {
  NetworkFrame: networkframeproptypes,
  XYFrame: xyframeproptypes,
  OrdinalFrame: ordinalframeproptypes,
  ResponsiveNetworkFrame: { ...networkframeproptypes, ...responsiveprops },
  ResponsiveXYFrame: { ...xyframeproptypes, ...responsiveprops },
  ResponsiveOrdinalFrame: { ...ordinalframeproptypes, ...responsiveprops }
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

type FacetControllerProps = {
  children: Node,
  react15Wrapper: Element<*>,
  sharedRExtent: boolean,
  sharedXExtent: boolean,
  sharedYExtent: boolean
}

type Props = FacetControllerProps & OrdinalFrameProps & XYFrameProps

type State = {
  extents: Object,
  facetHover: ?Object
}

class FacetController extends React.Component<Props, State> {
  constructor() {
    super()

    this.state = {
      extents: {},
      facetHover: undefined
    }
  }

  componentWillReceiveProps() {
    /**
     * Clear extent to ensure that you're not keeping old minima/maxima based on old data
     */
    this.setState({ extents: {} })
  }

  /**
   * Helper for creating extent if we have a  min/max value
   * use that else use the onChange version so we can in return
   * normalize all of the facets to have the same extents
   */
  createExtent = (extentType: string, state: State) => {
    return state.extents && state.extents[extentType]
      ? {
          onChange: this.extentHandler(extentType),
          extent: state.extents[extentType]
        }
      : { onChange: this.extentHandler(extentType) }
  }

  /**
   * Whenever the extent changes, create the min/max values for each extentType
   * so this could be rExtent for OrdinalFrame or x/yExtent for the XYFrame
   */
  extentHandler = (extentType: string) => {
    return (extentValue: Array<number>) => {
      this.setState(prevState => {
        const extentMinMaxValues = (prevState.extents[extentType] || []).concat(
          extentValue
        )

        return {
          extents: {
            ...prevState.extents,
            [extentType]: [
              Math.min(...extentMinMaxValues),
              Math.max(...extentMinMaxValues)
            ]
          }
        }
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
    originalAnnotations: Array<Object>,
    state: State
  }) => {
    const annotations = [...originalAnnotations]

    if (state.facetHover) {
      const facetHoverAnnotation = { ...state.facetHover }
      if (facetHoverAnnotation.type === "column-hover") {
        facetHoverAnnotation.facetColumn = facetHoverAnnotation.column.name
        facetHoverAnnotation.column = undefined
      } else {
        facetHoverAnnotation.type = "frame-hover"
        facetHoverAnnotation.y = undefined
        facetHoverAnnotation.yBottom = undefined
        facetHoverAnnotation.yMiddle = undefined
        facetHoverAnnotation.yTop = undefined
      }

      annotations.push(facetHoverAnnotation)
    }

    return annotations
  }

  /**
   * Map hover annotations and extent to child. Initially the extent is an object with
   * an onChange handler however once each of those resolve we then create an
   * extent that matches between all of them. This logic can be found in createExtent and also
   * extentHandler
   */
  mapChildrenWithAppropriateProps = ({
    child,
    originalAnnotations,
    props,
    state
  }: {
    child: Element<*>,
    props: Props,
    state: State,
    originalAnnotations: Array<Object>
  }) => {
    const frameType = child.type.displayName
    const annotations = this.generateChildAnnotations({
      state,
      originalAnnotations
    })
    const customProps = { ...props, annotations }

    if (!frameType) {
      return React.cloneElement(child, { facetprops: customProps })
    }

    // pieceHoverAnnotation could be an object, so we need to be explicit in checking for true
    if (props.hoverAnnotation === true || props.pieceHoverAnnotation === true) {
      customProps.customHoverBehavior = d => this.setState({ facetHover: d })
    }

    if (
      (frameType === "OrdinalFrame" ||
        frameType === "ResponsiveOrdinalFrame") &&
      props.sharedRExtent === true
    ) {
      customProps.rExtent = this.createExtent("rExtent", state)
    }

    if (
      (frameType === "XYFrame" || frameType === "ResponsiveXYFrame") &&
      props.sharedXExtent === true
    ) {
      customProps.xExtent = this.createExtent("xExtent", state)
    }

    if (
      (frameType === "XYFrame" || frameType === "ResponsiveXYFrame") &&
      props.sharedYExtent === true
    ) {
      customProps.yExtent = this.createExtent("yExtent", state)
    }

    return React.cloneElement(child, validFrameProps(customProps, frameType))
  }

  /**
   * Memoize the mapping to prevent unecessary updates and not have
   * to use the lifecycle methods.
   */
  processFacetController = memoize((props: Props, state: State) => {
    return React.Children.map(props.children, child => {
      return this.mapChildrenWithAppropriateProps({
        child,
        originalAnnotations: child.props.annotations || [],
        props,
        state
      })
    })
  })

  render() {
    const Wrapper = this.props.react15Wrapper

    if (Wrapper) {
      return React.cloneElement(
        Wrapper,
        undefined,
        this.processFacetController(this.props, this.state)
      )
    }

    return (
      <React.Fragment>
        {this.processFacetController(this.props, this.state)}
      </React.Fragment>
    )
  }
}

export default FacetController
