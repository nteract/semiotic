import React from "react"
import Home from "./markdown/home.mdx"
import { GuidesIndex, ExamplesIndex, ApiIndex } from "./IndexPages"

export default function Home() {
  return (
    <div>
      <Home />

      <a className="heading-link" href="#guides">
        <h2 id="guides">Guides</h2>
      </a>
      <GuidesIndex />

      <a className="heading-link" href="#examples">
        <h2 id="examples">Examples</h2>
      </a>
      <ExamplesIndex />

      <a className="heading-link" href="#api">
        <h2 id="api">API</h2>
      </a>
      <ApiIndex />
    </div>
  )
}
