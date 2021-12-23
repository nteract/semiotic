## XYFrame

`canvasLines`, `canvasSummaries`, `canvasPoints`

Each can take a boolean or a function that evaluates the datapoint and returns true if it should be rendered in canvas.

`customPointMark` and `customLineMark` and `customSummaryMark` will not be rendered in canvas.

## OrdinalFrame

`canvasPieces`, `canvasSummaries`, `canvasConnectors` as above.

As with above, `customMark` will not be honored in canvas.

## NetworkFrame

`canvasNodes`, `canvasEdges` as above.

`customNodeIcon` and `customEdgeIcon` will not be honored in canvas.
