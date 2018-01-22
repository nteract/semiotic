import React from "react"

const actualTypeof = thing => {
  if (Array.isArray(thing)) return "array"
  if (React.isValidElement(thing)) return "jsx"
  return typeof thing
}

const typeColors = {
  function: "#9D5EC4",
  string: "#C4A75E",
  boolean: "#C45E5E",
  object: "#5EBDC4",
  number: "#5E67C4",
  array: "#A0C45E",
  jsx: "#295770"
}

const typeSymbols = {
  function: "ƒ",
  string: "S",
  boolean: "!",
  object: "{ }",
  number: "#",
  array: "[ ]",
  jsx: "</>"
}

const processNodes = [
  {
    label: "PRE",
    keys: { customPreprocess: true }
  },
  {
    label: "DATA",
    keys: {
      data: true,
      points: true,
      lines: true,
      areas: true,
      nodes: true,
      edges: true
    }
  },
  {
    label: "FRAME",
    keys: {
      size: true,
      margin: true,
      NetworkFrame: true,
      OrdinalFrame: true,
      XYFrame: true,
      ResponsiveNetworkFrame: true,
      ResponsiveOrdinalFrame: true,
      ResponsiveXYFrame: true,
      MinimapXYFrame: true
    }
  },
  {
    label: "LAYOUT",
    keys: {
      defined: true,
      lineType: true,
      type: true,
      connectorType: true,
      summaryType: true,
      areaType: true,
      networkType: true,
      projection: true,
      oPadding: true,
      dynamicColumnWidth: true,
      pixelColumnWidth: true,
      zoomToFit: true
    }
  },
  {
    label: "PROCESS",
    keys: {
      dataVersion: true,
      xScaleType: true,
      yScaleType: true,
      oScaleType: true,
      rScaleType: true,
      yExtent: true,
      xExtent: true,
      rExtent: true,
      invertX: true,
      invertY: true,
      invertO: true,
      invertR: true,
      xAccessor: true,
      yAccessor: true,
      rAccessor: true,
      oAccessor: true,
      lineDataAccessor: true,
      areaDataAccessor: true,
      nodeIDAccessor: true,
      sourceAccessor: true,
      targetAccessor: true
    }
  },
  {
    label: "ASSIGN",
    keys: {
      style: true,
      connectorStyle: true,
      summaryStyle: true,
      pointStyle: true,
      lineStyle: true,
      areaStyle: true,
      nodeStyle: true,
      edgeStyle: true,
      pieceClass: true,
      summaryClass: true,
      pointClass: true,
      lineClass: true,
      areaClass: true,
      nodeClass: true,
      edgeClass: true,
      additionalDefs: true,
      baseMarkProps: true,
      renderKey: true,
      renderFn: true,
      className: true,
      pointRenderMode: true,
      lineRenderMode: true,
      areaRenderMode: true
    }
  },
  {
    label: "DRAW",
    keys: {
      canvasPoints: true,
      canvasLines: true,
      canvasAreas: true,
      canvasPieces: true,
      canvasSummary: true,
      canvasNodes: true,
      canvasEdges: true,
      canvasPostProcess: true,
      customPointMark: true,
      customLineMark: true,
      showLinePoints: true,
      nodeSizeAccessor: true,
      edgeWidthAccessor: true,
      customNodeIcon: true,
      edgeType: true
    }
  },
  {
    label: "DECORATE",
    keys: {
      title: true,
      foregroundGraphics: true,
      backgroundGraphics: true,
      axes: true,
      axis: true,
      matte: true,
      minimap: true
    }
  },
  {
    label: "INTERACT",
    keys: {
      customHoverBehavior: true,
      customClickBehavior: true,
      customDoubleclickBehavior: true,
      hoverAnnotation: true,
      pieceHoverAnnotation: true,
      summaryHoverAnnotation: true,
      interaction: true
    }
  },
  {
    label: "ANNOTATE",
    keys: {
      annotations: true,
      annotationSettings: true,
      lineIDAccessor: true,
      svgAnnotationRules: true,
      htmlAnnotationRules: true,
      tooltipContent: true,
      oLabel: true,
      nodeLabels: true
    }
  }
]

function closedProcessPiece(position, label, height) {
  return (
    <g key={`closed-${label}`} transform={`translate(${position},0)`}>
      <rect style={{ fill: "#ac9739" }} height={height} width={20} />
      <rect style={{ fill: "black" }} height={height} width={4} x={20} />
      <text
        transform="rotate(-90)"
        style={{ fill: "black", textAnchor: "end" }}
        y={14}
        x={-15}
      >
        {label}
      </text>
    </g>
  )
}
export default class ProcessViz extends React.Component {
  render() {
    const width = 1000
    const { frameSettings, frameType } = this.props
    const frameKeys = Object.keys(frameSettings).filter(
      d => this.props.frameSettings[d] !== undefined
    )
    frameKeys.unshift(frameType)
    let processPosition = 0
    const mappedFrames = processNodes.map((process, i) =>
      frameKeys.filter(k => process.keys[k])
    )
    console.log("framekeys", frameKeys)
    console.log("mappedFrames", mappedFrames)

    const shortPieces = mappedFrames.filter(d => d.length === 0).length

    const step =
      (width - shortPieces * 30) / (processNodes.length - shortPieces)

    const maxHeight = Math.max(
      100,
      60 + Math.max(...mappedFrames.map(d => d.length)) * 20
    )

    const renderedProcessNodes = processNodes.map((process, i) => {
      const activeFrameKeys = frameKeys.filter(k => process.keys[k])
      const frameKeyHeight = Math.max(10, activeFrameKeys.length * 10)
      const renderedFrameKeys = mappedFrames[i]
      let renderedPiece
      if (renderedFrameKeys.length === 0) {
        renderedPiece = closedProcessPiece(
          processPosition,
          process.label,
          maxHeight
        )
        processPosition += 30
      } else {
        const renderedFrameKeys = activeFrameKeys.map((k, q) => (
          <g key={"rendered-key" + q} transform={`translate(5,${40 + q * 22})`}>
            <circle
              cx={10}
              r={10}
              cy={-8}
              fill={typeColors[actualTypeof(frameSettings[k])]}
            />
            <text
              x={10}
              y={-4}
              style={{ fontSize: "12px", fill: "white", textAnchor: "middle" }}
            >
              {typeSymbols[actualTypeof(frameSettings[k])]}
            </text>

            <text
              fill={typeColors[actualTypeof(frameSettings[k])]}
              x={22}
              y={-5}
              style={{ fontSize: "8px" }}
            >
              {k}
            </text>
          </g>
        ))
        renderedPiece = (
          <g
            key={`process-${process.label}`}
            transform={`translate(${processPosition},0)`}
          >
            <rect style={{ fill: "#ac9739" }} height={20} width={step - 10} />
            <line
              x1={0}
              x2={0}
              y1={20}
              y2={maxHeight}
              style={{ stroke: "lightgray" }}
            />
            <text
              style={{ fill: "black", textAnchor: "start", fontWeight: 600 }}
              fontSize={"16px"}
              y={16}
              x={4}
            >
              {process.label}
            </text>
            <rect
              style={{ fill: "black" }}
              height={4}
              width={step - 10}
              x={0}
              y={maxHeight - 4}
            />
            {renderedFrameKeys}
          </g>
        )
        processPosition += step
      }
      return renderedPiece
    })
    return (
      <div>
        <svg
          style={{ overflow: "visible", background: "white" }}
          width={width}
          height={maxHeight + 10}
        >
          {renderedProcessNodes}
        </svg>
      </div>
    )
  }
}
