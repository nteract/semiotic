import * as React from "react"

type Props = {
  tooltipContent: Function
  tooltipContentArgs?: object
}

class TooltipPositioner extends React.Component<Props> {
  private containerRef = React.createRef<HTMLDivElement>()

  state = {
    offset: null
  }

  // simple heuristics to check if the tooltip container exceeds the viewport
  // if so, capture the suggested offset
  checkPosition = () => {
    let offset = {
      x: 0,
      y: 0
    }
    const { right, left, top, bottom } = this.containerRef.current.getBoundingClientRect()
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
      offset
    })
  }

  componentDidMount(){
    if(this.containerRef.current && !this.state.offset){
      this.checkPosition()
    }
  }

  componentDidUpdate(pp){
    // if new args, reset offset state
    const { tooltipContentArgs} = this.props
    const { offset } = this.state
    if(pp.tooltipContentArgs !== tooltipContentArgs){
      this.setState({
        offset: null
      })
    }
    else if(this.containerRef.current && !offset){
      this.checkPosition()
    }
  }

  render() {
    const {
      tooltipContent,
      tooltipContentArgs
    } = this.props

    const {
      offset
    } = this.state

    const containerStyle = offset?
      {
        transform: `translate(${offset.x}px,${offset.y}px)`
      } :
      {
        opacity: 0
      }

    return (
      <div ref={this.containerRef} style={containerStyle}>
        {tooltipContent({...tooltipContentArgs,
          tooltipContainerOffset: offset? offset: {x:0, y:0}})}
      </div>
    )
  }
}


export default TooltipPositioner
