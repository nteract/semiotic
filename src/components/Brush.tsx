import * as React from "react"
import { useEffect, useRef } from "react"
import { select } from "d3-selection"

const flatten = (list) =>
  list.reduce(
    (a, b) =>
      a.concat(Array.isArray(b) ? flatten([...b].sort((a, b) => a - b)) : b),
    []
  )

function flatShortArray(baseArray = []) {
  let array = [...baseArray]
  if (!Array.isArray(array)) return "not-array"
  if (!Array.isArray(array[0])) {
    array = [...array].sort((a, b) => a - b)
  }
  const flat = flatten(array)

  const stringifiedFlattened = flat
    .map(
      (d) =>
        (d instanceof Date && d.toString()) ||
        (d !== undefined && d.toFixed && d.toFixed(2)) ||
        "empty"
    )
    .toString()
  return stringifiedFlattened
}

const createBrush = (node, props) => {
  const { svgBrush: brush, selectedExtent: baseSelectedExtent } = props
  select(node).call(brush)
  if (baseSelectedExtent) {
    let selectedExtent = baseSelectedExtent
    if (Array.isArray(baseSelectedExtent[0])) {
      const sortedY = [selectedExtent[0][1], selectedExtent[1][1]].sort(
        (a, b) => a - b
      )
      selectedExtent = [
        [selectedExtent[0][0], sortedY[0]],
        [selectedExtent[1][0], sortedY[1]]
      ]
    }

    select(node).call(brush.move, selectedExtent)
  }
}

interface BrushProps {
  extent?: number[] | number[][]
  selectedExtent?: number[] | number[][]
  svgBrush: { (): () => void; move: Function }
  position?: number[]
}

export default function Brush(props: BrushProps) {
  const { extent, selectedExtent } = props

  const node = useRef(null)
  const flatExtent = flatShortArray(extent)
  const flatSelectedExtent = flatShortArray(selectedExtent)

  useEffect(() => {
    if (node?.current) {
      createBrush(node.current, props)
    }
  }, [flatExtent, flatSelectedExtent, node])

  const { position = [0, 0] } = props
  return (
    <g transform={`translate(${position})`} ref={node} className="xybrush" />
  )
}
