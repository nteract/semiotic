/**
 * Supplemental realtime React hooks.
 *
 * The historical `/realtime/core` entry already owns Frames, HOCs, tooltips,
 * and data helpers. This slice adds hooks and runtime-facing adapters; it is
 * not the only React-bearing realtime subpath.
 */

// User-facing stream-status observer — wraps any push-API ref to expose
// a reactive enum plus last-update timestamp.
export { useStreamStatus } from "./charts/shared/useStreamStatus"
export type {
  StreamStatus,
  StreamStatusOptions,
  StreamStatusResult,
} from "./charts/shared/useStreamStatus"

// Controlled-data companion to useStreamStatus — mirrors a React array into a
// push-API chart's buffer with minimal add/update/remove/clear operations.
export { useSyncedPushData, syncPushBuffer } from "./charts/shared/useSyncedPushData"
export type {
  SyncedPushHandle,
  SyncedPushDataOptions,
  PushIdAccessor,
} from "./charts/shared/useSyncedPushData"
