import React from "react"
import Sidebar from "./Sidebar"
import ScrollToTop from "./ScrollToTop"
import MarkdownPage from "./MarkdownPage"
import SubPage from "./SubPage"
import Home from "./Home"

import LineChart from "./guides/LineChart"
import AreaChart from "./guides/AreaChart"
import Scatterplot from "./guides/Scatterplot"
import XYSummaries from "./guides/XYSummaries"
import XYBrushes from "./guides/XYBrushes"
import BarChart from "./guides/BarChart"
import PieChart from "./guides/PieChart"
import OrdinalSummaries from "./guides/OrdinalSummaries"
import OrdinalBrushes from "./guides/OrdinalBrushes"
import Sparklines from "./guides/Sparklines"
import ForceLayout from "./guides/ForceLayout"
import PathDiagram from "./guides/PathDiagram"
import HierarchicalDiagram from "./guides/HierarchicalDiagram"
import SmallMultiples from "./guides/SmallMultiples"
import CrossHighlighting from "./guides/CrossHighlighting"
import Tooltips from "./guides/Tooltips"
import Test from "./Test"
import Annotations from "./guides/Annotations"
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

const ROOT = process.env.PUBLIC_URL

export const PAGES = [
  {
    url: "",
    name: "Home",
    className: "bold pointer black",
    component: Home
  },
  {
    url: "guides",
    name: "Guides",
    component: SubPage,
    className: "bold pointer black",
    children: [
      {
        name: "XYFrame",
        className: "sub-header"
      },
      {
        name: "Line Charts",
        url: "line-chart",
        component: LineChart,
        img: "line-chart"
      },
      {
        name: "Area Charts",
        url: "area-chart",
        component: AreaChart,
        img: "area-chart"
      },
      {
        name: "Scatterplots",
        url: "scatterplot",
        component: Scatterplot,
        img: "scatterplot"
      },
      {
        name: "XY Summaries",
        url: "xy-summaries",
        component: XYSummaries,
        img: "xy-summary"
      },

      {
        name: "XY Brushes",
        url: "xy-brushes",
        component: XYBrushes,
        img: "xy-brush"
      },
      {
        name: "OrdinalFrame",
        className: "sub-header"
      },
      {
        name: "Bar Charts",
        url: "bar-chart",
        component: BarChart,
        img: "bar-chart"
      },
      {
        name: "Pie Charts",
        url: "pie-chart",
        component: PieChart,
        img: "pie-chart"
      },
      {
        name: "Ordinal Summaries",
        url: "ordinal-summaries",
        component: OrdinalSummaries,
        img: "or-summary"
      },
      {
        name: "Ordinal Brushes",
        url: "ordinal-brushes",
        component: OrdinalBrushes,
        img: "or-brush"
      },
      {
        name: "NetworkFrame",
        className: "sub-header"
      },
      {
        name: "Force Layouts",
        url: "force-layouts",
        component: ForceLayout,
        img: "force"
      },
      {
        name: "Path Diagrams",
        url: "path-diagrams",
        component: PathDiagram,
        img: "path"
      },
      {
        name: "Hierarchical Diagrams",
        url: "hierarchical",
        component: HierarchicalDiagram,
        img: "hierarchy"
      },
      {
        name: "All Frames",
        className: "sub-header"
      },
      {
        name: "Axis",
        url: "axis",
        component: AxisSettings,
        img: "axis"
      },
      {
        name: "Annotations",
        url: "annotations",
        component: Annotations,
        img: "annotations"
      },
      {
        name: "Annotations - Tooltips",
        url: "tooltips",
        component: Tooltips,
        img: "tooltips"
      },

      {
        name: "Annotations - Highlighting",
        url: "highlighting",
        component: CrossHighlighting,
        img: "highlight"
      },
      {
        name: "Accessibility",
        url: "accessibility",
        component: MarkdownPage,
        img: "accessibility",
        props: {
          filename: "accessibility"
        }
      },
      {
        name: "Small Multiples",
        url: "small-multiples",
        component: SmallMultiples,
        img: "facet"
      },
      {
        name: "Canvas Rendering",
        url: "canvas-rendering",
        component: CanvasRendering,
        img: "canvas-interaction"
      },
      {
        name: "Sparklines",
        url: "sparklines",
        component: Sparklines,
        img: "sparkline"
      },
      {
        name: "Using Sketchy / Patterns",
        url: "sketchy-patterns",
        component: UsingSketchyPatterns,
        img: "pattern"
      },
      {
        name: "Using Foreground / Background SVG",
        url: "foreground-background-svg",
        component: ForegroundBackgroundSVG,
        img: "layers"
      }
    ]
  },
  {
    url: "examples",
    name: "Examples",
    component: SubPage,
    className: "bold pointer black",
    children: [
      {
        name: "XYFrame",
        className: "sub-header"
      },
      {
        name: "Candlestick Chart",
        url: "candlestick-chart",
        component: CandlestickChart,
        img: "candlestick"
      },

      {
        name: "Homerun Map",
        url: "homerun-map",
        component: HomerunMap,
        img: "baseball"
      },

      {
        name: "Canvas Interaction",
        url: "canvas-interaction",
        component: CanvasInteraction,
        img: "canvas-interaction"
      },
      {
        name: "Uncertainty Visualization",
        url: "uncertainty-visualization",
        component: UncertaintyVisualization,
        img: "uncertainty-visualization"
      },
      {
        name: "Marginal Graphics",
        url: "marginal-graphics",
        component: MarginalGraphics,
        img: "marginal-graphics"
      },
      {
        name: "OrdinalFrame",
        className: "sub-header"
      },
      {
        name: "Bar & Line Chart",
        url: "bar-line-chart",
        component: BarLineChart,
        img: "bar-line"
      },
      {
        name: "Bar to Parallel Coordinates",
        url: "bar-to-parallel-coordinates",
        component: BarToParallel,
        img: "bar-to-parallel"
      },
      {
        name: "Waterfall Chart",
        url: "waterfall-chart",
        component: WaterfallChart,
        img: "waterfall"
      },
      {
        name: "Slope Chart",
        url: "slope-chart",
        component: SlopeChart,
        img: "slope"
      },
      {
        name: "Marimekko Chart",
        url: "marimekko-chart",
        component: MarimekkoChart,
        img: "marimekko"
      },
      {
        name: "Swarm Plot",
        url: "swarm-plot",
        component: SwarmPlot,
        img: "swarm"
      },
      {
        name: "Ridgeline Plot",
        url: "ridgeline-plot",
        component: RidgelinePlot,
        img: "ridgeline"
      },
      {
        name: "Dot Plot",
        url: "dot-plot",
        component: DotPlot,
        img: "dot"
      },
      {
        name: "Timeline",
        url: "timeline",
        component: Timeline,
        img: "timeline"
      },
      {
        name: "Radar Plot",
        url: "radar-plot",
        component: RadarPlot,
        img: "radar"
      },
      {
        name: "Isotype Chart",
        url: "isotype-chart",
        component: IsotypeChart,
        img: "isotype"
      },
      {
        name: "NetworkFrame",
        className: "sub-header"
      },
      {
        name: "Adjacency Matrix",
        url: "matrix",
        component: Matrix,
        img: "matrix"
      },
      {
        name: "Custom Layout",
        url: "custom-layout",
        component: CustomLayout,
        img: "custom-layout"
      }
    ]
  },
  {
    url: "api",
    name: "API",
    component: SubPage,
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
        img: "scatterplot",
        props: {
          filename: "xyframe"
        }
      },
      {
        name: "OrdinalFrame",
        url: "ordinalframe",
        component: MarkdownPage,
        img: "bar-chart",
        props: {
          filename: "ordinalframe"
        }
      },

      {
        name: "NetworkFrame",
        url: "networkframe",
        img: "force",
        component: MarkdownPage,
        props: {
          filename: "networkframe"
        }
      },
      {
        name: "ResponsiveFrame",
        url: "responsiveframe",
        component: MarkdownPage,
        props: {
          filename: "responsiveframes"
        },
        img: "responsive"
      },
      {
        name: "SparkFrame",
        url: "sparkFrame",
        img: "sparkline",
        component: MarkdownPage,
        props: {
          filename: "sparkframes"
        }
      },

      {
        name: "FacetController",
        url: "facetcontroller",
        img: "facet",
        component: MarkdownPage,

        props: {
          filename: "facetcontroller"
        }
      },
      {
        name: "Sub-Components",
        className: "sub-header"
      },
      {
        name: "Mark",
        url: "mark",
        component: Mark,
        img: "mark"
      },
      {
        name: "DividedLine",
        url: "dividedline",
        component: DividedLine,
        img: "divided-line"
      }
    ]
  }
]

