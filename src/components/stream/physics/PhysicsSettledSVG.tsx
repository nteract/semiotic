import * as React from "react"
import * as ReactDOMServer from "react-dom/server.edge"
import { xySceneNodeToSVG } from "../SceneToSVG"
import { withSceneMarkCursor } from "../sceneCursor"
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
  /** Explicit full-frame fill beneath custom background graphics. */
  backgroundGraphicsBackdrop?: string
  className?: string
  foregroundGraphics?: FrameGraphicsProp
  idPrefix?: string
  margin?: Partial<FrameMargin>
  /** Root SVG styles, including inherited theme custom properties for exports. */
  style?: React.CSSProperties
  // The SSR sibling of StreamPhysicsFrame's canvas `renderBody` prop: lets a
  // chart substitute its own mark for a body's default circle/rect (e.g.
  // CrucibleChart's shadowed hexagon + inner ring for settled products).
  // Return `undefined` to fall back to the default scene-node rendering.
  // `idPrefix` is the same sanitized prefix the frame uses for its own
  // `<title>`/`<desc>`/data-area ids — a custom renderer that emits `<defs>`
  // (a `<filter>`, a gradient) should namespace its own ids with it so
  // multiple settled-physics SVGs embedded in one document don't collide
  // (SVG ids are document-global, not scoped to the owning `<svg>`).
  renderBodySVG?: (
    body: PhysicsBodyState,
    style: Style,
    index: number,
    idPrefix: string
  ) => React.ReactNode | undefined
  /** Visible title/legend/annotation chrome rendered above foreground graphics. */
  renderChrome?: (scene: PhysicsSettledScene) => React.ReactNode
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
    backgroundGraphicsBackdrop,
    className,
    foregroundGraphics,
    idPrefix = "physics",
    margin: marginProp,
    style,
    renderBodySVG,
    renderChrome,
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
  const plotTransform =
    margin.left || margin.top
      ? `translate(${margin.left},${margin.top})`
      : undefined
  const translatedBackground =
    plotTransform && resolvedBackground != null ? (
      <g transform={plotTransform}>{resolvedBackground}</g>
    ) : (
      resolvedBackground
    )

  const svg = ReactDOMServer.renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "stream-physics-frame"}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={labelledBy}
      style={style}
    >
      {title && <title id={titleId}>{title}</title>}
      {description && <desc id={descId}>{description}</desc>}
      {backgroundGraphicsBackdrop &&
      backgroundGraphicsBackdrop !== "transparent" ? (
        <rect
          className="stream-frame-background__backdrop"
          x={0}
          y={0}
          width={width}
          height={height}
          fill={backgroundGraphicsBackdrop}
        />
      ) : null}
      {!backgroundGraphics && background && background !== "transparent" ? (
        <rect x={0} y={0} width={width} height={height} fill={background} />
      ) : null}
      {translatedBackground}
      <g id={`${prefix}-data-area`} transform={plotTransform}>
        {scene.sceneNodes.map((node, index) => {
          const body = scene.bodies[index]
          const custom =
            body && renderBodySVG
              ? renderBodySVG(body, node.style ?? {}, index, prefix)
              : undefined
          return custom != null
            ? withSceneMarkCursor(custom, node, index)
            : xySceneNodeToSVG(node, index, prefix)
        })}
      </g>
      {resolvedForeground}
      {renderChrome?.(scene)}
    </svg>
  )

  return {
    svg,
    scene,
    evidence: scene.evidence
  }
}
