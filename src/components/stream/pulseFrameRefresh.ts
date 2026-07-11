/** Minimal surface shared by stream frames for idle pulse repainting. */
export interface PulseRefreshStore {
  lastCustomLayoutFailure?: { preservedLastGoodScene?: boolean } | null
  hasActivePulsesAt(now: number): boolean
  refreshPulse(now: number): boolean
}

export interface IdlePulseRefresh {
  /** Whether the data canvas needs a style-only repaint this frame. */
  changed: boolean
  /** Keep one subsequent frame so an expired glow can be cleared. */
  pending: boolean
}

/**
 * Advance pulse styling without triggering a layout rebuild. A failed custom
 * layout deliberately retains its last good scene, which must remain
 * immutable until the layout owner recovers.
 */
export function refreshIdlePulse(
  store: PulseRefreshStore,
  now: number,
  sceneRecomputed: boolean,
  pendingRef: { current: boolean }
): IdlePulseRefresh {
  const wasPending = pendingRef.current
  const preservesLastGoodScene = store.lastCustomLayoutFailure?.preservedLastGoodScene === true
  const pending = !preservesLastGoodScene && store.hasActivePulsesAt(now)
  const changed =
    !sceneRecomputed && !preservesLastGoodScene && (pending || wasPending)
      ? store.refreshPulse(now)
      : false
  pendingRef.current = pending
  return { changed, pending }
}
