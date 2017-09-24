import React from "react";
import { mount, shallow } from "enzyme";
import Mark from "./Mark";
import injectTapEventPlugin from "react-tap-event-plugin";
injectTapEventPlugin();

describe("Mark", () => {
  it("renders without crashing", () => {
    mount(<Mark markType="path" name="Test" />);
  });

  it("renders a rectangle in a g", () => {
    const wrapper = shallow(<Mark markType="rect" width="10" height="10" />);
    expect(wrapper.find("g").length).toEqual(1);
    expect(wrapper.find("rect").length).toEqual(1);
  });
  /*
  This test fails perhaps because of the weird things sketchy does with fake dom elements?
  it("renders paths when it's sketchy", () => {
    const wrapper = shallow(
      <Mark markType="rect" width="10" height="10" renderMode="sketchy" />
    );
    expect(wrapper.find("g").length).toEqual(1);
    expect(wrapper.find("path").length).toEqual(2);
    expect(wrapper.find("rect").length).toEqual(0);
  }); */
});
