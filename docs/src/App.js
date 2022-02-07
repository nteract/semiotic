import React from "react"
import { Routes, Route, NavLink, Outlet } from "react-router-dom"

import Home from "./Home"
import { GuidesIndex, ExamplesIndex, ApiIndex } from "./IndexPages"
import Accessibility from "./markdown/accessibility.mdx"
import Xyframe from "./markdown/xyframe.mdx"
import Ordinalframe from "./markdown/ordinalframe.mdx"
import Networkframe from "./markdown/networkframe.mdx"
import Responsiveframes from "./markdown/responsiveframes.mdx"
import Sparkframes from "./markdown/sparkframes.mdx"
import Facetcontroller from "./markdown/facetcontroller.mdx"

import LineChart from "./guides/LineChart.mdx"
import AreaChart from "./guides/AreaChart"
import Scatterplot from "./guides/Scatterplot"
import XYSummaries from "./guides/XYSummaries"
import XYBrushes from "./guides/XYBrushes"
import BarChart from "./guides/BarChart"
import PieChart from "./guides/PieChart"
import OrdinalSummaries from "./guides/OrdinalSummaries"
import OrdinalBrushes from "./guides/OrdinalBrushes"
import Sparklines from "./guides/Sparklines.mdx"
import ForceLayout from "./guides/ForceLayout"
import PathDiagram from "./guides/PathDiagram"
import HierarchicalDiagram from "./guides/HierarchicalDiagram"
import SmallMultiples from "./guides/SmallMultiples"
import CrossHighlighting from "./guides/CrossHighlighting"
import Tooltips from "./guides/Tooltips"

import Annotations from "./guides/Annotations.mdx"
import UsingSketchyPatterns from "./guides/UsingSketchyPatterns"
import ForegroundBackgroundSVG from "./guides/ForegroundBackgroundSVG"
import CanvasRendering from "./guides/CanvasRendering"
import AxisSettings from "./guides/AxisSettings"

import CandlestickChart from "./examples/CandlestickChart"
import CanvasInteraction from "./examples/CanvasInteraction"
import UncertaintyVisualization from "./examples/UncertaintyVisualization"

import WaterfallChart from "./examples/WaterfallChart"
import HomerunMap from "./examples/HomerunMap"
import MarginalGraphics from "./examples/MarginalGraphics"

import MarimekkoChart from "./examples/MarimekkoChart"
import BarLineChart from "./examples/BarLineChart"
import BarToParallel from "./examples/BarToParallel"
import DotPlot from "./examples/DotPlot"
import SwarmPlot from "./examples/SwarmPlot"
import RidgelinePlot from "./examples/RidgelinePlot"
import Timeline from "./examples/Timeline"
import SlopeChart from "./examples/SlopeChart"
import RadarPlot from "./examples/RadarPlot"
import Matrix from "./examples/Matrix"
import CustomLayout from "./examples/CustomLayout"
import IsotypeChart from "./examples/IsotypeChart"

import Mark from "./sub-components/Mark"
import DividedLine from "./sub-components/DividedLine"

import semioticLogo from "../public/assets/img/semiotic.png"

import { useScrollRestoration } from "./useScrollRestoration"

