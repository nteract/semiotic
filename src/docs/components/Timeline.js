import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import TimelineRaw from "./TimelineRaw";
import { answers } from "../sampledata/questions";

const components = [];

components.push({
  name: "Timeline"
});

export default class Timeline extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: TimelineRaw,
      source: `data = [
  {
    name: "George Washington",
    birth: 1732,
    start: 1789,
    end: 1797,
    death: 1799
  },
  { name: "John Adams", birth: 1735, start: 1797, end: 1801, death: 1826 },
  {
    name: "Thomas Jefferson",
    birth: 1743,
    start: 1801,
    end: 1809,
    death: 1826
  }]
  
   <ORFrame
    size={[700, 500]}
    data={data}
    rAccessor={d => [d.start, d.end]}
    oAccessor="name"
    type="timeline"
    projection="horizontal"
    oPadding={2}
    annotations={[
      {
        type: "category",
        categories: ["George Washington", "Abraham Lincoln"],
        label: "Antebellum",
        position: "left",
        offset: 80
      }
    ]}
    style={{ fill: "lightblue", stroke: "blue" }}
    axis={{ orient: "left" }}
    margin={{ left: 200, top: 20, right: 20, bottom: 50 }}
    oLabel={d => (
      <text y={2} textAnchor="end" fontSize={8}>
        {d}
      </text>
    )}
  />`
    });

    return (
      <DocumentComponent
        name="Timeline"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          Using the built-in `timeline` type, which requires rAccessor to return
          a two-part array with the first value being the start value and the
          second value being the end value.
        </p>
        <p>
          Here we see the terms of US Presidents. Notice that Grover Cleveland
          has two separate terms and any President that served for a year or
          less is shown as blank since the granularity of the data means they
          served for 0 total years.
        </p>
      </DocumentComponent>
    );
  }
}

Timeline.title = "Timeline";
