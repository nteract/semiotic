//size is a special case and handled checking the actual values in the size array

const sharedChangeProps = [
  "customClickBehavior",
  "customHoverBehavior",
  "customDoubleClickBehavior",
  "hoverAnnotation",
  "name",
  "title",
  "margin",
  "className",
  "additionalDefs",
  "renderKey"
]

export const xyFrameDataProps = [
  "lines",
  "points",
  "summaries",
  "xScaleType",
  "yScaleType",
  "xAccessor",
  "yAccessor",
  "lineDataAccessor",
  "areaDataAccessor",
  "summaryDataAccessor",
  "lineType",
  "showLinePoints",
  "showSummaryPoints",
  "defined",
  "summaryType"
]

export const xyFrameChangeProps = [
  ...sharedChangeProps,
  ...xyFrameDataProps,
  "axes",
  "xExtent",
  "yExtent",
  "invertX",
  "invertY",
  "defined",
  "lineStyle",
  "pointStyle",
  "summaryStyle",
  "lineClass",
  "pointClass",
  "areaClass",
  "summaryClass",
  "canvasPoints",
  "customPointMark",
  "customLineMark",
  "lineIDAccessor"
]

export const orFrameChangeProps = [
  ...sharedChangeProps,
  "pieceHoverAnnotation",
  "summaryHoverAnnotation",
  "data",
  "orient",
  "oScaleType",
  "rScaleType",
  "oExtent",
  "rExtent",
  "invertO",
  "invertR",
  "oAccessor",
  "rAccessor",
  "oPadding",
  "projection",
  "type",
  "summaryType",
  "connectorType",
  "dataAccessor",
  "rBaseline",
  "oSort",
  "dynamicColumnWidth",
  "style",
  "connectorStyle",
  "summaryStyle",
  "summaryPosition",
  "oLabel",
  "axes",
  "renderFn"
]

export const networkFrameChangeProps = [
  ...sharedChangeProps,
  "graph",
  "nodes",
  "edges",
  "nodeIDAccessor",
  "sourceAccessor",
  "targetAccessor",
  "nodeSizeAccessor",
  "customNodeIcon",
  "nodeLabels",
  "edgeWidthAccessor",
  "networkType",
  "renderFn",
  "nodeStyle",
  "edgeStyle",
  "edgeType",
  "filterRenderedNodes"
]
