"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
//size is a special case and handled checking the actual values in the size array

var xyFrameChangeProps = exports.xyFrameChangeProps = ["name", "lines", "points", "areas", "title", "margin", "axes", "position", "xScaleType", "yScaleType", "xExtent", "yExtent", "invertX", "invertY", "xAccessor", "yAccessor", "hoverAnnotation", "lineDataAccessor", "areaDataAccessor", "additionalDefs", "lineType", "showLinePoints", "defined", "lineStyle", "pointStyle", "areaStyle", "lineClass", "pointClass", "areaClass", "canvasPoints", "customPointMark", "customLineMark", "lineIDAccessor"];

var xyFrameOtherProps = ["matte", "tooltipContent", "interaction", "annotations", "svgAnnotationRules", "htmlAnnotationRules", "customHoverBehavior", "customClickBehavior", "customDoubleclickBehavior", "backgroundGraphics", "foregroundGraphics", "download", "downloadFields"];

var orFrameChangeProps = exports.orFrameChangeProps = ["data", "name", "orient", "title", "margin", "format", "position", "oScaleType", "rScaleType", "oExtent", "rExtent", "invertO", "invertR", "oAccessor", "rAccessor", "oPadding", "projection", "type", "summaryType", "connectorType", "className", "additionalDefs", "renderKey", "dataAccessor", "rBaseline", "sortO", "dynamicColumnWidth", "renderFn", "style", "connectorStyle", "summaryStyle", "summaryPosition", "oLabel", "axis"];

var orFrameOtherProps = ["annotations", "htmlAnnotationRules", "tooltipContent", "interaction", "customHoverBehavior", "customClickBehavior", "svgAnnotationRules", "hoverAnnotation", "backgroundGraphics", "foregroundGraphics"];

var networkFrameChangeProps = exports.networkFrameChangeProps = ["name", "nodes", "edges", "title", "margin", "position", "nodeIDAccessor", "sourceAccessor", "targetAccessor", "nodeSizeAccessor", "customNodeIcon", "nodeLabels", "edgeWidthAccessor", "networkType", "className", "additionalDefs", "renderFn", "nodeStyle", "edgeStyle", "edgeType"];

var networkFrameOtherProps = ["annotations", "htmlAnnotationRules", "tooltipContent", "interaction", "customHoverBehavior", "customClickBehavior", "customDoubleClickBehavior", "svgAnnotationRules", "hoverAnnotation", "backgroundGraphics", "foregroundGraphics"];