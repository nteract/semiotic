import React from "react"
import "./index.css"
import "../public/semiotic.css"
import App from "./App"
import { createRoot } from "react-dom/client"
import { LocationAwareRouteLoadErrorBoundary } from "./components/RouteLoadErrorBoundary"
import { installVitePreloadRecovery } from "./preloadRecovery"

import { BrowserRouter } from "react-router-dom"

installVitePreloadRecovery()

const root = createRoot(document.getElementById("root"))

root.render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <LocationAwareRouteLoadErrorBoundary>
      <App />
    </LocationAwareRouteLoadErrorBoundary>
  </BrowserRouter>,
)
