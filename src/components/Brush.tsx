import * as React from "react"
import { select } from "d3-selection"

const flatten = list =>
  list.reduce(
    (a, b) => a.concat(Array.isArray(b) ? flatten(b.sort((a, b) => a - b)) : b),
    []
  )

function flatShortArray(array) {
  if (!Array.isArray(array)) return "not-array"
  if (!Array.isArray(array[0])) {
    array = array.sort((a, b) => a - b)
  }
  const flat = flatten(array)

  const stringifiedFlattened = flat
    .map(
      d =>
        (d instanceof Date && d.toString()) ||
        (d && d.toFixed && d.toFixed(2)) ||
        "empty"
    )
    .toString()
  return stringifiedFlattened
}

interface BrushProps {
  extent?: number[] | number[][]
  selectedExtent?: number[] | number[][]
  svgBrush: { (): any; move: Function }
}

class Brush extends React.Component<BrushProps, null> {
  constructor(props) {
    super(props)

    this.createBrush = this.createBrush.bind(this)
  }

  node: Element = null

  componentDidMount() {
    this.createBrush()
  }
  componentDidUpdate(lastProps) {
    if (
      (lastProps.extent &&
        this.props.extent &&
        flatShortArray(lastProps.extent) !==
          flatShortArray(this.props.extent)) ||
      ((lastProps.selectedExtent &&
        this.props.selectedExtent &&
        flatShortArray(lastProps.selectedExtent) !==
          flatShortArray(this.props.selectedExtent)) ||
        (!lastProps.selectedExtent && this.props.selectedExtent) ||
        (lastProps.selectedExtent && !this.props.selectedExtent))
    ) {
      this.createBrush()
    }
  }

  createBrush() {
    const node = this.node
    const brush = this.props.svgBrush
    select(node).call(brush)
    if (this.props.selectedExtent) {
      let selectedExtent = this.props.selectedExtent
      if (Array.isArray(this.props.selectedExtent[0])) {
        const sortedY = [selectedExtent[0][1], selectedExtent[1][1]].sort(
          (a, b) => a - b
        )
        selectedExtent = [
          [selectedExtent[0][0], sortedY[0]],
          [selectedExtent[1][0], sortedY[1]]
        ]
      }

      select(node).call(brush.move, this.props.selectedExtent)
    }
  }

  render() {
    return <g ref={node => (this.node = node)} className="xybrush" />
  }
}

export default Brush
