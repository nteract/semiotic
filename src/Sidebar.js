import React from "react"

export default ({ pages, selected }) => {
  let nav = []

  pages.forEach(p => {
    const label =
      p.url !== undefined ? <a href={"#" + p.url}>{p.name}</a> : p.name
    if (p.name === "separator") {
      nav.push(<br />)
    } else {
      nav.push(
        <p
          key={label + "-" + nav.length}
          className={p.className + (selected === p.url ? " selected" : "")}
        >
          {label}
        </p>
      )
    }
    if (p.children) {
      p.children.forEach(c => {
        const url = c.url && `#${(p.url && p.url + "/") || ""}${c.url}`

        if (c.name === "separator") {
          nav.push(<br />)
        } else {
          nav.push(
            <p
              key={c.name + "-" + nav.length}
              className={
                (c.className || "") +
                ((url && "black") || "") +
                " child" +
                (selected === c.url ? " selected" : "")
              }
            >
              {url ? <a href={url}>{c.name}</a> : c.name}
            </p>
          )
        }
      })
    }
  })

  return nav
}
