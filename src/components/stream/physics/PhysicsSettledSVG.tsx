import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { xySceneNodeToSVG } from "../SceneToSVG"
import type { PhysicsSettledEvidence } from "./PhysicsEvidence"
import type { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import {
  buildPhysicsSettledScene,
  type PhysicsSettledScene,
  type PhysicsSettledSceneOptions
} from "./PhysicsSettledScene"

export interface PhysicsSettledSVGOptions extends PhysicsSettledSceneOptions {
  width?: number
  height?: number
  title?: string
  description?: string
  background?: string
  className?: string
  idPrefix?: string
}

export interface PhysicsSettledSVGRender {
  svg: string
  scene: PhysicsSettledScene
  evidence: PhysicsSettledEvidence
}

function safeSvgId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_-]/g, "_")
  if (!cleaned || /^\d/.test(cleaned)) return `physics-${cleaned}`
  return cleaned
}

export function renderPhysicsSettledSVG(
  store: PhysicsPipelineStore,
  options: PhysicsSettledSVGOptions = {}
): PhysicsSettledSVGRender {
  const {
    width = 640,
    height = 360,
    title,
    description,
    background,
    className,
    idPrefix = "physics",
    ...sceneOptions
  } = options
  const scene = buildPhysicsSettledScene(store, sceneOptions)
  const prefix = safeSvgId(idPrefix)
  const titleId = title ? `${prefix}-title` : undefined
  const descId = description ? `${prefix}-desc` : undefined
  const labelledBy = [titleId, descId].filter(Boolean).join(" ") || undefined

  const svg = ReactDOMServer.renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "stream-physics-frame"}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={labelledBy}
    >
      {title && <title id={titleId}>{title}</title>}
      {description && <desc id={descId}>{description}</desc>}
      {background && background !== "transparent" ? (
        <rect x={0} y={0} width={width} height={height} fill={background} />
      ) : null}
      <g id={`${prefix}-data-area`}>
        {scene.sceneNodes.map((node, index) =>
          xySceneNodeToSVG(node, index, prefix)
        )}
      </g>
    </svg>
  )

  return {
    svg,
    scene,
    evidence: scene.evidence
  }
}
