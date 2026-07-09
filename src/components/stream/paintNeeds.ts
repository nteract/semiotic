/**
 * Shared paint-gate helpers for Stream Frame render loops.
 *
 * Frames differ in scene types, but the decision "should this rAF clear and
 * redraw the data canvas?" is the same shape everywhere: dirty/scene rebuild,
 * transition, continuous animation, particles, live encodings.
 */

export interface DataPaintNeedsInput {
  /** Prop/layout dirty or scene rebuilt this frame. */
  dirtyOrRebuilt: boolean
  /** Transition animation is advancing. */
  transitioning: boolean
  /** Layout animation tick (orbit, force step, etc.). */
  animationTicked?: boolean
  /** Particles / continuous mode wants a frame. */
  continuous?: boolean
  /** Pulse / decay / threshold / topology-diff encodings are live. */
  liveEncoding?: boolean
  /** Family-specific force (rotation applied, zoom, etc.). */
  forced?: boolean
}

/**
 * True when the data canvas should clear and redraw this frame.
 * Interaction-only or annotation-only rAF retries should leave data alone.
 */
export function needsDataCanvasPaint(input: DataPaintNeedsInput): boolean {
  return Boolean(
    input.dirtyOrRebuilt ||
      input.transitioning ||
      input.animationTicked ||
      input.continuous ||
      input.liveEncoding ||
      input.forced
  )
}

/**
 * True when an interaction overlay canvas should clear/draw.
 * Pass `hadContentLastFrame` so a hover-end still gets one clear.
 */
export function needsInteractionCanvasPaint(
  active: boolean,
  hadContentLastFrame: boolean
): boolean {
  return active || hadContentLastFrame
}
