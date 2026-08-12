/**
 * Stateless/identity-insensitive runtime slice for the experimental ESM
 * facade. Context-bearing exports stay in the primary client graph and the
 * canonical physics classes/components are re-exported from `physics` by the
 * generated facade in scripts/build.mjs.
 *
 * The public source entry remains `semiotic-experimental.ts`; this internal
 * projection exists only to keep an unstable catch-all entry from fragmenting
 * every stable chart graph by another reachability combination.
 */

export {
  EXPERIMENTAL_GOFISH_ADAPTER_NAME,
  unstable_fromGofishIR
} from "../recipes/gofishIR"
export {
  gofishIRExamples as unstable_gofishIRExamples,
  flowerIR as unstable_gofishFlowerIR,
  treemapIR as unstable_gofishTreemapIR,
  bottleIR as unstable_gofishBottleIR,
  bobaIR as unstable_gofishBobaIR,
  pythonIR as unstable_gofishPythonIR
} from "../recipes/gofishIRExamples"

export {
  DEFAULT_DATA_PITFALLS_ANNOTATION_PALETTE as unstable_DEFAULT_DATA_PITFALLS_ANNOTATION_PALETTE,
  buildDataPitfallsAnnotationBridge as unstable_buildDataPitfallsAnnotationBridge,
  buildDataPitfallsBridge as unstable_buildDataPitfallsBridge,
  buildDataPitfallsNotificationBridge as unstable_buildDataPitfallsNotificationBridge,
  dataPitfallsFindingToAnnotation as unstable_dataPitfallsFindingToAnnotation,
  dataPitfallsFindingToNotification as unstable_dataPitfallsFindingToNotification,
  toDataPitfallsAnnotations as unstable_toDataPitfallsAnnotations,
  toDataPitfallsChain as unstable_toDataPitfallsChain,
  toDataPitfallsNotifications as unstable_toDataPitfallsNotifications
} from "../ai/dataPitfallsBridge"

export {
  IDID_SPEC_VERSION,
  BUILTIN_INTENT_IDS as unstable_BUILTIN_INTENT_IDS,
  validatePortableCapability as unstable_validatePortableCapability,
  validatePortableAudienceProfile as unstable_validatePortableAudienceProfile,
  validatePortableAnnotation as unstable_validatePortableAnnotation,
  bindPortableCapability as unstable_bindPortableCapability,
  toVegaLite as unstable_toVegaLite,
  toVegaLiteResult as unstable_toVegaLiteResult,
  fromVegaLiteResult as unstable_fromVegaLiteResult,
  unwrapIDIDEnrichedVegaLiteSpec as unstable_unwrapIDIDEnrichedVegaLiteSpec,
  attachIDID as unstable_attachIDID,
  readIDID as unstable_readIDID,
  attachIDIDAnnotations as unstable_attachIDIDAnnotations,
  readIDIDAnnotations as unstable_readIDIDAnnotations
} from "../data/portability"
export { fromObservablePlot as unstable_fromObservablePlot } from "../data/fromObservablePlot"
export { fromMermaid as unstable_fromMermaid } from "../data/fromMermaid"
export { fromFlintChart as unstable_fromFlintChart } from "../data/fromFlintChart"

export {
  DEFAULT_PHYSICS_CANVAS_THEME as unstable_DEFAULT_PHYSICS_CANVAS_THEME,
  physicsCanvasColorWithAlpha as unstable_physicsCanvasColorWithAlpha,
  resolvePhysicsCanvasTheme as unstable_resolvePhysicsCanvasTheme
} from "../stream/physics/PhysicsCanvasTheme"
export { buildPhysicsSettledEvidence as unstable_buildPhysicsSettledEvidence } from "../stream/physics/PhysicsEvidence"
export {
  buildPhysicsSettledScene as unstable_buildPhysicsSettledScene,
  physicsBodiesToXYSceneNodes as unstable_physicsBodiesToXYSceneNodes,
  physicsBodyToXYSceneNode as unstable_physicsBodyToXYSceneNode
} from "../stream/physics/PhysicsSettledScene"
export { renderPhysicsSettledSVG as unstable_renderPhysicsSettledSVG } from "../stream/physics/PhysicsSettledSVG"
export {
  collidersFromPhysicsAnnotations as unstable_collidersFromPhysicsAnnotations,
  resolvePhysicsBodyAnnotations as unstable_resolvePhysicsBodyAnnotations,
  summarizePhysicsAnnotations as unstable_summarizePhysicsAnnotations
} from "../stream/physics/PhysicsAnnotations"
export {
  collidersFromPlotBounds as unstable_collidersFromPlotBounds,
  collidersFromXScaleBins as unstable_collidersFromXScaleBins,
  schedulePhysicsSpawns as unstable_schedulePhysicsSpawns
} from "../stream/physics/PhysicsPipelineStore"
export {
  buildPhysicsNavigationTree as unstable_buildPhysicsNavigationTree,
  buildPhysicsSettledProjection as unstable_buildPhysicsSettledProjection,
  physicsObservationAnnouncement as unstable_physicsObservationAnnouncement
} from "../stream/physics/PhysicsAccessibility"
