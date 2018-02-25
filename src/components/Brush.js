import React from "react"
import { select } from "d3-selection"

// components

import PropTypes from "prop-types"

const flatten = list =>
  list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), [])

function flatShortArray(array) {
  if (!Array.isArray(array)) return "not-array"
  const flat = flatten(array)
  return flat.map(d => (d && d.toFixed && d.toFixed(2)) || "empty").toString()
}

class Brush extends React.Component {
  constructor(props) {
    super(props)

    this.createBrush = this.createBrush.bind(this)
  }

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
      select(node).call(brush.move, this.props.selectedExtent)
    }
  }

  render() {
    return (
      <g
        ref={node => (this.node = node)}
        transform={`translate(${this.props.position || [0, 0]})`}
        className="xybrush"
      />
    )
  }
}

Brush.propTypes = {
  size: PropTypes.array,
  position: PropTypes.array,
  selectedExtent: PropTypes.array,
  svgBrush: PropTypes.func
}

export default Brush
