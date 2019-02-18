import React from "react"
import Sidebar from "./Sidebar"
import ScrollToTop from "./ScrollToTop"

import MarkdownPage from "./MarkdownPage"
import CreateALineChart from "./guides/CreateALineChart"
import CreateAnAreaChart from "./guides/CreateAnAreaChart"
import CreateAScatterplot from "./guides/CreateAScatterplot"
import CreateXYSummaries from "./guides/CreateXYSummaries"
import CreateXYBrushes from "./guides/CreateXYBrushes"
import CreateABarChart from "./guides/CreateABarChart"
import CreateAPieChart from "./guides/CreateAPieChart"
import CreateOrdinalSummaries from "./guides/CreateOrdinalSummaries"
import CreateOrdinalBrushes from "./guides/CreateOrdinalBrushes"
import CreateSparklines from "./guides/CreateSparklines"
import CreateAForceLayout from "./guides/CreateAForceLayout"
import CreateAPathDiagram from "./guides/CreateAPathDiagram"
import CreateAHierarchicalDiagram from "./guides/CreateAHierarchicalDiagram"
import CreateSmallMultiples from "./guides/CreateSmallMultiples"
import CreateCrossHighlighting from "./guides/CreateCrossHighlighting"
import Tooltips from "./guides/Tooltips"
import Annotations from "./guides/Annotations"
import UsingSketchyPaintyPatterns from "./guides/UsingSketchyPaintyPatterns"
import ForegroundBackgroundSVG from "./guides/ForegroundBackgroundSVG"
import CanvasRendering from "./guides/CanvasRendering"

import CandlestickChart from "./examples/CandlestickChart"
import WaterfallChart from "./examples/WaterfallChart"
import CanvasInteraction from "./examples/CanvasInteraction"

import HomerunMap from "./examples/HomerunMap"
import MarimekkoChart from "./examples/MarimekkoChart"
import BarLineChart from "./examples/BarLineChart"
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
import Axis from "./sub-components/Axis"
import DividedLine from "./sub-components/DividedLine"
import Legend from "./sub-components/Legend"

const ROOT = process.env.PUBLIC_URL

