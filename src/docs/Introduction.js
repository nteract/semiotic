import * as React from "react"
import { wrappedExamples } from "./example_settings/example_list"
import { Link } from "react-router-dom"

const onlyThreeWrappedExamples = wrappedExamples
  .sort(() => Math.random() - Math.random())
  .filter((d, i) => i < 3)

const intro = (
  <div>
    {onlyThreeWrappedExamples}
    <div style={{ textAlign: "center" }}>
      <Link to="examples">More Examples</Link>
    </div>
    <h2>Introduction</h2>
    <p>
      Data Visualization isn't nearly as difficult to produce as it used to be.
      With an increasing number of frameworks, libraries and out-of-the-box
      dashboarding products the ability to visualize complex datasets has become
      commonplace. Most solutions today, however, focus on enabling generic
      chart types simply visualizing a dataset versus optimizing communication
      of the data through a visual medium. Semiotic provides a different
      approach: highlight the shared structure of different charting methods to
      allow for convenient ideation and design of data visualization.
    </p>
    <p>
      We found that successful custom data visualization meant more than putting
      a few charts in front of an audience. We wanted to enable our stakeholders
      to make meaning with visualizations at a quick glance and seamlessly be
      able to dig deeper into visualizations to uncover non-obvious insights.
      Semiotic was designed to enable designers and stakeholders to test a
      variety of visualizations, while still providing control over
      interactivity and presentation of the data.{" "}
    </p>
    <div style={{ textAlign: "center" }}>
      <img
        alt="Data visualization is created in the DOM using a series of layers."
        width="400px"
        src="/semiotic/layers.png"
      />
    </div>
    <p>
      Semiotic uses a layer model for data visualization, separating interactive
      and annotation elements from graphical elements representing data. This
      allows for optimized rendering and also allows developers to focus on
      creating the different pieces of an effective chart or diagram without
      using the same mental model for interaction elements, labels or other
      related but distinct components.
    </p>
  </div>
)

export default intro
