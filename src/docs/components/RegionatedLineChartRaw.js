import * as React from "react"
import { XYFrame } from "../../components"
import { regionatedLineChart } from "../example_settings/xyframe.js"
import ProcessViz from "./ProcessViz"

export default (
  <div>
    <ProcessViz frameSettings={regionatedLineChart} frameType="XYFrame" />
    <XYFrame {...regionatedLineChart} />
  </div>
)
