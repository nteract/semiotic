import React from "react";
import { mount, shallow } from "enzyme";
import XYFrame from "./XYFrame";
import injectTapEventPlugin from "react-tap-event-plugin";
injectTapEventPlugin();

const somePointData = [
  { day: 1, date: "2017-01-01", value: 180 },
  { day: 2, date: "2017-02-01", value: 80 },
  { day: 3, date: "2017-03-14", value: 0 },
  { day: 4, date: "2017-06-20", value: 20 }
];

//Enzyme doesn't do well with context so disable it for now

describe("XYFrame", () => {
  it("renders points, lines, areas without crashing", () => {
    mount(
      <XYFrame
        points={somePointData}
        lines={[{ label: "points", coordinates: somePointData }]}
        areas={[{ label: "areas", coordinates: somePointData }]}
        xAccessor="day"
        yAccessor="value"
        disableContext={true}
      />
    );
  });

  it("renders a <Frame>", () => {
    const wrapper = shallow(
      <XYFrame
        points={somePointData}
        lines={[{ label: "points", coordinates: somePointData }]}
        areas={[{ label: "areas", coordinates: somePointData }]}
        xAccessor="day"
        yAccessor="value"
        disableContext={true}
      />
    );
    expect(wrapper.find("Frame").length).toEqual(1);
  });
});
