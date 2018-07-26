import React from "react"

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
  constructor(props) {
    super(props)

    this.state = {
      something: "good",
      mappedChildren: [],
      baseChildAnnotations: [],
      facetHover: undefined,
      facetRExtent: undefined,
      facetXExtent: undefined,
      facetYExtent: undefined
    }
  }
  componentWillMount() {
    this.processFacetController(this.props)
  }
  componentWillReceiveProps(nextProps) {
    this.processFacetController(nextProps)
  }

  processFacetController = facetProps => {
    let rExtentPromises
    let xExtentPromises
    let yExtentPromises
    if (facetProps.sharedRExtent) {
      rExtentPromises = []
    }
    if (facetProps.sharedXExtent) {
      xExtentPromises = []
    }
    if (facetProps.sharedYExtent) {
      yExtentPromises = []
    }

    const mappedChildren = facetProps.children.map(d =>
      this.mapChildrenWithAppropriateProps({
        child: d,
        facetProps,
        rExtentPromises,
        xExtentPromises,
        yExtentPromises
      })
    )

    this.setState({
      mappedChildren: mappedChildren,
      baseChildAnnotations: facetProps.children.map(d => d.props.annotations)
    })

    if (rExtentPromises) {
      Promise.all(rExtentPromises).then(values => {
        const calculatedRExtent = [
          Math.min(...values.map(d => d[0])),
          Math.max(...values.map(d => d[1]))
        ]
        this.setState({
          mappedChildren: mappedChildren.map(child =>
            React.cloneElement(child, { rExtent: calculatedRExtent })
          )
        })
      })
    }
    if (xExtentPromises || yExtentPromises) {
      Promise.all([
        Promise.all(xExtentPromises || []),
        Promise.all(yExtentPromises || [])
      ]).then(values => {
        const xExtentValues = values[0]
        const yExtentValues = values[1]
        let calculatedXExtent, calculatedYExtent
        if (xExtentValues.length > 0) {
          calculatedXExtent = [
            Math.min(...xExtentValues.map(d => d[0])),
            Math.max(...xExtentValues.map(d => d[1]))
          ]
        }
        if (yExtentValues.length > 0) {
          calculatedYExtent = [
            Math.min(...yExtentValues.map(d => d[0])),
            Math.max(...yExtentValues.map(d => d[1]))
          ]
        }
        this.setState({
          mappedChildren: mappedChildren.map(child => {
            const additionalSettings = {}
            if (calculatedXExtent) {
              additionalSettings.xExtent = calculatedXExtent
            }
            if (calculatedYExtent) {
              additionalSettings.yExtent = calculatedYExtent
            }

            return React.cloneElement(child, additionalSettings)
          })
        })
      })
    }
  }

  mapChildrenWithAppropriateProps = ({
    child,
    facetProps,
    rExtentPromises,
    xExtentPromises,
    yExtentPromises
  }) => {
    const rest = { ...facetProps }
    const frameType = child.type.displayName

    if (
      facetProps.hoverAnnotation === true ||
      facetProps.pieceHoverAnnotation === true
    ) {
      rest.customHoverBehavior = d => this.setState({ facetHover: d })
    }

    if (rExtentPromises && frameType === "OrdinalFrame") {
      let extentCallback
      const extentPromise = new Promise((res, rej) => {
        extentCallback = d => {
          if (d) {
            res(d)
          } else {
            rej("rExtent calculation failed")
          }
        }
      })

      rExtentPromises.push(extentPromise)
      rest.rExtent = { onChange: extentCallback }
    }

    if (xExtentPromises && frameType === "XYFrame") {
      let extentCallback
      const extentPromise = new Promise((res, rej) => {
        extentCallback = d => {
          if (d) {
            res(d)
          } else {
            rej("xExtent calculation failed")
          }
        }
      })

      xExtentPromises.push(extentPromise)
      rest.xExtent = { onChange: extentCallback }
    }

    if (yExtentPromises && frameType === "XYFrame") {
      let extentCallback
      const extentPromise = new Promise((res, rej) => {
        extentCallback = d => {
          if (d) {
            res(d)
          } else {
            rej("yExtent calculation failed")
          }
        }
      })

      yExtentPromises.push(extentPromise)
      rest.yExtent = { onChange: extentCallback }
    }

    return React.cloneElement(child, validFrameProps(rest, frameType))
  }

  mapChildrenWithHover = (child, childI) => {
    const annotations = [...this.state.baseChildAnnotations[childI]] || []

    if (this.state.facetHover) {
      const facetHoverAnnotation = { ...this.state.facetHover }
      if (this.state.facetHover.type === "column-hover") {
        delete facetHoverAnnotation.column
        facetHoverAnnotation.facetColumn = this.state.facetHover.column.name
      } else {
        facetHoverAnnotation.type = "frame-hover"
        delete facetHoverAnnotation.y
        delete facetHoverAnnotation.yBottom
        delete facetHoverAnnotation.yMiddle
        delete facetHoverAnnotation.yTop
      }

      annotations.push(facetHoverAnnotation)
    }

    return React.cloneElement(child, { ...child.props, annotations })
  }

  render() {
    //SHARED EXTENT

    return (
      <React.Fragment>
        {this.state.mappedChildren.map(this.mapChildrenWithHover)}
      </React.Fragment>
    )
  }
}

export default FacetController
