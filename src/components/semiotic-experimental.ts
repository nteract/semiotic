/**
 * Experimental entry point for temporary adapters and unstable previews.
 *
 * Anything imported from "semiotic/experimental" is intentionally outside
 * Semiotic's stable public API. Exports may be renamed, moved, or removed
 * without a deprecation window and are excluded from stable API-surface and
 * bundle-size gates.
 */

// PR-preview surface for the GoFish collaboration. The adapter is intentionally
// named `unstable-gofish-ir-adapter`; it is available here so GoFish can test
// against Semiotic's custom chart pipeline without promoting the API to the
// normal recipe catalog.
export {
  EXPERIMENTAL_GOFISH_ADAPTER_NAME,
  unstable_fromGofishIR,
} from "./recipes/gofishIR"
export type {
  GofishIRDocument as UnstableGofishIRDocument,
  GofishChartConfig as UnstableGofishChartConfig,
  GofishChartFamily as UnstableGofishChartFamily,
  FromGofishIROptions as UnstableFromGofishIROptions,
} from "./recipes/gofishIR"
export {
  registerGofishLambda as unstable_registerGofishLambda,
  unregisterGofishLambda as unstable_unregisterGofishLambda,
} from "./recipes/gofishLambdas"
export type {
  GofishLambda as UnstableGofishLambda,
} from "./recipes/gofishLambdas"
export {
  gofishIRExamples as unstable_gofishIRExamples,
  flowerIR as unstable_gofishFlowerIR,
  bottleIR as unstable_gofishBottleIR,
  polarRibbonIR as unstable_gofishPolarRibbonIR,
  titanicCircleTreemapIR as unstable_gofishTitanicCircleTreemapIR,
  pythonMemoryIR as unstable_gofishPythonMemoryIR,
  bobaIR as unstable_gofishBobaIR,
} from "./recipes/gofishIRExamples"
export type { GofishIRExample as UnstableGofishIRExample } from "./recipes/gofishIRExamples"
