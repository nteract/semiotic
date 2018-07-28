import React from "react"
import memoize from "memoize-one"

import {
  xyframeproptypes,
  ordinalframeproptypes,
  networkframeproptypes
} from "./constants/frame_props"

const framePropHash = {
  NetworkFrame: networkframeproptypes,
  XYFrame: xyframeproptypes,
  OrdinalFrame: ordinalframeproptypes
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

class FacetController extends React.Component {
  constructor() {
    super()

    this.state = {
      extents: {},
      facetHover: undefined
    }
  }

  /**
   * Helper for creating extent if we have a  min/max value
   * use that else use the onChange version so we can in return
   * normalize all of the facets to have the same extents
   */
  createExtent = (extentType, state) => {
    return state.extents && state.extents[extentType]
      ? state.extents[extentType]
      : { onChange: this.extentHandler(extentType) }
  }

  /**
   * Whenever the extent changes, create the min/max values for each extentType
   * so this could be rExtent for OrdinalFrame or x/yExtent for the XYFrame
   */
  extentHandler = extentType => {
    return d => {
      this.setState(prevState => {
        const extentMinMaxValues = (prevState.extents[extentType] || []).concat(
          d
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

      return d
    }
  }

  /**
   * Memoize the mapping to prevent unecessary updates and not have
   * to use the lifecycle methods.
   */
  processFacetController = memoize((props, state) => {
    return React.Children.map(props.children, child =>
      this.mapChildrenWithAppropriateProps({
        child,
        props,
        state
      })
    )
  })

  mapChildrenWithAppropriateProps = ({ child, props, state }) => {
    const frameType = child.type.displayName
    const annotations = this.mapChildrenWithHoverAnnotations({ child, state })
    const customProps = { ...props, annotations }

    // pieceHoverAnnotation could be an object, so we need to be explicit in checking for true
    if (props.hoverAnnotation === true || props.pieceHoverAnnotation === true) {
      customProps.customHoverBehavior = d => this.setState({ facetHover: d })
    }

    if (frameType === "OrdinalFrame") {
      customProps.rExtent = this.createExtent("rExtent", state)
    } else if (frameType === "XYFrame") {
      customProps.xExtent = this.createExtent("xExtent", state)
      customProps.yExtent = this.createExtent("yExtent", state)
    }

    return React.cloneElement(child, validFrameProps(customProps, frameType))
  }

  mapChildrenWithHoverAnnotations = ({ child, state }) => {
    const annotations = child.annotations || []

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

  render() {
    return (
      <React.Fragment>
        {this.processFacetController(this.props, this.state)}
      </React.Fragment>
    )
  }
}

export default FacetController
