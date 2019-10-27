import * as React from "react"

type Props = {
  tooltipContent: Function
  tooltipContentArgs?: object
}

class TooltipPositioner extends React.Component<Props> {
  private containerRef = React.createRef<HTMLDivElement>()

  state = {
    offset: null,
    tooltipDimensions: null
  }

  // simple heuristics to check if the tooltip container exceeds the viewport
  // if so, capture the suggested offset
  checkPosition = () => {
    let offset = {
      x: 0,
      y: 0
    }
    const tooltipContainerInitialDimensions = this.containerRef.current.getBoundingClientRect()
    const { right, left, top, bottom } = tooltipContainerInitialDimensions
    const containerWidth = right - left
    const containerHeight = bottom - top

    if(right > window.innerWidth){
      offset.x = - containerWidth
    }
    else if(left < 0){
      offset.x = containerWidth
    }
    if(bottom > window.innerHeight){
      offset.y = - containerHeight
    }
    else if(top < 0){
      offset.y = containerHeight
    }

    this.setState({
      offset,
      tooltipContainerInitialDimensions
    })
  }

  componentDidMount(){
    if(this.containerRef.current && !this.state.offset){
      this.checkPosition()
    }
  }

  componentDidUpdate(pp){
    // if new args, reset offset state
    if(pp.tooltipContentArgs !== this.props.tooltipContentArgs){
      this.setState({
        offset: null
      })
    }
    else if(this.containerRef.current && !this.state.offset){
      this.checkPosition()
    }
  }

  render() {
    const {
      tooltipContent,
      tooltipContentArgs
    } = this.props

    const {
      offset,
      tooltipContainerInitialDimensions
    } = this.state

    const containerStyle = offset?
      {
        transform: `translate(${offset.x}px,${offset.y}px)`
      } :
      {
        opacity: 0
      }

    const tooltipContainerAttributes = {
      offset,
      tooltipContainerInitialDimensions
    }

    return (
      <div ref={this.containerRef} style={containerStyle}>
        {tooltipContent({...tooltipContentArgs,
          tooltipContainerAttributes})}
      </div>
    )
  }
}


export default TooltipPositioner