export default function DocsApp() {
  useScrollRestoration()
  return (
    <div className="App">
      <header className="flex">
        <div className="logo">
          <img src={semioticLogo} alt="Semiotic" />
        </div>
        <div className="flex space-between">
          <h1>
            Home
            {/*{subpage && ` > ${subpage.name}`}*/}
          </h1>

          <div className="flex github-links">
            <p className="no-margin">
              <a
                rel="noopener noreferrer"
                target="_blank"
                href="https://github.com/nteract/semiotic"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </header>
      <div className="flex body">
        <div className="sidebar">
          <Sidebar />
        </div>
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="guides" element={<Outlet />}>
              <Route
                path=""
                element={
                  <>
                    <h1>Guides</h1>
                    <GuidesIndex />
                  </>
                }
              />
              <Route path="line-chart" element={<LineChart />} />
              <Route path="area-chart" element={<AreaChart />} />
              <Route path="scatterplot" element={<Scatterplot />} />
              <Route path="xy-summaries" element={<XYSummaries />} />
              <Route path="xy-brushes" element={<XYBrushes />} />
              <Route path="bar-chart" element={<BarChart />} />
              <Route path="pie-chart" element={<PieChart />} />
              <Route path="ordinal-summaries" element={<OrdinalSummaries />} />
              <Route path="ordinal-brushes" element={<OrdinalBrushes />} />
              <Route path="force-layouts" element={<ForceLayout />} />
              <Route path="path-diagrams" element={<PathDiagram />} />
              <Route path="hierarchical" element={<HierarchicalDiagram />} />
              <Route path="axis" element={<AxisSettings />} />
              <Route path="annotations" element={<Annotations />} />
              <Route path="tooltips" element={<Tooltips />} />
              <Route path="highlighting" element={<CrossHighlighting />} />
              <Route path="accessibility" element={<Accessibility />} />
              <Route path="small-multiples" element={<SmallMultiples />} />
              <Route path="canvas-rendering" element={<CanvasRendering />} />
              <Route path="sparklines" element={<Sparklines />} />
              <Route path="sketchy-patterns" element={<UsingSketchyPatterns />} />
              <Route path="foreground-background-svg" element={<ForegroundBackgroundSVG />} />
            </Route>

            <Route path="examples" element={<Outlet />}>
              <Route
                path=""
                element={
                  <>
                    <h1>Examples</h1>
                    <ExamplesIndex />
                  </>
                }
              />
              <Route path="candlestick-chart" element={<CandlestickChart />} />
              <Route path="homerun-map" element={<HomerunMap />} />
              <Route path="canvas-interaction" element={<CanvasInteraction />} />
              <Route path="uncertainty-visualization" element={<UncertaintyVisualization />} />
              <Route path="marginal-graphics" element={<MarginalGraphics />} />
              <Route path="bar-line-chart" element={<BarLineChart />} />
              <Route path="bar-to-parallel-coordinates" element={<BarToParallel />} />
              <Route path="waterfall-chart" element={<WaterfallChart />} />
              <Route path="slope-chart" element={<SlopeChart />} />
              <Route path="marimekko-chart" element={<MarimekkoChart />} />
              <Route path="swarm-plot" element={<SwarmPlot />} />
              <Route path="ridgeline-plot" element={<RidgelinePlot />} />
              <Route path="dot-plot" element={<DotPlot />} />
              <Route path="timeline" element={<Timeline />} />
              <Route path="radar-plot" element={<RadarPlot />} />
              <Route path="isotype-chart" element={<IsotypeChart />} />
              <Route path="matrix" element={<Matrix />} />
              <Route path="custom-layout" element={<CustomLayout />} />
            </Route>

            <Route path="api" element={<Outlet />}>
              <Route
                path=""
                element={
                  <>
                    <h1>API</h1>
                    <ApiIndex />
                  </>
                }
              />
              <Route path="xyframe" element={<Xyframe />} />
              <Route path="ordinalframe" element={<Ordinalframe />} />
              <Route path="networkframe" element={<Networkframe />} />
              <Route path="responsiveframe" element={<Responsiveframes />} />
              <Route path="sparkFrame" element={<Sparkframes />} />
              <Route path="facetcontroller" element={<Facetcontroller />} />
              <Route path="mark" element={<Mark />} />
              <Route path="dividedline" element={<DividedLine />} />
            </Route>
          </Routes>
        </div>
      </div>
    </div>
  )
}

