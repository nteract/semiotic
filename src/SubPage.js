import React from "react"
import { PAGES } from "./App"
import { Link } from "react-router-dom"

export default function SubPage({ page }) {
  const match = PAGES.find(p => p.name === page)

  if (!match) return null

  const pages = match.children

  return (
    <div className="subpages">
      {pages.map((p, i) => {
        if (!p.url) {
          return (
            <div key={i} className={p.className}>
              {p.name}
            </div>
          )
        }

        return (
          <div key={i} className={p.className}>
            <Link to={`${match.url}/${p.url}`}>
              <div className="">
                <p>{p.name}</p>
                <div className="page-image">
                  {p.img && <img src={`/assets/img/${p.img}.png`} />}
                </div>
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
