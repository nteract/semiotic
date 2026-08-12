/**
 * Source-level capability signals shared by the capability gate and its
 * regression tests. These checks intentionally recognize calls, not imports:
 * importing a bridge without invoking it does not expose a working ref API.
 */

export const PUSH_HANDLE_CALLEES = Object.freeze([
  "useFrameImperativeHandle",
  "useOrdinalStreaming",
  "usePhysicsHocHandle",
  "useProcessSankeyPush",
  "useRealtimeFrameHandle",
  "useImperativeHandle"
])

const pushHandleCallPattern = new RegExp(
  `\\b(?:${PUSH_HANDLE_CALLEES.join("|")})\\s*(?:<[^;()]*>)?\\s*\\(`
)

/** Return true only when a HOC source invokes a recognized push-handle bridge. */
export function sourceWiresPushHandle(source) {
  return typeof source === "string" && pushHandleCallPattern.test(source)
}
