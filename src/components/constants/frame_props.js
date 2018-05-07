//size is a special case and handled checking the actual values in the size array

export const xyFrameDataProps = [
  "lines",
  "points",
  "areas",
  "xScaleType",
  "yScaleType",
  "xAccessor",
  "yAccessor",
  "lineDataAccessor",
  "areaDataAccessor",
  "lineType",
  "showLinePoints",
  "defined"
]

export const xyFrameChangeProps = [
  ...xyFrameDataProps,
  "name",
  "title",
  "margin",
  "axes",
  "position",
  "xExtent",
  "yExtent",
  "invertX",
  "invertY",
  "hoverAnnotation",
  "additionalDefs",
  "defined",
  "lineStyle",
  "pointStyle",
  "areaStyle",
  "lineClass",
  "pointClass",
  "areaClass",
  "canvasPoints",
  "customPointMark",
  "customLineMark",
  "lineIDAccessor"
]

export const orFrameChangeProps = [
  "data",
  "name",
  "orient",
  "title",
  "margin",
  "format",
  "position",
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
  "className",
  "additionalDefs",
  "renderKey",
  "dataAccessor",
  "rBaseline",
  "sortO",
  "dynamicColumnWidth",
  "renderFn",
  "style",
  "connectorStyle",
  "summaryStyle",
  "summaryPosition",
  "oLabel",
  "axis"
]

export const networkFrameChangeProps = [
  "name",
  "nodes",
  "edges",
  "title",
  "margin",
  "position",
  "nodeIDAccessor",
  "sourceAccessor",
  "targetAccessor",
  "nodeSizeAccessor",
  "customNodeIcon",
  "nodeLabels",
  "edgeWidthAccessor",
  "networkType",
  "className",
  "additionalDefs",
  "renderFn",
  "nodeStyle",
  "edgeStyle",
  "edgeType"
]

/*
const xyFrameOtherProps = [
  "matte",
  "tooltipContent",
  "interaction",
  "annotations",
  "svgAnnotationRules",
  "htmlAnnotationRules",
  "customHoverBehavior",
  "customClickBehavior",
  "customDoubleclickBehavior",
  "backgroundGraphics",
  "foregroundGraphics",
  "download",
  "downloadFields"
]

const orFrameOtherProps = [
  "annotations",
  "htmlAnnotationRules",
  "tooltipContent",
  "interaction",
  "customHoverBehavior",
  "customClickBehavior",
  "svgAnnotationRules",
  "hoverAnnotation",
  "backgroundGraphics",
  "foregroundGraphics"
]

const networkFrameOtherProps = [
  "annotations",
  "htmlAnnotationRules",
  "tooltipContent",
  "interaction",
  "customHoverBehavior",
  "customClickBehavior",
  "customDoubleClickBehavior",
  "svgAnnotationRules",
  "hoverAnnotation",
  "backgroundGraphics",
  "foregroundGraphics"
]
*/
