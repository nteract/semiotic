/**
 * Realtime React-only exports.
 *
 * Hooks and runtime-facing adapters that are not safe for pure rendering
 * surfaces and are meant for component-driven consumers.
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

