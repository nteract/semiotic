"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPONENT_REGISTRY = void 0;
const ai_1 = require("semiotic/ai");
const geo_1 = require("semiotic/geo");
exports.COMPONENT_REGISTRY = {
    LineChart: { component: ai_1.LineChart, category: "xy" },
    AreaChart: { component: ai_1.AreaChart, category: "xy" },
    StackedAreaChart: { component: ai_1.StackedAreaChart, category: "xy" },
    Scatterplot: { component: ai_1.Scatterplot, category: "xy" },
    BubbleChart: { component: ai_1.BubbleChart, category: "xy" },
    Heatmap: { component: ai_1.Heatmap, category: "xy" },
    ConnectedScatterplot: { component: ai_1.ConnectedScatterplot, category: "xy" },
    BarChart: { component: ai_1.BarChart, category: "ordinal" },
    StackedBarChart: { component: ai_1.StackedBarChart, category: "ordinal" },
    GroupedBarChart: { component: ai_1.GroupedBarChart, category: "ordinal" },
    SwarmPlot: { component: ai_1.SwarmPlot, category: "ordinal" },
    BoxPlot: { component: ai_1.BoxPlot, category: "ordinal" },
    DotPlot: { component: ai_1.DotPlot, category: "ordinal" },
    PieChart: { component: ai_1.PieChart, category: "ordinal" },
    DonutChart: { component: ai_1.DonutChart, category: "ordinal" },
    ForceDirectedGraph: { component: ai_1.ForceDirectedGraph, category: "network" },
    ChordDiagram: { component: ai_1.ChordDiagram, category: "network" },
    SankeyDiagram: { component: ai_1.SankeyDiagram, category: "network" },
    TreeDiagram: { component: ai_1.TreeDiagram, category: "network" },
    Treemap: { component: ai_1.Treemap, category: "network" },
    CirclePack: { component: ai_1.CirclePack, category: "network" },
    OrbitDiagram: { component: ai_1.OrbitDiagram, category: "network" },
    ChoroplethMap: { component: geo_1.ChoroplethMap, category: "geo" },
    ProportionalSymbolMap: { component: geo_1.ProportionalSymbolMap, category: "geo" },
    FlowMap: { component: geo_1.FlowMap, category: "geo" },
    DistanceCartogram: { component: geo_1.DistanceCartogram, category: "geo" },
};
