import React from "react"
import { hydrateRoot } from "react-dom/client"
import { StreamGeoFrame } from "../../dist/geo.module.min.js"
import { seamProps, routeProps } from "./seamProps"

const panel = document.getElementById("frame")!
const projection =
  panel.dataset.projection === "equalEarth" ? "equalEarth" : "equirectangular"
const view = panel.dataset.view
const frame = (width: number) => (
  <StreamGeoFrame
    {...(view === "arc" || view === "cartogram" || view === "chord"
      ? routeProps(view, width)
      : seamProps(projection, width))}
    {...(view === "pan" && {
      zoomable: true,
      onZoom: ({ zoom, projection }) => {
        panel.dataset.camera = JSON.stringify([zoom, ...projection.translate()])
      }
    })}
  />
)
document.querySelector("button")!.onclick = () => {
  const root = hydrateRoot(panel, frame(520), {
    onRecoverableError: (error) => {
      throw error
    }
  })
  document.querySelector("button")!.onclick = () => root.render(frame(410))
}
