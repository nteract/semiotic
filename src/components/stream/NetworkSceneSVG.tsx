import * as React from "react"
import type { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { StreamNetworkFrameProps } from "./networkTypes"
import {
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG
} from "./SceneToSVGNetwork"
import { renderSceneWithBackend } from "./renderBackend"
import { NetworkViewGroup } from "./networkViewTransform"

/** The retained network scene has one SVG paint path for hydration and live SVG. */
export function NetworkSceneMarks({
  store,
  renderMode
}: {
  store: NetworkPipelineStore
  renderMode?: StreamNetworkFrameProps["renderMode"]
}) {
  return (
    <>
      {store.perspective.underlay.map((edge, index) =>
        networkSceneEdgeToSVG(
          edge,
          index + store.sceneEdges.length + store.sceneNodes.length
        )
      )}
      {store.sceneEdges.map((edge, index) =>
        renderSceneWithBackend({
          node: edge,
          index,
          renderMode,
          fallback: () => networkSceneEdgeToSVG(edge, index)
        })
      )}
      {store.sceneNodes.map((node, index) =>
        renderSceneWithBackend({
          node,
          index,
          renderMode,
          fallback: () => networkSceneNodeToSVG(node, index)
        })
      )}
    </>
  )
}

export function NetworkSceneSVG({
  store,
  props,
  size,
  margin,
  width,
  height
}: {
  store: NetworkPipelineStore
  props: StreamNetworkFrameProps
  size: [number, number]
  margin: { left: number; top: number }
  width: number
  height: number
}) {
  return (
    <svg
      data-network-scene=""
      role="presentation"
      xmlns="http://www.w3.org/2000/svg"
      width={size[0]}
      height={size[1]}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {props.description && <desc>{props.description}</desc>}
      <g transform={`translate(${margin.left},${margin.top})`}>
        <NetworkViewGroup
          view={props.viewTransform}
          width={width}
          height={height}
        >
          <NetworkSceneMarks store={store} renderMode={props.renderMode} />
        </NetworkViewGroup>
      </g>
    </svg>
  )
}
