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

// NEW: Props that affect data projection - trigger calculateOrdinalFrame data processing
export const orFrameDataAffectingProps = [
  // Core data
  "data",

  // Data accessors
  "oAccessor",
  "rAccessor",
  "dataAccessor",

  // Data transformation
  "type",
  "summaryType",
  "connectorType",
  "projection",
  "orient",

  // Scale types (affect data domain)
  "oScaleType",
  "rScaleType",

  // Extent overrides
  "oExtent",
  "rExtent",
  "invertO",
  "invertR",

  // Layout affecting data
  "oPadding",
  "oSort",
  "dynamicColumnWidth",
  "rBaseline",
  "summaryPosition",

  // Custom rendering
  "renderFn"
]

// NEW: Props that affect scales/layout - trigger scale recalc but not data projection
export const orFrameScaleAffectingProps = [
  // Size and layout
  "size",
  "margin",
  "title",

  // Axes and labels (affect margin/layout)
  "axes",
  "oLabel",

  // All data-affecting props also affect scales
  ...orFrameDataAffectingProps
]

// NEW: Props that only affect styling/rendering - no data or scale recalc
export const orFrameStylingProps = [
  // Styling
  "style",
  "connectorStyle",
  "summaryStyle",

  // Classes
  "className",

  // Interaction (no data recalc needed)
  "customClickBehavior",
  "customHoverBehavior",
  "customDoubleClickBehavior",
  "hoverAnnotation",
  "pieceHoverAnnotation",
  "summaryHoverAnnotation",

  // Other rendering
  "additionalDefs",
  "renderKey",
  "name"
]

// Legacy export - now includes all prop categories
export const orFrameChangeProps = [
  ...orFrameDataAffectingProps,
  ...orFrameStylingProps,
  "axes",  // Duplicated but needed for backward compatibility
  "size",
  "margin",
  "title",
  "oLabel"
]

// NEW: Props that affect data projection - trigger calculateNetworkFrame data processing
export const networkFrameDataAffectingProps = [
  // Core data
  "graph",
  "nodes",
  "edges",

  // Data accessors
  "nodeIDAccessor",
  "sourceAccessor",
  "targetAccessor",
  "nodeSizeAccessor",
  "edgeWidthAccessor",

  // Layout and type
  "networkType",
  "edgeType",

  // Filters
  "filterRenderedNodes",

  // Custom rendering
  "renderFn"
]

// NEW: Props that affect scales/layout - trigger scale recalc but not data projection
export const networkFrameScaleAffectingProps = [
  // Size and layout
  "size",
  "margin",
  "title",

  // Labels (might affect layout)
  "nodeLabels",

  // All data-affecting props also affect scales
  ...networkFrameDataAffectingProps
]

// NEW: Props that only affect styling/rendering - no data or scale recalc
export const networkFrameStylingProps = [
  // Styling
  "nodeStyle",
  "edgeStyle",

  // Custom marks
  "customNodeIcon",

  // Classes
  "className",

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
export const networkFrameChangeProps = [
  ...networkFrameDataAffectingProps,
  ...networkFrameStylingProps,
  "size",
  "margin",
  "title",
  "nodeLabels"
]
