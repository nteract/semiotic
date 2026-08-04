"use client"

import { useCallback } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import {
  emitClickObservations,
  emitHoverObservations,
  type SemanticClickBehavior,
  type SemanticHoverBehavior,
  type SemanticInteractionContext
} from "../charts/shared/semanticInteractions"
import type { OnObservationCallback } from "../store/ObservationStore"

interface HoverLike {
  data?: Datum | null
  x?: number
  y?: number
}

interface SemanticFrameInteractionOptions<Hover extends HoverLike> {
  customHoverBehavior?: SemanticHoverBehavior<Hover>
  customClickBehavior?: SemanticClickBehavior<Hover>
  onObservation?: OnObservationCallback
  chartId?: string
  chartType: string
}

/**
 * Add semantic observations around the legacy Stream Frame callbacks.
 *
 * Returns `undefined` for hover/click when neither a user callback nor
 * `onObservation` is present. Frames historically treated any truthy
 * `customHoverBehavior` as “selection may have changed” and marked the
 * scene dirty — which re-ran `computeScene` (and intro/data transitions)
 * on every pointermove. Observation emission alone does not change the
 * retained scene, so an always-present wrapper is the wrong signal.
 */
export function useSemanticFrameInteractions<Hover extends HoverLike>({
  customHoverBehavior: customHoverBehaviorProp,
  customClickBehavior: customClickBehaviorProp,
  onObservation,
  chartId,
  chartType
}: SemanticFrameInteractionOptions<Hover>) {
  const needsHover = Boolean(customHoverBehaviorProp || onObservation)
  const needsClick = Boolean(customClickBehaviorProp || onObservation)

  const customHoverBehavior = useCallback((
    hover: Hover | null,
    context?: SemanticInteractionContext
  ) => {
    customHoverBehaviorProp?.(hover, context)
    emitHoverObservations({
      onObservation,
      datum: hover ? ((hover.data || hover) as Datum) : null,
      x: hover?.x,
      y: hover?.y,
      chartType,
      chartId,
      context
    })
  }, [chartId, chartType, customHoverBehaviorProp, onObservation])

  const customClickBehavior = useCallback((
    hover: Hover | null,
    context?: SemanticInteractionContext
  ) => {
    customClickBehaviorProp?.(hover, context)
    emitClickObservations({
      onObservation,
      datum: hover ? ((hover.data || hover) as Datum) : null,
      x: hover?.x,
      y: hover?.y,
      chartType,
      chartId,
      context
    })
  }, [chartId, chartType, customClickBehaviorProp, onObservation])

  return {
    customHoverBehavior: needsHover ? customHoverBehavior : undefined,
    customClickBehavior: needsClick ? customClickBehavior : undefined,
    hasClickBehavior: needsClick
  }
}
