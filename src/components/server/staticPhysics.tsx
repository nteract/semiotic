import {
  PhysicsPipelineStore
} from "../stream/physics/PhysicsPipelineStore"
import {
  renderPhysicsSettledSVG
} from "../stream/physics/PhysicsSettledSVG"
import {
  buildEvidence,
  type EvidenceSink
} from "./renderEvidence"
import type { StaticPhysicsFrameProps } from "./staticSVGChrome"

export function renderPhysicsFrame(props: StaticPhysicsFrameProps, sink?: EvidenceSink): string {
  const size = props.size ?? [props.width ?? 600, props.height ?? 400]
  const store = new PhysicsPipelineStore(props.config)
  if (Array.isArray(props.initialSpawns) && props.initialSpawns.length > 0) {
    store.enqueue(
      props.initialSpawns.map((spawn) => ({ ...spawn, spawnAt: undefined }))
    )
  }
  const result = renderPhysicsSettledSVG(store, {
    ...props,
    width: size[0],
    height: size[1],
    idPrefix: props.idPrefix ?? props._idPrefix ?? "physics"
  })
  if (sink) {
    sink.evidence = buildEvidence({
      frameType: "physics",
      width: size[0],
      height: size[1],
      marks: result.scene.sceneNodes,
      title: props.title,
      description: props.description,
      annotations: [],
      extraWarnings: result.scene.sceneNodes.length === 0 ? ["PHYSICS_EMPTY_SCENE"] : []
    })
  }
  return result.svg
}

// ── Public API ──────────────────────────────────────────────────────────
