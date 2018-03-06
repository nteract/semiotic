import React from 'react'
import PropTypes from 'prop-types'
import XYFrame from './XYFrame'
import OrdinalFrame from './OrdinalFrame'
import NetworkFrame from './NetworkFrame'
import SmartFrame from './SmartFrame'

function sparkNetworkSettings(originalSettings = 'force') {
  let finalSettings = {}
  if (originalSettings) {
    finalSettings = originalSettings
    if (originalSettings === 'force') finalSettings = { type: 'force' }

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

const axisDefaults = {
  tickFormat: () => '',
  baseline: false
}

const allFrameDefaults = {
  margin: 0
}

function simpleValueAccessor(props, d) {
  let value = d.y
  if (props.yAccessor)
    value =
      typeof props.yAccessor === 'string'
        ? d[props.yAccessor]
        : props.yAccessor(d)

  return value.toString ? value.toString() : value
}

const xyFrameDefaults = props => ({
  ...allFrameDefaults,
  ...props,
  hoverAnnotation:
    props.hoverAnnotation === true
      ? [
        d => {
          return {
            type: 'react-annotation',
            label: simpleValueAccessor(props, d),
            dx: 50,
            dy: -50
          }
        }
      ]
      : props.hoverAnnotation,
  axes: props.axes
    ? props.axes.map(a => ({ ...axisDefaults, ...a }))
    : props.axes
})

const ordinalFrameDefaults = props => ({
  ...allFrameDefaults,
  ...props,
  //  hoverAnnotation: props.hoverAnnotation === true ? [{ type: "react-annotation"}] : props.hoverAnnotation,
  axis: props.axis ? { axisDefaults, ...props.axis } : props.axis
})

const networkFrameDefaults = props => ({
  ...allFrameDefaults,
  nodeSizeAccessor: 2,
  ...props,
  networkType: sparkNetworkSettings(props.networkType)
  //  hoverAnnotation: props.hoverAnnotation === true ? [{ type: "react-annotation"}] : props.hoverAnnotation,
})

const createSparkFrame = (Frame, defaults) =>
  class SparkFrame extends React.Component {
    static propTypes = {
      size: PropTypes.array
    }

    static defaultProps = {
      size: []
    }

    constructor(props) {
      super(props)

      this.state = {
        containerHeight: props.size[1],
        containerWidth: props.size[0]
      }
    }

    _onResize = (width, height) => {
      this.setState({ containerHeight: height, containerWidth: width })
    }
    componentDidMount() {
      const element = this.node
      const lineHeight =
        +window.getComputedStyle(element).lineHeight.split('px')[0] - 5

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
        typeof size === 'number' ? size : size[0] ? size[0] : containerHeight
      actualSize[1] = containerHeight

      return (
        <span
          style={Object.assign(
            {
              width: `${actualSize[0]}px`,
              height: `${actualSize[1]}px`,
              display: 'inline-block',
              marginLeft: '5px',
              marginRight: '5px'
            },
            style
          )}
          ref={node => this.node = node}
        >
          <Frame {...defaults(this.props)} size={actualSize} useSpans={true} />
        </span>
      )
    }
  }

export const SparkXYFrame = createSparkFrame(XYFrame, xyFrameDefaults)
export const SparkOrdinalFrame = createSparkFrame(
  OrdinalFrame,
  ordinalFrameDefaults
)
export const SparkNetworkFrame = createSparkFrame(
  NetworkFrame,
  networkFrameDefaults
)
export const SparkSmartFrame = createSparkFrame(SmartFrame, {})
