import { provideXYTransitionEngine } from "../components/stream/pipelineTransitionEngine"
import { xyTransitionEngine } from "../components/stream/pipelineTransitions"

// The XY transition engine loads on demand in the browser; store-level tests
// that exercise transitions synchronously install it up front.
provideXYTransitionEngine(xyTransitionEngine)
