"use client"
import OrdinalFrame from "./OrdinalFrame"
import createSparkFrame from "./SparkFrame"
import { ordinalFrameDefaults } from "./SparkFrame"
import { OrdinalFrameProps } from "./types/ordinalTypes"

export const SparkOrdinalFrame = /*#__PURE__*/ createSparkFrame(
  OrdinalFrame,
  ordinalFrameDefaults,
  "SparkOrdinalFrame"
) as <TDatum = Record<string, any>>(props: OrdinalFrameProps<TDatum> & { sparkStyle?: object; size?: number | number[] }) => JSX.Element
