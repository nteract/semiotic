import * as React from "react"
import { HashRouter, Routes, Route } from "react-router-dom"
import Home from "./Home"
import Documentation from "./Documentation"
import LayoutFooter from "./layout/Footer"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import theme from "./theme.js"
import "./flexboxgrid.css"
import "./prism.css"
import "./index.css"
import ResponsiveXYExample from "./responsive/ResponsiveXYExample"

const gh = "nteract/semiotic"
const basename = process.env.PUBLIC_URL

const muiTheme = createMuiTheme(theme)

const Docs = () => {
  return (
    <MuiThemeProvider theme={muiTheme}>
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
    </MuiThemeProvider>
  )
}

export default Docs
