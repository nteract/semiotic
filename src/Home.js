import React from "react"
import MarkdownPage from "./MarkdownPage"
import SubPage from "./SubPage"

export default function Home() {
  return (
    <div>
      <MarkdownPage filename="home" />
      <a className="heading-link" href="#guides">
        <h2 id="guides">Guides</h2>
      </a>
      <SubPage page="Guides" />
      <a className="heading-link" href="#examples">
        <h2 id="examples">Examples</h2>
      </a>
      <SubPage page="Examples" />
    </div>
  )
}
