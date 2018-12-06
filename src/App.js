import React from "react"
import Sidebar from "./Sidebar"

import MarkdownPage from "./MarkdownPage"
import APIXYFrame from "./api/XYFrame"
import CreateALineChart from "./guides/CreateALineChart"
import CreateAnAreaChart from "./guides/CreateAnAreaChart"
import CreateAScatterplot from "./guides/CreateAScatterplot"
import CreateXYSummaries from "./guides/CreateXYSummaries"
import CreateABarChart from "./guides/CreateABarChart"
import CreateAPieChart from "./guides/CreateAPieChart"
import CreateSparklines from "./guides/CreateSparklines"
import WaterfallChart from "./examples/WaterfallChart"
import MarimekkoChart from "./examples/MarimekkoChart"
import DotPlot from "./examples/DotPlot"
import Timeline from "./examples/Timeline"

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
        url: "guides-line-chart",
        component: CreateALineChart
      },
      { name: "Creating Divided Line Charts" },
      {
        name: "Creating Area Charts",
        url: "guides-area-chart",
        component: CreateAnAreaChart
      },
      {
        name: "Creating Scatterplots",
        url: "guides-scatterplot",
        component: CreateAScatterplot
      },
      {
        name: "Creating XY Summaries",
        url: "guides-xy-summaries",
        component: CreateXYSummaries
      },

      {
        name: "Creating XY Brushes"
      },
      {
        name: "OrdinalFrame",
        className: "sub-header"
      },
      {
        name: "Creating Bar Charts",
        url: "guides-bar-chart",
        component: CreateABarChart
      },
      {
        name: "Creating Pie Charts",
        url: "guides-pie-chart",
        component: CreateAPieChart
      },
      {
        name: "Creating Ordinal Summaries"
      },
      {
        name: "Creating Ordinal Brushes"
      },
      {
        name: "NetworkFrame",
        className: "sub-header"
      },
      {
        name: "Creating Force Diagrams"
      },
      {
        name: "Creating Sankey Diagrams"
      },
      {
        name: "Creating Dendrograms"
      },
      {
        name: "All Frames",
        className: "sub-header"
      },
      {
        name: "Cross-Highlighting"
      },

      {
        name: "Creating Small Multiples"
      },
      {
        name: "Canvas Rendering"
      },
      {
        name: "Creating Sparklines",
        url: "guides-sparklines",
        component: CreateSparklines
      },
      {
        name: "Using Sketchy/Painty/Patterns"
      },
      {
        name: "Using Foreground/Background Graphics"
      },
      {
        name: "Accessibility"
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
        name: "Candlestick Chart"
      },
      {
        name: "Dual-Axes Chart"
      },
      {
        name: "Homerun Map"
      },
      {
        name: "Canvas Interaction"
      },
      {
        name: "OrdinalFrame",
        className: "sub-header"
      },
      {
        name: "Waterfall Chart",
        url: "waterfall-chart",
        component: WaterfallChart
      },
      {
        name: "Marimekko Chart",
        url: "marimekko-chart",
        component: MarimekkoChart
      },
      {
        name: "Swarm Plot"
      },
      {
        name: "Ridgeline Plot"
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
      }
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
        component: APIXYFrame
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
          filename: "responsiveframe"
        }
      },
      {
        name: "SparkFrame",
        url: "sparkFrame",
        component: MarkdownPage,
        props: {
          filename: "sparkframe"
        }
      },
      { name: "separator" },

      {
        name: "FacetController",
        url: "facetcontroller"
      },
      {
        name: "Advanced Sub-Components",
        className: "sub-header"
      },
      {
        name: "Mark",
        url: "mark"
      },
      {
        name: "DividedLine",
        url: "dividedline"
      },
      {
        name: "Axis",
        url: "axis"
      },
      {
        name: "Legend",
        url: "legend"
      }
    ]
  }
]

export default function({ hash }) {
  const view = hash.split(/#|\//g).filter(d => d)

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
