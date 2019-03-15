import * as React from "react"
import elementResizeEvent from "./vendor/element-resize-event"

type ResponsiveFrameProps = {
  debounce: number
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  size?: number[]
  dataVersion?: string
  gridDisplay?: boolean
}

type ResponsiveFrameState = {
  containerHeight?: number
  containerWidth?: number
}

const createResponsiveFrame = Frame =>
  class ResponsiveFrame extends React.Component<
    ResponsiveFrameProps,
    ResponsiveFrameState
  > {
    constructor(props) {
      super(props)

      this.state = {
        containerHeight: undefined,
        containerWidth: undefined
      }
    }

    node = null

    static defaultProps = {
      size: [500, 500],
      debounce: 200
    }

    static displayName = `Responsive${Frame.displayName}`

    isResizing = undefined

    _onResize = (width, height) => {
      this.setState({ containerHeight: height, containerWidth: width })
    }
    componentDidMount() {
      const element = this.node

      elementResizeEvent(element, () => {
        window.clearTimeout(this.isResizing)
        this.isResizing = setTimeout(() => {
          this.isResizing = false

          this.setState({
            containerHeight: element.offsetHeight,
            containerWidth: element.offsetWidth
          })
        }, this.props.debounce)
      })
      this.setState({
        containerHeight: element.offsetHeight,
        containerWidth: element.offsetWidth
      })
    }

    render() {
      const {
        responsiveWidth,
        responsiveHeight,
        size,
        dataVersion,
        debounce,
        gridDisplay,
        ...rest
      } = this.props

      const { containerHeight, containerWidth } = this.state

      const actualSize = [...size]

      let returnEmpty = false

      if (responsiveWidth) {
        if (!containerWidth) returnEmpty = true
        actualSize[0] = containerWidth
      }

      if (responsiveHeight) {
        if (!containerHeight) returnEmpty = true
        actualSize[1] = containerHeight
      }

      const dataVersionWithSize = dataVersion + actualSize.toString() + debounce

      return (
        <div
          className="responsive-container"
          style={
            gridDisplay
              ? { minWidth: "0px", minHeight: "0px" }
              : { height: "100%", width: "100%" }
          }
          ref={node => (this.node = node)}
        >
          {!returnEmpty && (
            <Frame
              {...rest}
              size={actualSize}
              dataVersion={dataVersion ? dataVersionWithSize : undefined}
            />
          )}
        </div>
      )
    }
  }

export default createResponsiveFrame
