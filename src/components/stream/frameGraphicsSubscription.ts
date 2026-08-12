"use client"

import * as React from "react"
import { useSyncExternalStore } from "react"
import type { ReactElement, ReactNode } from "react"
import type { FrameGraphicsContext, FrameGraphicsProp } from "./types"
import {
  resolveFrameGraphics,
  resolveFrameLayers,
  type ResolveFrameLayersOptions
} from "./frameGraphics"

export interface FrameGraphicsScaleTracker {
  subscribe(listener: () => void): () => void
  getSnapshot(): number
  sync(scales: unknown): void
}

/**
 * Small external-store signal for imperative scale mutations. The frame calls
 * `sync` from its already-coalesced paint callback, so React only reconciles
 * authored graphics once per displayed zoom/rotation frame—and only while a
 * function-form layer is mounted.
 */
export function createFrameGraphicsScaleTracker(
  initialScales?: unknown
): FrameGraphicsScaleTracker {
  const listeners = new Set<() => void>()
  let revision = 0
  let currentScales = initialScales

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => revision,
    sync(scales) {
      if (scales === currentScales) return
      currentScales = scales
      // Always advance the snapshot so useSyncExternalStore can detect a
      // change that lands between render and its passive subscription. Only
      // committed listeners are notified; render-time props never configure
      // this store because a concurrent render may be abandoned.
      revision += 1
      for (const listener of listeners) listener()
    }
  }
}

interface SubscribedFrameGraphicsProps<S> {
  graphics: FrameGraphicsProp<S>
  size: number[]
  margin: FrameGraphicsContext<S>["margin"]
  readScales: () => S | null
  tracker: FrameGraphicsScaleTracker
}

function SubscribedFrameGraphics<S>({
  graphics,
  size,
  margin,
  readScales,
  tracker
}: SubscribedFrameGraphicsProps<S>): ReactElement {
  useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getSnapshot
  )
  return React.createElement(
    React.Fragment,
    null,
    resolveFrameGraphics(graphics, size, margin, readScales())
  )
}

type SubscribedFrameLayerOptions<S> = ResolveFrameLayersOptions<S> & {
  tracker: FrameGraphicsScaleTracker
  readScales: () => S | null
}

/** Resolve static layers normally and subscribe only function-form layers. */
export function resolveSubscribedFrameLayers<S>({
  tracker,
  readScales,
  ...options
}: SubscribedFrameLayerOptions<S>): {
  resolvedForeground: ReactNode
  resolvedBackground: ReactNode
  themeBackground: string
  surfaceBackground: string | null
} {
  const layers = resolveFrameLayers({
    ...options,
    resolveScaleAwareGraphics: false
  })
  const subscribed = (graphics: FrameGraphicsProp<S> | undefined) =>
    typeof graphics === "function"
      ? React.createElement(SubscribedFrameGraphics<S>, {
          graphics,
          size: options.size,
          margin: options.margin,
          readScales,
          tracker
        })
      : graphics

  return {
    ...layers,
    resolvedForeground: subscribed(options.foregroundGraphics),
    resolvedBackground: subscribed(options.backgroundGraphics)
  }
}
