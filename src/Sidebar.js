import React, { Component } from "react"

const PAGES = [
  {
    url: "",
    name: "Home",
    className: "bold pointer black"
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
        name: "Bar Chart",
        url: "bar-chart"
      }
    ]
  }
]

class Sidebar extends Component {
  render() {
    let pages = []

    PAGES.forEach(p => {
      const label =
        p.url !== undefined ? <a href={"/" + p.url}>{p.name}</a> : p.name

      pages.push(<p className={p.className}>{label}</p>)

      if (p.children) {
        p.children.forEach(c => {
          const url = c.url && `/${(p.url && p.url + "/") || ""}${c.url}`
          console.log(url)
          pages.push(
            <p
              className={
                (c.className || "") + ((url && "black") || "") + " child"
              }
            >
              {url ? <a href={url}>{c.name}</a> : c.name}
            </p>
          )
        })
      }
    })

    return pages
  }
}

export default Sidebar
