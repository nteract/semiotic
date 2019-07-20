import * as React from "react"

type Props = {
  tooltipContent: Function
  tooltipContentArgs?: object
}

class TooltipPositioner extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
  }

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

    if(right>window.innerWidth){
      offset.x = window.innerWidth - right
    }
    else if(left<0){
      offset.x = - left
    }

    if(top<0){
      offset.y = - top
    }
    else if(bottom > window.innerHeight){
      offset.x = window.innerHeight - bottom
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
