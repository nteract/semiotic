import * as ReactDOMServer from "react-dom/server.browser"
import type { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import {
  createPhysicsSettledSVG,
  type PhysicsSettledSVGOptions
} from "./PhysicsSettledSVGElement"

export type { PhysicsSettledSVGOptions } from "./PhysicsSettledSVGElement"

export interface PhysicsSettledSVGRender {
  svg: string
  scene: ReturnType<typeof createPhysicsSettledSVG>["scene"]
  evidence: ReturnType<typeof createPhysicsSettledSVG>["evidence"]
}

/**
 * Serializes the settled physics scene for explicit static SVG exports.
 * Interactive physics SSR uses `createPhysicsSettledSVG` directly so its
 * browser entry has no ReactDOM server dependency.
 */
export function renderPhysicsSettledSVG(
  store: PhysicsPipelineStore,
  options: PhysicsSettledSVGOptions = {}
): PhysicsSettledSVGRender {
  const { element, scene, evidence } = createPhysicsSettledSVG(store, options)
  return {
    svg: ReactDOMServer.renderToStaticMarkup(element),
    scene,
    evidence
  }
}
