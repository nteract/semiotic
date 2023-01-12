import React from "react"
import { render, screen } from "@testing-library/react"
import { desaturationLayer } from "./baseRules"

const size = [400, 400]
const i = 0

describe("annotationRules", () => {
  describe("desaturationLayer", () => {
    it("sets default fill, fillOpacity, and key when not provided", () => {
      const LightDesaturation = desaturationLayer({
        size,
        i
      })
      render(<svg>{LightDesaturation}</svg>)

      expect(screen.getByTestId("desaturation-layer")).toHaveStyle(
        "fill: white"
      )
      expect(screen.getByTestId("desaturation-layer")).toHaveStyle(
        "fillOpacity: 0.5"
      )
    })
  })
})
