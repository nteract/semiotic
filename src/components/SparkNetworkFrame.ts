"use client"
import NetworkFrame from "./NetworkFrame"
import createSparkFrame from "./SparkFrame"
import { networkFrameDefaults } from "./SparkFrame"
import { NetworkFrameProps } from "./types/networkTypes"

export const SparkNetworkFrame = /*#__PURE__*/ createSparkFrame(
  NetworkFrame,
  networkFrameDefaults,
  "SparkNetworkFrame"
) as <TNode = Record<string, any>, TEdge = Record<string, any>>(props: NetworkFrameProps<TNode, TEdge> & { sparkStyle?: object; size?: number | number[] }) => JSX.Element
