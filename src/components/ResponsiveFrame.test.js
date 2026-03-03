import React from "react"
import { render, screen } from "@testing-library/react"
import { ResponsiveNetworkFrame } from "./ResponsiveNetworkFrame"
import { ResponsiveOrdinalFrame } from "./ResponsiveOrdinalFrame"

global.ResizeObserver = require("resize-observer-polyfill")

const ResponsiveFrameComponents = {
  ResponsiveNetworkFrame: ResponsiveNetworkFrame,
  ResponsiveOrdinalFrame: ResponsiveOrdinalFrame
}

describe("ResponsiveFrameComponents", () => {
  Object.keys(ResponsiveFrameComponents).forEach((componentName) => {
    const ResponsiveFrameComponent = ResponsiveFrameComponents[componentName]
    render(
      <ResponsiveFrameComponent
        dataVersion={"foo"}
        disableContext={true}
        responsiveHeight={true}
        responsiveWidth={true}
      />
    )

    it(`the ${componentName} have a responsive container classed div`, () => {
      expect(screen.findByTestId("responsive-container"))
    })
  })
})
