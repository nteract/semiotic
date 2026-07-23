import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { renderLegendFromConfig } from "./legendRenderer"

const legend = {
  legendGroups: [{
    label: "",
    styleFn: () => ({ fill: "#555" }),
    items: [{ label: "A" }],
  }],
  legendDistance: 20,
}

function render(position: "right" | "left" | "top" | "bottom") {
  return ReactDOMServer.renderToStaticMarkup(
    <svg>
      {renderLegendFromConfig({
        legend,
        legendPosition: position,
        totalWidth: 500,
        totalHeight: 300,
        margin: { top: 60, right: 140, bottom: 70, left: 150 },
      })}
    </svg>,
  )
}

describe("renderLegendFromConfig legendDistance", () => {
  it("places right and left legend edges at the requested plot gap", () => {
    expect(render("right")).toContain('transform="translate(380, 60)"')
    expect(render("left")).toContain('transform="translate(30, 60)"')
  })

  it("places top and bottom legend edges at the requested plot gap", () => {
    expect(render("top")).toContain('transform="translate(150, 18)"')
    expect(render("bottom")).toContain('transform="translate(150, 250)"')
  })
})

describe("renderLegendFromConfig sideGutter", () => {
  it("places right and left legends beyond plot-adjacent axis chrome", () => {
    const renderWithGutter = (legendPosition: "right" | "left") =>
      ReactDOMServer.renderToStaticMarkup(
        <svg>
          {renderLegendFromConfig({
            legend,
            legendPosition,
            legendLayout: { sideGutter: 60 },
            totalWidth: 500,
            totalHeight: 300,
            margin: { top: 60, right: 180, bottom: 70, left: 180 },
          })}
        </svg>,
      )

    expect(renderWithGutter("right")).toContain('transform="translate(400, 60)"')
    expect(renderWithGutter("left")).toContain('transform="translate(0, 60)"')
  })
})
