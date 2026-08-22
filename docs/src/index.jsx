import React from "react"
import "./index.css"
import "../public/semiotic.css"
import App from "./App"
import { createRoot } from "react-dom/client"
import RouteLoadErrorBoundary from "./components/RouteLoadErrorBoundary"

import { BrowserRouter } from "react-router-dom"

const root = createRoot(document.getElementById("root"))

root.render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <RouteLoadErrorBoundary resetKey={window.location.pathname}>
      <App />
    </RouteLoadErrorBoundary>
  </BrowserRouter>,
)
