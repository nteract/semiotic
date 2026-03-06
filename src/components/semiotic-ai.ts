"use client"

// Semiotic AI — curated HOC-only surface for AI code generation
// Import: import { LineChart, BarChart, ... } from "semiotic/ai"

// XY Charts
export { LineChart } from "./charts/xy/LineChart"
export { AreaChart } from "./charts/xy/AreaChart"
export { StackedAreaChart } from "./charts/xy/StackedAreaChart"
export { Scatterplot } from "./charts/xy/Scatterplot"
export { BubbleChart } from "./charts/xy/BubbleChart"
export { Heatmap } from "./charts/xy/Heatmap"
export { ScatterplotMatrix } from "./charts/xy/ScatterplotMatrix"

// Coordinated Views
export { LinkedCharts } from "./LinkedCharts"
export { useSelection, useLinkedHover, useBrushSelection, useFilteredData } from "./LinkedCharts"

// Ordinal Charts
export { BarChart } from "./charts/ordinal/BarChart"
export { StackedBarChart } from "./charts/ordinal/StackedBarChart"
export { GroupedBarChart } from "./charts/ordinal/GroupedBarChart"
export { SwarmPlot } from "./charts/ordinal/SwarmPlot"
export { BoxPlot } from "./charts/ordinal/BoxPlot"
export { Histogram } from "./charts/ordinal/Histogram"
export { ViolinPlot } from "./charts/ordinal/ViolinPlot"
export { DotPlot } from "./charts/ordinal/DotPlot"
export { RidgelinePlot } from "./charts/ordinal/RidgelinePlot"
export { PieChart } from "./charts/ordinal/PieChart"
export { DonutChart } from "./charts/ordinal/DonutChart"

// Network Charts
export { ForceDirectedGraph } from "./charts/network/ForceDirectedGraph"
export { ChordDiagram } from "./charts/network/ChordDiagram"
export { SankeyDiagram } from "./charts/network/SankeyDiagram"
export { TreeDiagram } from "./charts/network/TreeDiagram"
export { Treemap } from "./charts/network/Treemap"
export { CirclePack } from "./charts/network/CirclePack"

// Realtime Charts
export { RealtimeLineChart } from "./charts/realtime/RealtimeLineChart"
export { RealtimeHistogram } from "./charts/realtime/RealtimeHistogram"
export { RealtimeSwarmChart } from "./charts/realtime/RealtimeSwarmChart"
export { RealtimeWaterfallChart } from "./charts/realtime/RealtimeWaterfallChart"
export { RealtimeHeatmap } from "./charts/realtime/RealtimeHeatmap"
// Essential utilities
export { TooltipProvider } from "./store/TooltipStore"
export { MultiLineTooltip } from "./Tooltip/Tooltip"

// Theme
export { ThemeProvider, useTheme } from "./ThemeProvider"

// Export utility
export { exportChart } from "./export/exportChart"

// Chart container
export { ChartContainer } from "./ChartContainer"
export type { ChartContainerProps, ChartContainerHandle } from "./ChartContainer"

// Layout
export { ChartGrid } from "./ChartGrid"
export type { ChartGridProps } from "./ChartGrid"

// Context layout
export { ContextLayout } from "./ContextLayout"
export type { ContextLayoutProps } from "./ContextLayout"

// Shared categorical styles
export { CategoryColorProvider, useCategoryColors } from "./CategoryColors"
export type { CategoryColorMap, CategoryColorProviderProps } from "./CategoryColors"

// Details panel
export { DetailsPanel } from "./DetailsPanel"
export type { DetailsPanelProps } from "./DetailsPanel"

// AI validation
export { validateProps } from "./charts/shared/validateProps"
export type { ValidationResult } from "./charts/shared/validateProps"

// Statistical overlay types
export type { AnomalyConfig, ForecastConfig } from "./charts/shared/statisticalOverlays"

// Chart state serialization
export { toConfig, fromConfig, toURL, fromURL, copyConfig, configToJSX } from "./export/chartConfig"
export type { ChartConfig, ToConfigOptions, CopyFormat } from "./export/chartConfig"
export { serializeSelections, deserializeSelections } from "./export/selectionSerializer"
export type { SerializedSelections, SerializedSelection, SerializedFieldSelection } from "./export/selectionSerializer"

// Vega-Lite translator
export { fromVegaLite } from "./data/fromVegaLite"
export type { VegaLiteSpec, VegaLiteEncoding } from "./data/fromVegaLite"

// AI Observation hooks
export { useChartObserver } from "./store/useObservation"
export type { UseChartObserverOptions, UseChartObserverResult } from "./store/useObservation"
export type {
  ChartObservation,
  OnObservationCallback,
  HoverObservation,
  HoverEndObservation,
  BrushObservation,
  BrushEndObservation,
  SelectionObservation,
  SelectionEndObservation,
  ClickObservation,
  ClickEndObservation
} from "./store/ObservationStore"
