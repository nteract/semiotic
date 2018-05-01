import React from "react"
import PropTypes from "prop-types"
import OrdinalFrame from "./OrdinalFrame"
import createSparkFrame from "./SparkFrame"
import { ordinalFrameDefaults } from "./SparkFrame"

export default createSparkFrame(OrdinalFrame, ordinalFrameDefaults)