const FallbackPage = props => {
  if (window.location.pathname === "/test") {
    return <Test {...props} />
  } else {
    window.history.replaceState(null, null, "/")
    return <Home {...props} />
  }
}

export default function () {
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
      <header className="flex">
        <div className="logo">
          <img src={ROOT + "/assets/img/semiotic.png"} alt="Semiotic" />
        </div>
        <div className="flex space-between">
          <h1>
            {page && page.name}
            {subpage && ` > ${subpage.name}`}
          </h1>

          <div className="flex github-links">
            <p className="no-margin">
              <a
                rel="noopener noreferrer"
                target="_blank"
                href="https://github.com/nteract/semiotic"
              >
                Semiotic GitHub
              </a>
            </p>
            <p className="no-margin">
              <a
                rel="noopener noreferrer"
                target="_blank"
                href="https://github.com/nteract/semiotic-docs"
              >
                Docs GitHub
              </a>
            </p>
          </div>
        </div>
      </header>
      <div className="flex body">
        <div className="sidebar">
          <div>
            <Sidebar pages={PAGES} selected={view[view.length - 1]} />
          </div>
        </div>
        <div className="container">
          <h1>
            {(subpage && subpage.name) ||
              (page && page.name && page.name !== "Home" && page.name)}
          </h1>
          <div className="margin-bottom">
            {(View && <View {...viewProps} page={page && page.name} />) || (
              <FallbackPage {...viewProps} page="Home" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
