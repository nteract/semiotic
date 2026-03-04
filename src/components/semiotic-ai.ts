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
export { RealtimeBarChart } from "./charts/realtime/RealtimeBarChart"
export { RealtimeSwarmChart } from "./charts/realtime/RealtimeSwarmChart"
export { RealtimeWaterfallChart } from "./charts/realtime/RealtimeWaterfallChart"
// Essential utilities
export { TooltipProvider } from "./store/TooltipStore"
export { MultiLineTooltip } from "./Tooltip/Tooltip"

// Theme
export { ThemeProvider, useTheme } from "./ThemeProvider"

// Export utility
export { exportChart } from "./export/exportChart"

// AI validation
export { validateProps } from "./charts/shared/validateProps"
export type { ValidationResult } from "./charts/shared/validateProps"
