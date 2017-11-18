import React from "react";
import { Link } from "react-router-dom";

import DotPlotRaw from "../components/DotPlotRaw";
import NeighborhoodMapRaw from "../components/NeighborhoodMapRaw";
import BarLineRaw from "../components/BarLineRaw";
import RegionatedLineChartRaw from "../components/RegionatedLineChartRaw";
import DonutChartRaw from "../components/DonutChartRaw";
import HeatMapRaw from "../components/HeatMapRaw";
import JoyPlotRaw from "../components/JoyPlotRaw";
import MarimekkoRaw from "../components/MarimekkoRaw";
import ViolinRaw from "../components/ViolinRaw";
import WaterfallChartRaw from "../components/WaterfallChartRaw";
import SwarmBrushRaw from "../components/SwarmBrushRaw";
import DivergingStackedBarRaw from "../components/DivergingStackedBarRaw";
import ChordRaw from "../components/ChordRaw";
import SankeyRaw from "../components/SankeyRaw";
import AppleStockChartRaw from "../components/AppleStockChartRaw";
import BaseballMapRaw from "../components/BaseballMapRaw";
import BulletChartRaw from "../components/BulletChartRaw";
import DendrogramRaw from "../components/DendrogramRaw";
import DivergingStackedIsotypeRaw from "../components/DivergingStackedIsotypeRaw";
import VerticalIsotypeRaw from "../components/VerticalIsotypeRaw";
import NegativeStackedRaw from "../components/NegativeStackedRaw";
import CustomMarkRaw from "../components/CustomMarkRaw";

import {
  genericBarChart,
  genericLineChart,
  genericNetworkChart
} from "../components/GenericChartsRaw";

const exampos = [
  {
    label: "Home Run Map",
    viz: BaseballMapRaw({
      pointStyle: { fill: "black" },
      areaStyle: d => ({
        stroke: "none",
        fill: "#b3331d",
        opacity: 0.25
      }),
      areaType: "contour",
      areaRenderMode: "sketchy"
    }),
    path: "homerunmap"
  },
  { label: "Bullet Chart", viz: BulletChartRaw, path: "bullet" },
  { label: "Dendrogram", viz: DendrogramRaw({}), path: "dendrogram" },
  { label: "ISOTYPE 2", viz: VerticalIsotypeRaw, path: "verticalisotype" },
  {
    label: "ISOTYPE",
    viz: DivergingStackedIsotypeRaw,
    path: "divergingstackedisotype"
  },
  { label: "Dot Plot", viz: DotPlotRaw, path: "dotplot" },
  {
    label: "Neighborhood Map",
    viz: NeighborhoodMapRaw,
    path: "neighborhoodmap"
  },
  { label: "Bar/Line Chart", viz: BarLineRaw, path: "barline" },
  {
    label: "Regionated Line Chart",
    viz: RegionatedLineChartRaw,
    path: "regionatedlinechart"
  },
  {
    label: "Pie/Donut/Nightingale",
    viz: DonutChartRaw({ kind: "pie" }),
    path: "donutchart"
  },
  { label: "Heat Map", viz: HeatMapRaw, path: "heatmap" },
  { label: "Joy Plot", viz: JoyPlotRaw, path: "joyplot" },
  { label: "Marimekko Chart", viz: MarimekkoRaw, path: "marimekko" },
  { label: "Violin Plot", viz: ViolinRaw, path: "violin" },
  { label: "Waterfall Chart", viz: WaterfallChartRaw, path: "waterfall" },
  { label: "XY Charts", viz: genericLineChart, path: "xyframe" },
  { label: "Ordinal Charts", viz: genericBarChart, path: "orframe" },
  { label: "Network Charts", viz: genericNetworkChart, path: "networkframe" },
  {
    label: "Negative Stacked",
    viz: NegativeStackedRaw(),
    path: "negativestacked"
  },
  {
    label: "Custom OR Type",
    viz: CustomMarkRaw(),
    path: "custommark"
  },
  {
    label: "Swarm Brush",
    viz: SwarmBrushRaw(
      Array.from(Array(200), () => ({ value: parseInt(Math.random() * 100) })),
      () => {}
    ),
    path: "swarmbrush"
  },
  {
    label: "Chord Diagram",
    viz: ChordRaw({ padAngle: Math.random() * 0.5 }),
    path: "chord"
  },
  { label: "Sankey", viz: SankeyRaw({}), path: "sankey" },
  {
    label: "Diverging Stacked Bar",
    viz: DivergingStackedBarRaw,
    path: "divergingstackedbar"
  },
  { label: "Annotations", viz: AppleStockChartRaw, path: "annotations" }
];

export const wrappedExamples = exampos.map(d => (
  <div key={d.path} className="example-wrapper">
    <Link to={`/${d.path}`}>
      <h1>{d.label}</h1>
      <div className="frame-cover" />
      {d.viz}
    </Link>
  </div>
));
