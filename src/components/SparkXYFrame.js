import React from "react"
import PropTypes from "prop-types"
import XYFrame from "./XYFrame"
import createSparkFrame from "./SparkFrame"
import { xyFrameDefaults } from "./SparkFrame"

export default createSparkFrame(XYFrame, xyFrameDefaults)
