import * as React from "react"

import {
  sankeyEdgeSort,
  customEdgeHashD,
  genericLineGenerator
} from "./edgeGenerators"

import { gridProps } from "./nodeGenerators"

// Re-export everything from the split modules so existing imports continue to work
export {
  circleNodeGenerator,
  sankeyNodeGenerator,
  chordNodeGenerator,
  matrixNodeGenerator,
  radialRectNodeGenerator,
  radialLabelGenerator,
  hierarchicalRectNodeGenerator
} from "./nodeGenerators"

export {
  matrixEdgeGenerator,
  arcEdgeGenerator,
  sankeyArrowGenerator,
  chordEdgeGenerator,
  dagreEdgeGenerator
} from "./edgeGenerators"

export { ribbonLink, areaLink, circularAreaLink } from "./sankeyLinks"

export { topologicalSort, softStack } from "./graphAlgorithms"

export const drawNodes = ({
  data,
  renderKeyFn,
  customMark,
  styleFn,
  classFn,
  renderMode,
  canvasDrawing,
  canvasRenderFn,

  networkSettings
}) => {
  const markGenerator = customMark
  const renderedData = []

  if (networkSettings.type === "matrix" && canvasRenderFn) {
    return
  }

  if (networkSettings) {
    let i = 0
    for (const d of data) {
      const generatedMark = markGenerator({
        d,
        i,
        renderKeyFn,
        styleFn,
        classFn,
        renderMode,
        key: renderKeyFn ? renderKeyFn(d, i) : d.id || `node-${i}`,
        className: `node ${classFn(d, i)}`,
        transform: `translate(${d.x},${d.y})`
      })

      if (canvasRenderFn && canvasRenderFn(d, i) === true) {
        const { transform = "translate(0,0)" } = generatedMark.props
        const [x, y] = transform
          .replace("translate(", "")
          .replace(")", "")
          .split(",")
        const canvasNode = {
          baseClass: "frame-piece",
          tx: x,
          ty: y,
          d,
          i,
          markProps: generatedMark.props,
          styleFn,
          renderFn: renderMode,
          classFn
        }
        canvasDrawing.push(canvasNode)
      } else {
        // Use the already generated mark
        renderedData.push(generatedMark)
      }
      i++
    }
  }
  return renderedData
}

export const drawEdges = (settings) => {
  const {
    data: baseData,
    renderKeyFn,
    customMark,
    styleFn,
    classFn,
    renderMode,
    canvasRenderFn,
    canvasDrawing,
    type,

    networkSettings,
    projection,
    numberOfNodes,
    size
  } = settings

  const {
    type: networkType,
    direction,
    edgeSort = sankeyEdgeSort
  } = networkSettings
  const data =
    networkType === "sankey"
      ? baseData.sort((a, b) => edgeSort(a, b, direction))
      : baseData

  let dGenerator = genericLineGenerator
  const renderedData = []
  if (canvasRenderFn && networkSettings.type === "matrix") {
    let i = 0
    const gridSize = Math.floor(Math.min(...size) / numberOfNodes)
    for (const d of data) {
      const canvasEdge = {
        baseClass: "frame-piece",
        tx: d.source.y,
        ty: d.target.y,
        d,
        i,
        markProps: { markType: "rect", ...gridProps(gridSize) },
        styleFn,
        renderFn: renderMode,
        classFn
      }
      canvasDrawing.push(canvasEdge)
      i++
    }
  } else if (customMark) {
    // CUSTOM MARK IMPLEMENTATION
    if (type) {
      if (typeof type === "function") {
        dGenerator = type
      } else if (customEdgeHashD[type]) {
        dGenerator = (d) => customEdgeHashD[type](d, projection)
      }
    }
    let i = 0
    for (const d of data) {
      const renderedCustomMark = customMark({
        d,
        i,
        renderKeyFn,
        styleFn,
        classFn,
        renderMode,
        key: renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`,
        className: `${classFn(d, i)} edge`,
        transform: `translate(${d.x},${d.y})`,

        generatedPath: dGenerator(d)
      })
      if (
        renderedCustomMark &&
        renderedCustomMark.props &&
        (renderedCustomMark.props.markType !== "path" ||
          renderedCustomMark.props.d)
      ) {
        renderedData.push(renderedCustomMark)
      }
      i++
    }
  } else {
    if (type) {
      if (typeof type === "function") {
        dGenerator = type
      } else if (customEdgeHashD[type]) {
        dGenerator = (d) => customEdgeHashD[type](d, projection)
      }
    }
    let i = 0
    for (const d of data) {
      const renderedD = dGenerator(d)

      if (renderedD && canvasRenderFn && canvasRenderFn(d, i) === true) {
        const canvasEdge = {
          baseClass: "frame-piece",
          tx: d.x,
          ty: d.y,
          d,
          i,
          markProps: { markType: "path", d: renderedD },
          styleFn,
          renderFn: renderMode,
          classFn
        }
        canvasDrawing.push(canvasEdge)
      } else if (renderedD) {
        renderedData.push(
          <path key={renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`}

            className={`${classFn(d)} edge`}
            d={renderedD}
            style={styleFn(d, i)}
            tabIndex={-1}
            role="img"
            aria-label={`connection from ${d.source.id} to ${d.target.id}`}
          />
        )
      }
    }
  }

  return renderedData
}
