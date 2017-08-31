import React from "react";
import { mount, shallow } from "enzyme";
import Mark from "./Mark";
import injectTapEventPlugin from "react-tap-event-plugin";
injectTapEventPlugin();

describe("Mark", () => {
  it("renders without crashing", () => {
    mount(<Mark name="Test" />);
  });

  it("renders a rectangle in a g", () => {
    const wrapper = shallow(<Mark markType="rect" width="10" height="10" />);
    expect(wrapper.find("g")).to.have.length(1);
    expect(wrapper.find("rect")).to.have.length(1);
  });

  it("renders paths when it's sketchy", () => {
    const wrapper = shallow(
      <Mark markType="rect" width="10" height="10" renderMode="sketchy" />
    );
    expect(wrapper.find("g")).to.have.length(1);
    expect(wrapper.find("path")).to.have.length(2);
    expect(wrapper.find("rect")).to.have.length(0);
  });
});
