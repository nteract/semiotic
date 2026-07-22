import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { xySceneNodeToSVG } from "../SceneToSVG"
import type { Style } from "../types"
import type { FrameGraphicsProp, FrameMargin } from "../useFrame"
import type { PhysicsBodyState } from "./PhysicsKernel"
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
  backgroundGraphics?: FrameGraphicsProp
  className?: string
  foregroundGraphics?: FrameGraphicsProp
  idPrefix?: string
  margin?: Partial<FrameMargin>
  // The SSR sibling of StreamPhysicsFrame's canvas `renderBody` prop: lets a
  // chart substitute its own mark for a body's default circle/rect (e.g.
  // CrucibleChart's shadowed hexagon + inner ring for settled products).
  // Return `undefined` to fall back to the default scene-node rendering.
  renderBodySVG?: (
    body: PhysicsBodyState,
    style: Style,
    index: number
  ) => React.ReactNode | undefined
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

const DEFAULT_MARGIN: FrameMargin = { top: 0, right: 0, bottom: 0, left: 0 }

function resolveGraphics(
  graphics: FrameGraphicsProp | undefined,
  size: number[],
  margin: FrameMargin
): React.ReactNode {
  return typeof graphics === "function" ? graphics({ size, margin }) : graphics
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
    backgroundGraphics,
    className,
    foregroundGraphics,
    idPrefix = "physics",
    margin: marginProp,
    renderBodySVG,
    ...sceneOptions
  } = options
  const scene = buildPhysicsSettledScene(store, sceneOptions)
  const margin = { ...DEFAULT_MARGIN, ...marginProp }
  const size = [width, height]
  const resolvedBackground = resolveGraphics(backgroundGraphics, size, margin)
  const resolvedForeground = resolveGraphics(foregroundGraphics, size, margin)
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
      {!backgroundGraphics && background && background !== "transparent" ? (
        <rect x={0} y={0} width={width} height={height} fill={background} />
      ) : null}
      {resolvedBackground}
      <g id={`${prefix}-data-area`}>
        {scene.sceneNodes.map((node, index) => {
          const body = scene.bodies[index]
          const custom = body && renderBodySVG
            ? renderBodySVG(body, node.style ?? {}, index)
            : undefined
          return custom ?? xySceneNodeToSVG(node, index, prefix)
        })}
      </g>
      {resolvedForeground}
    </svg>
  )

  return {
    svg,
    scene,
    evidence: scene.evidence
  }
}
