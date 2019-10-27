import * as React from "react"

type Props = {
  tooltipContent: Function
  tooltipContentArgs?: object
}

type State = {
  offset: object,
  tooltipContainerInitialDimensions: object,
  tooltipContentArgsCurrent: object
}

class TooltipPositioner extends React.Component<Props, State> {
  private containerRef = React.createRef<HTMLDivElement>()

  state = {
    offset: null,
    tooltipContainerInitialDimensions: null,
    tooltipContentArgsCurrent: null
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
      tooltipContainerInitialDimensions,
      tooltipContentArgsCurrent: this.props.tooltipContentArgs
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
        offset: null,
        tooltipContainerInitialDimensions: null
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
      tooltipContainerInitialDimensions,
      tooltipContentArgsCurrent
    } = this.state

    const containerStyle = offset && (tooltipContentArgsCurrent===tooltipContentArgs)?
      {
        transform: `translate(${offset.x}px,${offset.y}px)`
      } :
      {
        opacity: 0
      }

    const tooltipContainerAttributes = {
      offset: offset || {x:0, y:0},
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
