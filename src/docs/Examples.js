import * as React from "react"

import { wrappedExamples } from "./example_settings/example_list"
import { Link } from "react-router-dom"

export default (
  <div>
    <h2>Examples</h2>
    <p>
      Each of the examples below uses custom settings and styles to display one
      of the three frame types in Semiotic (<Link to="xyframe">XYFrame</Link>,{" "}
      <Link to="orframe">OrdinalFrame</Link>,{" "}
      <Link to="networkframe">NetworkFrame</Link>) to present a traditional
      chart type.
    </p>
    <p>Click on a chart to see the code to reproduce it using Semiotic</p>
    {wrappedExamples}
  </div>
)