function Sidebar() {
  return (
    <div>
      <p className="bold pointer black selected">
        <NavLink to="/" end>
          Home
        </NavLink>
      </p>
      <p className="bold pointer black">
        <NavLink to="/guides" end>
          Guides
        </NavLink>
      </p>

      <p className="sub-header sub-page selected">XYFrame</p>
      <p className="black sub-page">
        <NavLink to="/guides/line-chart">Line Charts</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/area-chart">Area Charts</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/scatterplot">Scatterplots</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/xy-summaries">XY Summaries</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/xy-brushes">XY Brushes</NavLink>
      </p>

      <p className="sub-header sub-page selected">OrdinalFrame</p>
      <p className="black sub-page">
        <NavLink to="/guides/bar-chart">Bar Charts</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/pie-chart">Pie Charts</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/ordinal-summaries">Ordinal Summaries</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/ordinal-brushes">Ordinal Brushes</NavLink>
      </p>

      <p className="sub-header sub-page selected">NetworkFrame</p>
      <p className="black sub-page">
        <NavLink to="/guides/force-layouts">Force Layouts</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/path-diagrams">Path Diagrams</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/hierarchical">Hierarchical Diagrams</NavLink>
      </p>

      <p className="sub-header sub-page selected">All Frames</p>
      <p className="black sub-page">
        <NavLink to="/guides/axis">Axis</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/annotations">Annotations</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/tooltips">Annotations - Tooltips</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/highlighting">Annotations - Highlighting</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/accessibility">Accessibility</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/small-multiples">Small Multiples</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/canvas-rendering">Canvas Rendering</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/sparklines">Sparklines</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/sketchy-patterns">Using Sketchy / Patterns</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/guides/foreground-background-svg">Using Foreground / Background SVG</NavLink>
      </p>
      <p className="bold pointer black">
        <NavLink to="/examples">Examples</NavLink>
      </p>

      <p className="sub-header sub-page selected">XYFrame</p>
      <p className="black sub-page">
        <NavLink to="/examples/candlestick-chart">Candlestick Chart</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/homerun-map">Homerun Map</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/canvas-interaction">Canvas Interaction</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/uncertainty-visualization">Uncertainty Visualization</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/marginal-graphics">Marginal Graphics</NavLink>
      </p>

      <p className="sub-header sub-page selected">OrdinalFrame</p>
      <p className="black sub-page">
        <NavLink to="/examples/bar-line-chart">Bar &amp; Line Chart</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/bar-to-parallel-coordinates">Bar to Parallel Coordinates</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/waterfall-chart">Waterfall Chart</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/slope-chart">Slope Chart</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/marimekko-chart">Marimekko Chart</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/swarm-plot">Swarm Plot</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/ridgeline-plot">Ridgeline Plot</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/dot-plot">Dot Plot</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/timeline">Timeline</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/radar-plot">Radar Plot</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/isotype-chart">Isotype Chart</NavLink>
      </p>

      <p className="sub-header sub-page selected">NetworkFrame</p>
      <p className="black sub-page">
        <NavLink to="/examples/matrix">Adjacency Matrix</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/examples/custom-layout">Custom Layout</NavLink>
      </p>
      <p className="bold pointer black">
        <NavLink to="/api">API</NavLink>
      </p>

      <p className="sub-header sub-page selected">Frames</p>
      <p className="black sub-page">
        <NavLink to="/api/xyframe">XYFrame</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/api/ordinalframe">OrdinalFrame</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/api/networkframe">NetworkFrame</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/api/responsiveframe">ResponsiveFrame</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/api/sparkFrame">SparkFrame</NavLink>
      </p>

      <p className="sub-header sub-page selected">Controls</p>
      <p className="black sub-page">
        <NavLink to="/api/facetcontroller">FacetController</NavLink>
      </p>

      <p className="sub-header sub-page selected">Sub-Components</p>
      <p className="black sub-page">
        <NavLink to="/api/mark">Mark</NavLink>
      </p>
      <p className="black sub-page">
        <NavLink to="/api/dividedline">DividedLine</NavLink>
      </p>
    </div>
  )
}
