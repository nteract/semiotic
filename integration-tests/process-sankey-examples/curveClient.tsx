import React from "react"
import { hydrateRoot } from "react-dom/client"
import { ProcessSankey } from "../../dist/network.module.min.js"
import { curveProps } from "./curveProps"

const panel = document.getElementById("frame")!
const renderer = panel.dataset.renderer === "svg" ? "svg" : "canvas"
const chart = (width: number, curves: "straight" | "smooth") => (
  <ProcessSankey
    {...curveProps(width, renderer, curves)}
    onClick={(datum) => {
      document.querySelector("output")!.textContent = String(datum.id)
    }}
  />
)
document.getElementById("hydrate")!.onclick = () => {
  const root = hydrateRoot(panel, chart(500, "smooth"), {
    onRecoverableError: (error) => {
      throw error
    }
  })
  document.getElementById("resize")!.onclick = () =>
    root.render(chart(420, "smooth"))
  document.getElementById("straight")!.onclick = () =>
    root.render(chart(420, "straight"))
}
