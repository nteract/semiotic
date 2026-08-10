"use client"

import * as React from "react"
import type { Datum } from "./charts/shared/datumTypes"
import { unwrapDatum } from "./recipes/recipeUtils"
import type { ChartObservation } from "./store/ObservationStore"
import { useChartObserver } from "./store/useObservation"

const DEFAULT_OBSERVATION_TYPES: ChartObservation["type"][] = [
  "hover",
  "hover-end",
  "focus",
  "activate",
  "click",
  "click-end",
  "selection",
  "selection-end"
]

export interface ObservationReadoutProps<TDatum extends Datum = Datum> {
  /**
   * Render the active datum. Frame and hit-test wrappers are unwrapped before
   * this function is called.
   */
  children: (datum: TDatum, observation: ChartObservation) => React.ReactNode

  /**
   * Direct observation feed from a chart's `onObservation` callback. Omit to
   * subscribe to the nearest observation store instead.
   */
  observation?: ChartObservation | null

  /** Filter store observations to one chart instance. */
  chartId?: string

  /**
   * Observation types to consume. Defaults to hover, focus, activation, click,
   * selection, and their available end events.
   */
  types?: ChartObservation["type"][]

  /** Content shown before interaction and after an end event. */
  fallback?: React.ReactNode

  /** Semantic wrapper element. @default "div" */
  as?: "div" | "p" | "output"

  /** Live-region politeness. Set to "off" to disable announcements. @default "polite" */
  live?: "off" | "polite" | "assertive"

  /** Whether assistive technology should announce the whole readout. @default true */
  atomic?: boolean

  className?: string
  style?: React.CSSProperties
}

/**
 * Inline, accessible narration for chart observations.
 *
 * Unlike `DetailsPanel`, this component does not impose panel positioning or
 * animation. It can subscribe through `LinkedCharts`, or receive the latest
 * event directly from a chart's `onObservation` callback.
 */
export function ObservationReadout<TDatum extends Datum = Datum>({
  children,
  observation: directObservation,
  chartId,
  types = DEFAULT_OBSERVATION_TYPES,
  fallback = null,
  as = "div",
  live = "polite",
  atomic = true,
  className,
  style
}: ObservationReadoutProps<TDatum>): React.ReactElement {
  const { latest } = useChartObserver({ chartId, types, limit: 1 })
  const candidate = directObservation !== undefined ? directObservation : latest
  const observation =
    candidate && types.includes(candidate.type) ? candidate : null
  const datum = observedDatum<TDatum>(observation)
  const content = datum && observation ? children(datum, observation) : fallback

  return React.createElement(
    as,
    {
      className,
      style,
      "aria-live": live,
      "aria-atomic": atomic
    },
    content
  )
}

/** Return the user datum carried by an observation, or null for end events. */
export function observedDatum<TDatum extends Datum = Datum>(
  observation: ChartObservation | null | undefined
): TDatum | null {
  if (!observation) return null
  if (observation.type === "selection") {
    return unwrapDatum<TDatum>(observation.selection.fields)
  }
  if (
    observation.type === "hover" ||
    observation.type === "click" ||
    observation.type === "focus" ||
    observation.type === "activate" ||
    observation.type === "late-data"
  ) {
    return unwrapDatum<TDatum>(observation.datum)
  }
  return null
}

ObservationReadout.displayName = "ObservationReadout"
