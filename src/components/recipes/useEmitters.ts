"use client"

import { useCallback, useRef, useState } from "react"
import type { RefObject } from "react"
import {
  createSyntheticEmitter,
  type SyntheticArrival,
  type SyntheticEmitterLimits,
  type SyntheticSourceSpec
} from "./syntheticArrivals"
import type { StreamPhysicsFrameProps } from "../stream/physics/StreamPhysicsTypes"

export interface UseEmittersOptions<T> extends SyntheticEmitterLimits {
  /** Captured on mount, along with source specs and limits. Remount to restart. */
  seed?: number
  /** Live interval multiplier; does not restart source sequences. Default 1. */
  rate?: number
  /** Disabled sources retain the unconsumed part of their interval. */
  active?: Readonly<Record<string, boolean>>
  /** Freeze emission, including manual advance, without pausing existing bodies. */
  paused?: boolean
  /** Use manual advance instead of frame ticks, e.g. for reduced motion. */
  manual?: boolean
  /** Convert millisecond arrivals into chart rows (or raw frame spawns). */
  mapArrival: (arrival: SyntheticArrival) => T
  /** Composed after emission, once per observed physics boundary. */
  onTick?: StreamPhysicsFrameProps["onTick"]
}

export interface EmittersHandle {
  /** Spread into a physics HOC's frameProps, or directly onto StreamPhysicsFrame. */
  frameProps: Pick<StreamPhysicsFrameProps, "continuous" | "onTick">
  /** Push a batch using simulated milliseconds. Returns the number pushed. */
  advance: (deltaMs: number) => number
  getTime: () => number
  getEmittedCount: () => number
  isComplete: () => boolean
}

/**
 * Drive synthetic arrivals from the physics clock into a push-mode chart.
 * Omit the chart's data prop. No timer is installed; pause, visibility and
 * timeScale follow actual simulated steps. This hook uses synchronous onTick.
 *
 * Specs, seed and limits belong to one mounted run. Rate, active, paused,
 * manual and callbacks update live. Frame snapshots do not include emitter
 * state: rewinding a frame rebases the clock without replaying emitted ids.
 */
export function useEmitters<T>(
  target: RefObject<{ pushMany: (rows: T[]) => void } | null>,
  specs: readonly SyntheticSourceSpec[],
  options: UseEmittersOptions<T>
): EmittersHandle {
  const [emitter] = useState(() =>
    createSyntheticEmitter(specs, options.seed, {
      durationMs: options.durationMs,
      maxEvents: options.maxEvents
    })
  )
  const [complete, setComplete] = useState(emitter.isComplete)
  const latest = useRef({ target, options })
  latest.current = { target, options }
  const previousTime = useRef<number | undefined>(undefined)
  const advancing = useRef(false)

  const advance = useCallback(
    (deltaMs: number) => {
      const { target, options } = latest.current
      const handle = target.current
      // A push can synchronously request another zero-delta frame refresh.
      if (!handle || advancing.current) return 0
      advancing.current = true
      try {
        const arrivals = emitter.advance(deltaMs, options)
        if (arrivals.length) handle.pushMany(arrivals.map(options.mapArrival))
        if (emitter.isComplete()) setComplete(true)
        return arrivals.length
      } finally {
        advancing.current = false
      }
    },
    [emitter]
  )

  const onTick = useCallback<NonNullable<StreamPhysicsFrameProps["onTick"]>>(
    (result, controls) => {
      const previous = previousTime.current
      previousTime.current = result.elapsedSeconds
      if (
        !advancing.current &&
        previous !== undefined &&
        !latest.current.options.manual
      )
        advance(Math.max(0, result.elapsedSeconds - previous) * 1000)
      latest.current.options.onTick?.(result, controls)
    },
    [advance]
  )

  return {
    frameProps: {
      continuous: !options.paused && !options.manual && !complete,
      onTick
    },
    advance,
    getTime: emitter.getTime,
    getEmittedCount: emitter.getEmittedCount,
    isComplete: emitter.isComplete
  }
}
