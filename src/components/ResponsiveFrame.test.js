import React from "react"
import { mount /*, shallow*/ } from "enzyme"
import * as ResponsiveFrameComponents from "./ResponsiveFrame"

/* 
export const ResponsiveXYFrame = createResponsiveFrame(XYFrame);
export const ResponsiveOrdinalFrame = createResponsiveFrame(OrdinalFrame);
export const ResponsiveNetworkFrame = createResponsiveFrame(NetworkFrame);
export const ResponsiveSmartFrame = createResponsiveFrame(SmartFrame);
export const ResponsiveMinimapXYFrame = createResponsiveFrame(MinimapXYFrame);
*/

describe("ResponsiveFrameComponents", () => {
  Object.keys(ResponsiveFrameComponents).forEach(componentName => {
    const ResponsiveFrameComponent = ResponsiveFrameComponents[componentName]
    let mounted
    it("renders", () => {
      mounted = mount(
        <ResponsiveFrameComponent
          dataVersion={"foo"}
          disableContext={true}
          responsiveHeight={true}
          responsiveWidth={true}
        />
      )
    })

    it("the frame have a responsive container classed div", () => {
      //      const frame = shallow(<ResponsiveFrameComponent />)
      //      expect(mounted.contains(<div />)).toBe(true)
      expect(mounted.find("div.responsive-container").length).toEqual(1)
    })
    //    expect(wrapper.find("ResizeDetector").length).toEqual(1)
  })
})
