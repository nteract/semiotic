import React from "react"
// import { rectangleEnclosure } from "../../components/annotationRules/baseRules"
import { PrismCode } from "react-prism"

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
    label: "SIZE",
    keys: {
      size: true,
      margin: true,
      NetworkFrame: true,
      OrdinalFrame: true,
      XYFrame: true,
      SparkNetworkFrame: true,
      SparkOrdinalFrame: true,
      SparkXYFrame: true,
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
    label: "CUSTOMIZE",
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
      areaRenderMode: true,
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
      <rect style={{ fill: "#c4b674" }} height={height} width={20} />
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
  state = {
    content: undefined
  }

  render() {
    const width = 1000
    const { frameSettings/*, frameType */ } = this.props
    const frameKeys = Object.keys(frameSettings).filter(
      d => this.props.frameSettings[d] !== undefined
    )
    let processPosition = 0
    const mappedFrames = processNodes.map(process =>
      frameKeys.filter(k => process.keys[k])
    )

    const shortPieces = mappedFrames.filter(d => d.length === 0).length

    const step = Math.min(
      150,
      (width - shortPieces * 30) / (processNodes.length - shortPieces)
    )

    const maxHeight = Math.max(
      100,
      60 + Math.max(...mappedFrames.map(d => d.length)) * 20
    )

    const renderedProcessNodes = processNodes.map((process, i) => {
      const activeFrameKeys = frameKeys.filter(k => process.keys[k])
      // const frameKeyHeight = Math.max(10, activeFrameKeys.length * 10)
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
          <g
            key={`rendered-key${q}`}
            transform={`translate(5,${54 + q * 24})`}
            style={{ pointerEvents: "none" }}
          >
            <rect
              onMouseEnter={() => {
                this.setState({
                  content: (
                    <div>
                      <h4 style={{ textTransform: "none" }}>
                        <span style={{ color: "gray" }}>Settings for</span> {k}
                      </h4>
                      <pre>
                        <PrismCode className="language-jsx">
                          {k === "nodes" || k === "edges"
                            ? "these data tend to be circular"
                            : typeof frameSettings[k] === "function"
                              ? `${frameSettings[k]}`
                              : JSON.stringify(
                                  frameSettings[k],
                                  (key, value) => {
                                    if (typeof value === "function") {
                                      return `${value}`
                                    }

                                    return key === "nodes" || key === "edges"
                                      ? ""
                                      : value
                                  },
                                  " "
                                )}
                        </PrismCode>
                      </pre>
                    </div>
                  )
                })
              }}
              onMouseLeave={() => {
                this.setState({ position: 0, content: undefined })
              }}
              y={-20}
              width={step - 10}
              height={24}
              style={{ fill: "rgba(0,0,0,0)", pointerEvents: "all" }}
            />
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
            <rect style={{ fill: "#c4b674" }} height={30} width={step - 10} />
            <line
              x1={0}
              x2={0}
              y1={30}
              y2={maxHeight}
              style={{ stroke: "lightgray" }}
            />
            <text
              style={{ fill: "black", textAnchor: "start", fontWeight: 600 }}
              fontSize={"16px"}
              y={22}
              x={8}
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
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: "40px", fontWeight: 100, margin: "10px 0" }}>
          {this.props.frameType}
        </div>
        {this.state.content && (
          <div
            style={{
              border: "1px solid black",
              position: "absolute",
              left: `150px`,
              background: "white",
              bottom: `${maxHeight + 20}px`,
              maxWidth: "800px",
              minWidth: "200px",
              maxHeight: "400px",
              minHeight: "200px",
              overflow: "hidden",
              padding: "10px"
            }}
          >
            {this.state.content}
          </div>
        )}
        <svg
          style={{ overflow: "visible", background: "white" }}
          width={processPosition}
          height={maxHeight + 10}
        >
          {renderedProcessNodes}
        </svg>
      </div>
    )
  }
}
