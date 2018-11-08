import React from "react"
import Sidebar from "./Sidebar"

import MarkdownPage from "./MarkdownPage"
import APIXYFrame from "./api/XYFrame"
import CreateALineChart from "./guides/CreateALineChart"
import CreateABarChart from "./guides/CreateABarChart"
import CreateAPieChart from "./guides/CreateAPieChart"
import WaterfallChart from "./examples/WaterfallChart"

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
        name: "Creating a Line Chart",
        url: "guides-line-chart",
        component: CreateALineChart
      },
      {
        name: "OrdinalFrame",
        className: "sub-header"
      },
      {
        name: "Creating a Bar Chart",
        url: "guides-bar-chart",
        component: CreateABarChart
      },
      {
        name: "Creating a Pie Chart",
        url: "guides-pie-chart",
        component: CreateAPieChart
      },
      {
        name: "NetworkFrame",
        className: "sub-header"
      },
      {
        name: "All Frames",
        className: "sub-header"
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
        name: "OrdinalFrame",
        className: "sub-header"
      },
      {
        name: "Waterfall Chart",
        url: "waterfall-chart",
        component: WaterfallChart
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
        name: "ResponsiveFrames",
        url: "responsiveframes",
        component: MarkdownPage,
        props: {
          filename: "responsiveframes"
        }
      },
      {
        name: "SparkFrames",
        url: "sparkFrames",
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
          <div className="margin-bottom">{View && <View {...viewProps} />}</div>
        </div>
      </div>
    </div>
  )
}
