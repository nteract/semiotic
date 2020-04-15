import * as React from "react"

type Props = {
  tooltipContent: Function
  tooltipContentArgs?: object
}

type State = {
  collision: object,
  tooltipContainerInitialDimensions: object,
  tooltipContentArgsCurrent: object
}

class TooltipPositioner extends React.Component<Props, State> {
  private containerRef = React.createRef<HTMLDivElement>()

  state = {
    collision:null,
    tooltipContainerInitialDimensions: null,
    tooltipContentArgsCurrent: null
  }

  // simple heuristics to check if the tooltip container exceeds the viewport
  // if so, capture the suggested offset
  checkPosition = () => {

    const tooltipContainerInitialDimensions = this.containerRef.current.getBoundingClientRect()

    const { right, left, top, bottom, width, height, x, y } = tooltipContainerInitialDimensions

    // flags to indicate whether the data point + tooltip dimension collides with the viewport
    // on each of the 4 directions/sides
    let collision = {
      left: false,
      right: false,
      top: false,
      bottom: false
    }

    if( (x + width) > window.innerWidth){
      collision.right = true
    }
    if( (x - width) < 0){
      collision.left = true
    }
    if( (y + height) > window.innerHeight){
      collision.bottom = true
    }
    if( (y - height) < 0){
      collision.top = true
    }

    this.setState({
      collision,
      tooltipContainerInitialDimensions,
      tooltipContentArgsCurrent: this.props.tooltipContentArgs
    })
  }

  componentDidMount(){
    if(this.containerRef.current && !this.state.collision){
      this.checkPosition()
    }
  }

  componentDidUpdate(pp){
    // if new args, reset collision state
    if(pp.tooltipContentArgs !== this.props.tooltipContentArgs){
      this.setState({
        collision: null,
        tooltipContainerInitialDimensions: null
      })
    }
    else if(this.containerRef.current && !this.state.collision){
      this.checkPosition()
    }
  }

  render() {
    const {
      tooltipContent,
      tooltipContentArgs
    } = this.props

    const {
      collision,
      tooltipContainerInitialDimensions,
      tooltipContentArgsCurrent
    } = this.state

    const containerStyle = {

      //to handle issue when the tooltip content has margins set by client,
      // which results in the tooltip container having smaller height,
      // which in turn causes the css transform to be inaccurate
      // (ref: https://www.w3.org/TR/css-box-3/#collapsing-margins)
      overflow: 'hidden',

      opacity: collision && (tooltipContentArgsCurrent===tooltipContentArgs)? 1 : 0
    }

    const tooltipContainerAttributes = {
      tooltipContainerInitialDimensions,
    }

    const tooltipContainerClasses = collision ?
    [
      'tooltip-container',
      'tooltip-collision-evaluated',
      collision && collision.top && 'collision-top',
      collision && collision.bottom && 'collision-bottom',
      collision && collision.right && 'collision-right',
      collision && collision.left && 'collision-left',
    ].filter(el => el).join(' ')
    : ['tooltip-container']

    return (
      <div ref={this.containerRef} style={containerStyle} className={tooltipContainerClasses}>
        {tooltipContent({...tooltipContentArgs,
          tooltipContainerAttributes})}
      </div>
    )
  }
}


export default TooltipPositioner
