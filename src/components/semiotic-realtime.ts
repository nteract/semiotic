/**
 * Realtime entry point — for streaming/realtime canvas-first visualizations.
 * Import from "semiotic/realtime" instead of the full bundle to reduce bundle size.
 *
 * This facade combines the established `/realtime/core` chart runtime with
 * the supplemental hooks exported from `/realtime/react`. All three realtime
 * entries are client surfaces.
 */

export * from "./semiotic-realtime-core"
export * from "./semiotic-realtime-react"
