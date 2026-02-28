import * as React from "react"
import { useEffect, useRef } from "react"
import { select } from "d3-selection"

import {
  d as glyphD /*, project as glyphProject, mutate as glyphMutate*/
} from "d3-glyphedge"

import { pathArrows } from "d3-path-arrows"

import {
  curveMonotoneX,
  curveMonotoneY,
  curveBasis,
  line,
  linkHorizontal,
  linkVertical
} from "d3-shape"
import { linearRibbon } from "./SvgHelper"
import { interpolateNumber } from "d3-interpolate"

import { gridProps } from "./nodeGenerators"

const curvature = 0.5

const horizontalDagreLineGenerator = line()
  .curve(curveMonotoneX)
  .x((d) => d.x)
  .y((d) => d.y)

const verticalDagreLineGenerator = line()
  .curve(curveMonotoneY)
  .x((d) => d.x)
  .y((d) => d.y)

export function sankeyEdgeSort(a, b, direction) {
  if (a.circular && !b.circular) return -1
  if (b.circular && !a.circular) return 1
  const first = direction === "down" ? "y" : "x"
  const second = direction === "down" ? "x" : "y"

  return a.source[first] === b.source[first]
    ? a.sankeyWidth === b.sankeyWidth
      ? a.source[second] - b.source[second]
      : b.sankeyWidth - a.sankeyWidth
    : a.source[first] - b.source[first]
}

export const sigmoidLinks = {
  horizontal: linkHorizontal()
    .x((d) => d.x)
    .y((d) => d.y),
  vertical: linkVertical()
    .x((d) => d.x)
    .y((d) => d.y),
  radial: glyphD.lineArc
}

export const customEdgeHashD = {
  curve: (d, projection = "vertical") => sigmoidLinks[projection](d),
  linearc: (d) => glyphD.lineArc(d),
  ribbon: (d) => glyphD.ribbon(d, d.width),
  arrowhead: (d) =>
    glyphD.arrowHead(d, d.target.nodeSize, d.width, d.width * 1.5),
  halfarrow: (d) =>
    glyphD.halfArrow(d, d.target.nodeSize, d.width, d.width * 1.5),
  nail: (d) => glyphD.nail(d, d.source.nodeSize),
  comet: (d) => glyphD.comet(d, d.target.nodeSize),
  taffy: (d) =>
    glyphD.taffy(
      d,
      d.source.nodeSize / 2,
      d.target.nodeSize / 2,
      (d.source.nodeSize + d.target.nodeSize) / 4
    )
}

export const genericLineGenerator = (d) =>
  `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`

export const matrixEdgeGenerator =
  (size, nodes) =>
  ({ d, i, styleFn, renderMode, key, className }) => {
    const gridSize = Math.min(...size) / nodes.length
    const style = styleFn(d, i)
    return (
      <g key={key}>
        <rect
          key={key}
          className={className}
          transform={`translate(${d.source.y},${d.target.y})`}
          {...style}
          style={style}
          aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
          tabIndex={-1}
          {...gridProps(gridSize)}
        />
      </g>
    )
  }

export const arcEdgeGenerator = (size) => {
  const yAdjust = size[1] / size[0]
  function arcDiagramArc(d) {
    const draw = line().curve(curveBasis)
    const midX = (d.source.x + d.target.x) / 2
    const midY = d.source.x - d.target.x
    return draw([
      [d.source.x, 0],
      [midX, midY * yAdjust],
      [d.target.x, 0]
    ])
  }

  return ({ d, i, styleFn, renderMode, key, className }) => {
    const style = styleFn(d, i)
    return (
      <path
        key={key}
        className={className}
        transform={`translate(0,${size[1] / 2})`}
        d={arcDiagramArc(d)}
        {...style}
        style={style}
        aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
        tabIndex={-1}
      />
    )
  }
}

