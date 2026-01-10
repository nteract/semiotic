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

// Legacy export for backward compatibility
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

// NEW: Props that affect data projection - trigger calculateDataExtent
export const xyFrameDataAffectingProps = [
  // Core data props
  "lines",
  "points",
  "summaries",

  // Data accessors
  "xAccessor",
  "yAccessor",
  "lineDataAccessor",
  "areaDataAccessor",
  "summaryDataAccessor",
  "lineIDAccessor",

  // Data transformation
  "lineType",
  "summaryType",
  "showLinePoints",
  "showSummaryPoints",
  "defined",

  // Extent overrides (affect extent calculation)
  "xExtent",
  "yExtent",

  // Scale types (affect data domain)
  "xScaleType",
  "yScaleType",
  "invertX",
  "invertY",

  // Filters (affect which data is processed)
  "filterRenderedLines",
  "filterRenderedPoints",
  "filterRenderedSummaries"
]

// NEW: Props that affect scales/layout - trigger scale recalc but not data projection
export const xyFrameScaleAffectingProps = [
  // Size and layout
  "size",
  "margin",
  "title",

  // Axes (affect margin calculation)
  "axes",

  // All data-affecting props also affect scales
  ...xyFrameDataAffectingProps
]

// NEW: Props that only affect styling/rendering - no data or scale recalc
export const xyFrameStylingProps = [
  // Styling
  "lineStyle",
  "pointStyle",
  "summaryStyle",

  // Classes
  "lineClass",
  "pointClass",
  "areaClass",
  "summaryClass",
  "className",

  // Custom marks
  "customPointMark",
  "customLineMark",
  "customSummaryMark",

  // Render modes
  "lineRenderMode",
  "pointRenderMode",
  "summaryRenderMode",
  "canvasLines",
  "canvasPoints",
  "canvasSummaries",

  // Interaction (no data recalc needed)
  "customClickBehavior",
  "customHoverBehavior",
  "customDoubleClickBehavior",
  "hoverAnnotation",

  // Other rendering
  "additionalDefs",
  "renderKey",
  "name"
]

// Legacy export - now includes all prop categories
export const xyFrameChangeProps = [
  ...xyFrameDataAffectingProps,
  ...xyFrameStylingProps,
  "axes",  // Duplicated but needed for backward compatibility
  "size",
  "margin",
  "title"
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
