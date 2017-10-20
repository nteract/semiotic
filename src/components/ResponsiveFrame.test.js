import React from "react"
import { mount, shallow } from "enzyme"
import * as ResponsiveFrameComponents from "./ResponsiveFrame"
import injectTapEventPlugin from "react-tap-event-plugin"
injectTapEventPlugin()

/* 
export const ResponsiveXYFrame = createResponsiveFrame(XYFrame);
export const ResponsiveORFrame = createResponsiveFrame(ORFrame);
export const ResponsiveNetworkFrame = createResponsiveFrame(NetworkFrame);
export const ResponsiveSmartFrame = createResponsiveFrame(SmartFrame);
export const ResponsiveMinimapXYFrame = createResponsiveFrame(MinimapXYFrame);
*/

describe("ResponsiveFrameComponents", () => {
  Object.keys(ResponsiveFrameComponents).forEach(componentName => {
    const ResponsiveFrameComponent = ResponsiveFrameComponents[componentName]

    it("renders", () => {
      mount(<ResponsiveFrameComponent 
        dataVersion={"foo"} 
        disableContext={true}
        responsiveHeight={true}
        responsiveWidth={true} />)
    })
  
    it("renders a <ResizeDetector />", () => {
      const wrapper = shallow(
        <ResponsiveFrameComponent 
          dataVersion={"foo"} 
          disableContext={true}
          responsiveHeight={true}
          responsiveWidth={true} />
      )

      expect(wrapper.find("ResizeDetector").length).toEqual(1)
    })
  })
})
