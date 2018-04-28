import React from "react"
import PropTypes from "prop-types"
import NetworkFrame from "./NetworkFrame"
import createSparkFrame from "./SparkFrame"
import { networkFrameDefaults } from "./SparkFrame"

export default createSparkFrame(NetworkFrame, networkFrameDefaults)
