import * as React from "react"
import { HashRouter, Route } from "react-router-dom"
import Home from "./Home"
import Documentation from "./Documentation"
import LayoutFooter from "./layout/Footer"
import { MuiThemeProvider, createMuiTheme } from "material-ui/styles"
import theme from "./theme.js"
import "./flexboxgrid.css"
import "./prism.css"
import "./index.css"
import ResponsiveXYExample from "./responsive/ResponsiveXYExample"

const gh = "emeeks/semiotic"
const basename = process.env.REACT_APP_GH_PAGES_PATH
  ? `/${process.env.REACT_APP_GH_PAGES_PATH}`
  : ""

const muiTheme = createMuiTheme(theme)

const Docs = () => {
  return (
    <MuiThemeProvider theme={muiTheme}>
      <HashRouter basename={basename}>
        <div className="App">
          <Route
            exact
            pattern="/"
            render={({ location }) => {
              if (location.pathname === "/") {
                return (
                  <div>
                    <Documentation AdditionalContent={Home} />
                  </div>
                )
              }
              return null
            }}
          />
          <Route path="/responsivexy/" component={ResponsiveXYExample} />
          <Route path="/:component" component={Documentation} />
          <LayoutFooter gh={gh} />
        </div>
      </HashRouter>
    </MuiThemeProvider>
  )
}

export default Docs
