//size is a special case and handled checking the actual values in the size array
import PropTypes from "prop-types"

export const xyFrameDataProps = [
  "lines",
  "points",
  "areas",
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
  "graph",
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
  "customDoubleClickBehavior",
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

const sharedframeproptypes = {
  useSpans: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  margin: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  name: PropTypes.string,
  dataVersion: PropTypes.string,
  frameKey: PropTypes.string,
  size: PropTypes.array,
  position: PropTypes.array,
  canvasPostProcess: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  additionalDefs: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  className: PropTypes.string,
  customHoverBehavior: PropTypes.func,
  customClickBehavior: PropTypes.func,
  customDoubleClickBehavior: PropTypes.func,
  hoverAnnotation: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
    PropTypes.func,
    PropTypes.bool,
    PropTypes.string
  ]),
  disableContext: PropTypes.bool,
  interaction: PropTypes.object,
  svgAnnotationRules: PropTypes.func,
  htmlAnnotationRules: PropTypes.func,
  tooltipContent: PropTypes.func,
  annotations: PropTypes.array,
  interaction: PropTypes.object,
  baseMarkProps: PropTypes.object,
  backgroundGraphics: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  foregroundGraphics: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  beforeElements: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  afterElements: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  download: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]), //add a download button for graphs data as csv
  downloadFields: PropTypes.array, //additional fields aside from x,y to add to the csv
  annotationSettings: PropTypes.object,
  renderKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  renderOrder: PropTypes.array,
  legend: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
  onUnmount: PropTypes.func
}

export const xyframeproptypes = {
  ...sharedframeproptypes,
  lines: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  points: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  areas: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  summaries: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  axes: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  matte: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  xScaleType: PropTypes.func,
  yScaleType: PropTypes.func,
  xExtent: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  yExtent: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  invertX: PropTypes.bool,
  invertY: PropTypes.bool,
  xAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  yAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  lineDataAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  areaDataAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  summaryDataAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  lineType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  areaType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  summaryType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  lineRenderMode: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.func
  ]),
  pointRenderMode: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.func
  ]),
  areaRenderMode: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.func
  ]),
  summaryRenderMode: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.func
  ]),
  showLinePoints: PropTypes.bool,
  showSummaryPoints: PropTypes.bool,
  defined: PropTypes.func,
  lineStyle: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  pointStyle: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  areaStyle: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  summaryStyle: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  lineClass: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  pointClass: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  areaClass: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  summaryClass: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  canvasPoints: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  canvasLines: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  canvasAreas: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  canvasSummaries: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  customPointMark: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  customLineMark: PropTypes.func,
  customAreaMark: PropTypes.func,
  customSummaryMark: PropTypes.func,
  lineIDAccessor: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  minimap: PropTypes.object,
  useAreasAsInteractionLayer: PropTypes.bool,
  useSummariesAsInteractionLayer: PropTypes.bool
}

export const ordinalframeproptypes = {
  ...sharedframeproptypes,
  data: PropTypes.array,
  oScaleType: PropTypes.func,
  rScaleType: PropTypes.func,
  oExtent: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  rExtent: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  invertO: PropTypes.bool,
  invertR: PropTypes.bool,
  oAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  rAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  oPadding: PropTypes.number,
  projection: PropTypes.oneOf(["vertical", "horizontal", "radial"]),
  type: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.func
  ]),
  summaryType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  connectorType: PropTypes.func,
  tooltipContent: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  baseMarkProps: PropTypes.object,
  dataAccessor: PropTypes.func,
  rBaseline: PropTypes.number,
  sortO: PropTypes.func,
  pixelColumnWidth: PropTypes.number,
  dynamicColumnWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  renderMode: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.object
  ]),
  summaryRenderMode: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.object
  ]),
  connectorRenderMode: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.object
  ]),
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  connectorStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  summaryStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  canvasPieces: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  canvasConnectors: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  canvasSummaries: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  summaryPosition: PropTypes.func,
  oLabel: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
    PropTypes.object
  ]),
  pieceIDAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  pieceHoverAnnotation: sharedframeproptypes.hoverAnnotation,
  summaryHoverAnnotation: sharedframeproptypes.hoverAnnotation,
  axis: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  ordinalAlign: PropTypes.string,
  multiAxis: PropTypes.bool
}

export const networkframeproptypes = {
  ...sharedframeproptypes,
  nodes: PropTypes.array,
  edges: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  graph: PropTypes.object,
  nodeIDAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  sourceAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  targetAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  nodeSizeAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.func
  ]),
  customNodeIcon: PropTypes.func,
  customEdgeIcon: PropTypes.func,
  nodeRenderKey: PropTypes.func,
  edgeRenderKey: PropTypes.func,
  edgeRenderMode: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  nodeRenderMode: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  canvasEdges: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  canvasNodes: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  nodeLabels: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  edgeWidthAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  networkType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  renderFn: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  nodeStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  edgeStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  customNodeIcon: PropTypes.func,
  zoomToFit: PropTypes.bool,
  edgeType: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  filterRenderedNodes: PropTypes.func
}

export const responsiveprops = {
  responsiveWidth: PropTypes.bool,
  responsiveHeight: PropTypes.bool,
  debounce: PropTypes.number
}
