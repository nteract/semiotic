import React from "react"
import Sidebar from "./Sidebar"

import MarkdownPage from "./MarkdownPage"
import VideoGames from "./examples/VideoGames"

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
    url: "examples",
    name: "Examples",
    className: "bold pointer black",
    children: [
      {
        name: "XYFrame",
        className: "sub-header"
      },
      {
        name: "Video Games",
        url: "video-games",
        component: VideoGames
      }
    ]
  }
]

export default function({ hash }) {
  const view = hash.split(/#|\//g).filter(d => d)

  let View,
    viewProps = {}

  if (view[0]) {
    const page = PAGES.find(d => d.url === view[0])
    if (page && view[1]) {
      const subpage = page.children.find(d => d.url === view[1])
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
    View = PAGES[0].component
    viewProps = PAGES[0].props
  }

  return (
    <div className="App">
      <header className="flex algin-bottom">
        <div className="logo">
          <img src={ROOT + "/img/semiotic.png"} alt="Semiotic" />
        </div>
        <div>
          <h1 className="capitalize">
            {view.map(d => d.replace(/-/g, " ")).join(" > ") || "Home"}
          </h1>
        </div>
      </header>
      <div className="flex">
        <div className="sidebar">
          <Sidebar pages={PAGES} selected={view[view.length - 1]} />
        </div>
        <div className="container">{View && <View {...viewProps} />}</div>
      </div>
    </div>
  )
}
