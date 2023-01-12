/* eslint-disable */
import React from "react"
import PropTypes from "prop-types"
import { configure } from "@testing-library/react"
import Adapter from "@wojtekmaj/enzyme-adapter-react-17"

configure({ adapter: new Adapter() })
import "@testing-library/jest-dom"