const PAGES = [
  {
    url: "",
    name: "Home",
    className: "bold pointer black",
    component: MarkdownPage,
    props: {
      filename: "home"
    }
  },
  {
    url: "guides",
    name: "Guides",
    className: "bold pointer black",
    children: [
      {
        name: "XYFrame",
        className: "sub-header"
      },
      {
        name: "Creating Line Charts",
        url: "line-chart",
        component: CreateALineChart
      },
      // { name: "Creating Divided Line Charts" },
      {
        name: "Creating Area Charts",
        url: "area-chart",
        component: CreateAnAreaChart
      },
      {
        name: "Creating Scatterplots",
        url: "scatterplot",
        component: CreateAScatterplot
      },
      {
        name: "Creating XY Summaries",
        url: "xy-summaries",
        component: CreateXYSummaries
      },

      {
        name: "Creating XY Brushes",
        url: "xy-brushes",
        component: CreateXYBrushes
      },
      {
        name: "OrdinalFrame",
        className: "sub-header"
      },
      {
        name: "Creating Bar Charts",
        url: "bar-chart",
        component: CreateABarChart
      },
      {
        name: "Creating Pie Charts",
        url: "pie-chart",
        component: CreateAPieChart
      },
      {
        name: "Creating Ordinal Summaries",
        url: "ordinal-summaries",
        component: CreateOrdinalSummaries
      },
      {
        name: "Creating Ordinal Brushes",
        url: "ordinal-brushes",
        component: CreateOrdinalBrushes
      },
      {
        name: "NetworkFrame",
        className: "sub-header"
      },
      {
        name: "Creating Force Layouts",
        url: "force-layouts",
        component: CreateAForceLayout
      },
      {
        name: "Creating Path Diagrams",
        url: "path-diagrams",
        component: CreateAPathDiagram
      },
      {
        name: "Creating Hierarchical Diagrams",
        url: "hierarchical",
        component: CreateAHierarchicalDiagram
      },
      {
        name: "All Frames",
        className: "sub-header"
      },
      {
        name: "Annotations",
        url: "annotations",
        component: Annotations
      },
      {
        name: "Annotations - Tooltips",
        url: "tooltips",
        component: Tooltips
      },

      {
        name: "Annotations - Highlighting",
        url: "highlighting",
        component: CreateCrossHighlighting
      },

      {
        name: "Creating Small Multiples",
        url: "small-multiples",

        component: CreateSmallMultiples
      },
      {
        name: "Canvas Rendering",
        url: "canvas-rendering",
        component: CanvasRendering
      },
      {
        name: "Creating Sparklines",
        url: "sparklines",
        component: CreateSparklines
      },
      {
        name: "Using Sketchy/Painty/Patterns",
        url: "sketchy-painty-patterns",
        component: UsingSketchyPaintyPatterns
      },
      {
        name: "Using Foreground/Background SVG",
        url: "foreground-background-svg",
        component: ForegroundBackgroundSVG
      },
      {
        name: "Accessibility",
        url: "accessibility",
        component: MarkdownPage,
        props: {
          filename: "accessibility"
        }
      }
    ]
  },
  {
    url: "examples",
    name: "Examples",
    className: "bold pointer black",
    children: [
      {
        name: "XYFrame",
        className: "sub-header"
      },
      {
        name: "Candlestick Chart",
        url: "candlestick-chart",
        component: CandlestickChart
      },

      {
        name: "Homerun Map",
        url: "homerun-map",
        component: HomerunMap
      },
      {
        name: "Canvas Interaction",
        url: "canvas-interaction",
        component: CanvasInteraction
      },
      {
        name: "OrdinalFrame",
        className: "sub-header"
      },
      {
        name: "Bar & Line Chart",
        url: "bar-line-chart",
        component: BarLineChart
      },
      {
        name: "Waterfall Chart",
        url: "waterfall-chart",
        component: WaterfallChart
      },
      { name: "Slope Chart", url: "slope-chart", component: SlopeChart },
      {
        name: "Marimekko Chart",
        url: "marimekko-chart",
        component: MarimekkoChart
      },
      {
        name: "Swarm Plot",
        url: "swarm-plot",
        component: SwarmPlot
      },
      {
        name: "Ridgeline Plot",
        url: "ridgeline-plot",
        component: RidgelinePlot
      },
      {
        name: "Dot Plot",
        url: "dot-plot",
        component: DotPlot
      },
      {
        name: "Timeline",
        url: "timeline",
        component: Timeline
      },
      {
        name: "Radar Plot",
        url: "radar-plot",
        component: RadarPlot
      },
      {
        name: "Isotype Chart",
        url: "isotype-chart",
        component: IsotypeChart
      },
      {
        name: "NetworkFrame",
        className: "sub-header"
      },
      { name: "Adjacency Matrix", url: "matrix", component: Matrix },
      { name: "Custom Layout", url: "custom-layout", component: CustomLayout }
    ]
  },
  {
    url: "api",
    name: "API",
    className: "bold pointer black",
    children: [
      {
        name: "Main Components",
        className: "sub-header"
      },
      {
        name: "XYFrame",
        url: "xyframe",
        component: MarkdownPage,
        props: {
          filename: "xyframe"
        }
      },
      // {
      //   name: "MinimapXYFrame",
      //   url: "minimapxyframe"
      // },
      {
        name: "OrdinalFrame",
        url: "ordinalframe",
        component: MarkdownPage,
        props: {
          filename: "ordinalframe"
        }
        // component: APIXYFrame
      },

      {
        name: "NetworkFrame",
        url: "networkframe",
        component: MarkdownPage,
        props: {
          filename: "networkframe"
        }
        // component: APIXYFrame
      },
      { name: "separator" },
      {
        name: "ResponsiveFrame",
        url: "responsiveframe",
        component: MarkdownPage,
        props: {
          filename: "responsiveframes"
        }
      },
      {
        name: "SparkFrame",
        url: "sparkFrame",
        component: MarkdownPage,
        props: {
          filename: "sparkframes"
        }
      },
      { name: "separator" },

      {
        name: "FacetController",
        url: "facetcontroller"
      },
      {
        name: "Sub-Components",
        className: "sub-header"
      },
      {
        name: "Mark",
        url: "mark",
        component: Mark
      },
      {
        name: "DividedLine",
        url: "dividedline",
        component: DividedLine
      },
      {
        name: "Axis",
        url: "axis",
        component: Axis
      },
      {
        name: "Legend",
        url: "legend",
        component: Legend
      }
    ]
  }
]

export default function() {
  const view = window.location.pathname.split(/#|\//g).filter(d => d)

  let View,
    viewProps = {},
    page,
    subpage

  //router logic
  if (view[0]) {
    page = PAGES.find(d => d.url === view[0])
    if (page && view[1]) {
      subpage = page.children.find(d => d.url === view[1])
      if (subpage) {
        View = subpage.component
        if (subpage.props) viewProps = subpage.props
      } else {
        View = page.component
        if (page.props) viewProps = page.props
      }
    } else if (page) {
      View = page.component
      if (page.props) viewProps = page.props
    }
  } else {
    page = PAGES[0]

    View = page.component
    viewProps = page.props
  }

  return (
    <div className="App">
      <ScrollToTop location={window.location} />
      <header className="flex algin-bottom">
        <div className="logo">
          <img src={ROOT + "/assets/img/semiotic.png"} alt="Semiotic" />
        </div>
        <div>
          <h1>
            {page && page.name}
            {subpage && ` > ${subpage.name}`}
          </h1>
        </div>
      </header>
      <div className="flex body">
        <div className="sidebar">
          <Sidebar pages={PAGES} selected={view[view.length - 1]} />
        </div>
        <div className="container">
          <h1>
            {(subpage && subpage.name) ||
              (page && page.name && page.name !== "Home" && page.name)}
          </h1>
          <div className="margin-bottom">{View && <View {...viewProps} />}</div>
        </div>
      </div>
    </div>
  )
}
