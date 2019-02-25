import React from "react"
import PropTypes from "prop-types"

const allFrameDefaults = {
  margin: 0
}

function sparkNetworkSettings(originalSettings = "force") {
  let finalSettings = {}
  if (originalSettings) {
    finalSettings = originalSettings
    if (originalSettings === "force") finalSettings = { type: "force" }

    return {
      edgeStrength: 2,
      edgeDistance: 5,
      nodePadding: 1,
      nodeWidth: 5,
      groupWidth: 4,
      ...finalSettings
    }
  }
  return originalSettings
}

const createSparkFrame = (Frame, defaults, frameName) =>
  class SparkFrame extends React.Component {
    constructor(props) {
      super(props)

      this.state = {
        containerHeight: props.size[1],
        containerWidth: props.size[0]
      }
    }

    static displayName = frameName

    static propTypes = {
      size: PropTypes.oneOfType([PropTypes.array, PropTypes.number])
    }

    static defaultProps = {
      size: []
    }

    _onResize = (width, height) => {
      this.setState({ containerHeight: height, containerWidth: width })
    }
    componentDidMount() {
      const element = this.node
      const lineHeight =
        +window.getComputedStyle(element).lineHeight.split("px")[0] - 5

      this.setState({
        containerHeight: isNaN(lineHeight) ? element.offsetHeight : lineHeight,
        containerWidth: element.offsetWidth
      })
    }

    render() {
      const { size, style = {} } = this.props

      const { containerHeight = 30 } = this.state

      const actualSize = []

      actualSize[0] =
        typeof size === "number" ? size : size[0] ? size[0] : containerHeight
      actualSize[1] = containerHeight

      return (
        <span
          style={Object.assign(
            {
              width: `${actualSize[0]}px`,
              height: `${actualSize[1]}px`,
              display: "inline-block",
              marginLeft: "5px",
              marginRight: "5px"
            },
            style
          )}
          ref={node => (this.node = node)}
        >
          <Frame {...defaults(this.props)} size={actualSize} useSpans={true} />
        </span>
      )
    }
  }

export const axisDefaults = {
  tickFormat: () => "",
  baseline: false
}

export const xyFrameDefaults = props => ({
  ...allFrameDefaults,
  ...props,
  hoverAnnotation: props.hoverAnnotation,
  axes: props.axes
    ? props.axes.map(a => ({ ...axisDefaults, ...a }))
    : props.axes
})

export const ordinalFrameDefaults = props => ({
  ...allFrameDefaults,
  ...props,
  hoverAnnotation: props.hoverAnnotation,
  axis: props.axis ? { axisDefaults, ...props.axis } : props.axis
})

export const networkFrameDefaults = props => ({
  ...allFrameDefaults,
  nodeSizeAccessor: 2,
  ...props,
  networkType: sparkNetworkSettings(props.networkType)
  //  hoverAnnotation: props.hoverAnnotation === true ? [{ type: "react-annotation"}] : props.hoverAnnotation,
})

export default createSparkFrame
