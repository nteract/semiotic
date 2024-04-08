import * as React from "react"
import { HashRouter, Routes, Route } from "react-router-dom"
import Home from "./Home"
import Documentation from "./Documentation"
import LayoutFooter from "./layout/Footer"
import theme from "./theme.js"
import "./flexboxgrid.css"
import "./prism.css"
import "./index.css"
import ResponsiveXYExample from "./responsive/ResponsiveXYExample"

const gh = "nteract/semiotic"
const basename = process.env.PUBLIC_URL

const Docs = () => {
  return (
    <HashRouter basename={basename}>
      <div className="App">
        <Routes>
          <Route path="/responsivexy/" element={<ResponsiveXYExample />} />
          <Route path="/:component" element={<Documentation />} />
          <Route
            path="/"
            element={<Documentation AdditionalContent={Home} />}
          />
        </Routes>
        <LayoutFooter gh={gh} />
      </div>
    </HashRouter>
  )
}

export default Docs
