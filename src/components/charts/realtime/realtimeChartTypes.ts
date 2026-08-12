import type { ReactNode } from "react"
import type { TooltipPropWithHoverCallback } from "../../Tooltip/Tooltip"
import type { HoverData } from "../../stream/types"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"

/** Accessibility metadata shared by the streaming chart wrappers. */
export interface RealtimeAccessibilityProps {
  /** Visible chart title and accessible name. */
  title?: string
  /** Concise accessible description overriding the generated frame label. */
  description?: string
  /** Screen-reader-only takeaway or interaction guidance. */
  summary?: string
  /** Expose the current streaming window as an accessible data table. @default true */
  accessibleTable?: boolean
}

/**
 * Realtime charts historically passed the full HoverData wrapper to a custom
 * tooltip callback. Keep that published callback contract while also accepting
 * the shared declarative and multi-series tooltip forms.
 */
export type RealtimeTooltipProp =
  | TooltipPropWithHoverCallback
  | ((data: HoverData) => ReactNode)

/** Typed data inference plus the broader array accepted by the 3.x API. */
export type RealtimeData<TDatum extends Datum> = TDatum[] | Datum[]

/**
 * Typed accessor authoring plus the loose string/Datum callback forms shipped
 * by the 3.x realtime wrappers.
 */
export type RealtimePointIdAccessor<TDatum extends Datum> =
  | string
  | ChartAccessor<TDatum, string>
