import React from "react"
import { Link } from "react-router-dom"

export default ({ pages, selected }) => {
  let nav = []

  pages.forEach((p, i) => {
    const label =
      p.url !== undefined ? <Link to={"/" + p.url}>{p.name}</Link> : p.name
    if (p.name === "separator") {
      nav.push(<div className="separator" key={i + "br1" + p.name} />)
    } else {
      nav.push(
        <p
          key={label + "-" + nav.length}
          className={
            p.className +
            (selected === p.url || (selected === undefined && p.url === "")
              ? " selected"
              : "")
          }
        >
          {label}
        </p>
      )
    }
    if (p.children) {
      p.children.forEach((c, j) => {
        const url = c.url && `/${(p.url && p.url + "/") || ""}${c.url}`

        if (c.name === "separator") {
          nav.push(<div className="separator" key={i + "br2" + p.name + j} />)
        } else {
          nav.push(
            <p
              key={c.name + "-" + nav.length}
              className={
                (c.className || "") +
                ((url && "black") || "") +
                " sub-page" +
                ((!c.url && c.className !== "sub-header" && " dim") || "") +
                (selected === c.url ? " selected" : "")
              }
            >
              {url ? <Link to={url}>{c.name}</Link> : c.name}
            </p>
          )
        }
      })
    }
  })
  nav.push(<br key="final-break" />)

  return nav
}
