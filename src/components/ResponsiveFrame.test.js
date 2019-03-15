// import * as React from "react"
// import { mount } from "enzyme"
import ResponsiveNetworkFrame from "./ResponsiveNetworkFrame"
import ResponsiveMinimapXYFrame from "./ResponsiveMinimapXYFrame"
import ResponsiveXYFrame from "./ResponsiveXYFrame"
import ResponsiveOrdinalFrame from "./ResponsiveOrdinalFrame"

const ResponsiveFrameComponents = {
  ResponsiveXYFrame: ResponsiveXYFrame,
  ResponsiveMinimapXYFrame: ResponsiveMinimapXYFrame,
  ResponsiveNetworkFrame: ResponsiveNetworkFrame,
  ResponsiveOrdinalFrame: ResponsiveOrdinalFrame
}

describe("ResponsiveFrameComponents", () => {
  Object.keys(ResponsiveFrameComponents).forEach(componentName => {
    // const ResponsiveFrameComponent = ResponsiveFrameComponents[componentName]
    // let mounted
    it(`${componentName} renders`, () => {
      /*
      mounted = mount(
        <ResponsiveFrameComponent
          dataVersion={"foo"}
          disableContext={true}
          responsiveHeight={true}
          responsiveWidth={true}
        />
      )
      */
    })

    it(`the ${componentName} have a responsive container classed div`, () => {
      //      expect(mounted.find("div.responsive-container").length).toEqual(1)
    })
  })
})
