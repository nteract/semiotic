/**
 * Recipes entry point — curated layout functions for use with `CustomChart`.
 *
 * Import from "semiotic/recipes" instead of the full bundle. Recipes are
 * pure CustomLayout functions that emit standard SceneNodes; they get hit
 * testing, transitions, decay, theme cascade, and SSR for free.
 */

export { waffleLayout } from "../recipes/waffle"
export type { WaffleConfig } from "../recipes/waffle"

export { calendarLayout } from "../recipes/calendar"
export type { CalendarConfig } from "../recipes/calendar"

export { horizonLayout } from "../recipes/horizon"
export type { HorizonConfig } from "../recipes/horizon"

// Re-export the layout types so recipe authors don't need a second import.
export type {
  CustomLayout,
  LayoutContext,
  LayoutResult,
} from "./stream/customLayout"