const ArrowedPath = (props) => {
  const { d, width, edgeLength, circular } = props
  const pathRef = useRef(null)

  useEffect(() => {
    if (pathRef?.current) {
      const circularMod = circular ? width : edgeLength
      const arrowHeadSize = Math.max(Math.min(width, circularMod) / 5, 2)
      let arrows = pathArrows()
        .arrowLength(arrowHeadSize * 2.5)
        .gapLength(100)
        .arrowHeadSize(arrowHeadSize)
        .path(d)

      select(pathRef.current).selectAll("*").remove()

      select(pathRef.current).call(arrows)

      select(pathRef.current)
        .selectAll(":not(.arrow-head)")
        .style("fill", "none")
        .style("stroke-width", arrowHeadSize / 4)
        .style("stroke", "white")

      select(pathRef.current).selectAll(".arrow-head").style("fill", "white")
    }
  }, [d])

  return <g ref={pathRef} />
}

export const sankeyArrowGenerator = (props) => {
  const {
    d,
    i,
    styleFn,
    renderMode,
    key,
    className,

    generatedPath
  } = props

  const { showArrows } = d

  let arrowPath = ""
  if (d.circular) {
    const { circularPathData } = d
    const {
      sourceX,
      sourceY,
      leftFullExtent,
      rightFullExtent,
      verticalFullExtent,
      targetX,
      targetY
    } = circularPathData

    arrowPath = `M${sourceX},${sourceY}L${leftFullExtent},${sourceY}L${leftFullExtent},${verticalFullExtent}L${rightFullExtent},${verticalFullExtent}L${rightFullExtent},${targetY}L${targetX},${targetY}`
  } else {
    let x0 = d.source.x1,
      x1 = d.target.x0,
      xi = interpolateNumber(x0, x1),
      x2 = xi(curvature),
      x3 = xi(1 - curvature),
      y0 = d.y0,
      y1 = d.y1

    arrowPath = `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`
  }

  return (
    <>
      <path key={key}
        className={className}

        d={generatedPath}
        style={styleFn(d, i)}
        aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
        tabIndex={-1}
      />
      {showArrows && (
        <ArrowedPath
          d={arrowPath}
          width={d.sankeyWidth}
          edgeLength={Math.abs(d.target.x - d.source.x)}
          circular={d.circular}
        />
      )}
    </>
  )
}

export const chordEdgeGenerator =
  (size) =>
  ({ d, i, styleFn, renderMode, key, className }) =>
    (
      <path key={key}
        className={className}
        transform={`translate(${size[0] / 2},${size[1] / 2})`}

        d={d.d}
        style={styleFn(d, i)}
        aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
        tabIndex={-1}
      />
    )

export const dagreEdgeGenerator = (direction) => {
  const dagreLineGenerator =
    direction === "LR" || direction === "RL"
      ? horizontalDagreLineGenerator
      : verticalDagreLineGenerator
  return ({ d, i, styleFn, renderMode, key, className }) => {
    if (d.ribbon || d.parallelEdges) {
      const ribbonGenerator = linearRibbon()

      ribbonGenerator.x((p) => p.x)
      ribbonGenerator.y((p) => p.y)
      ribbonGenerator.r(() => d.weight || 1)

      if (d.parallelEdges) {
        const sortedParallelEdges = d.parallelEdges.sort(
          (a, b) => b.weight - a.weight
        )
        return (
          <g key={`${key}`}>
            {ribbonGenerator({
              points: d.points,
              multiple: d.parallelEdges
            }).map((ribbonD, ribbonI) => (
              <path key={`${key}-${ribbonI}`}
                className={className}

                d={ribbonD}
                style={styleFn(sortedParallelEdges[ribbonI], i)}
                aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
                tabIndex={-1}
              />
            ))}
          </g>
        )
      }

      return (
        <path key={key}
          className={className}

          d={ribbonGenerator(d.points)}
          style={styleFn(d, i)}
          aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
          tabIndex={-1}
        />
      )
    }

    return (
      <path key={key}
        className={className}

        d={dagreLineGenerator(d.points)}
        style={styleFn(d, i)}
        aria-label={`Connection from ${d.source.id} to ${d.target.id}`}
        tabIndex={-1}
      />
    )
  }
}
