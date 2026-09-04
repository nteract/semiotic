import { calendarLayout } from "../recipes/calendar"
import { parallelCoordinatesLayout } from "../recipes/parallelCoordinates"
import { registerRecipeLayout } from "./chartRecipeRegistry"
import {
  CALENDAR_HEATMAP_LAYOUT_ID,
  PARALLEL_COORDINATES_LAYOUT_ID
} from "./builtInChartRecipes"

export function isBuiltInChartRecipeLayoutId(layoutId: string): boolean {
  return (
    layoutId === PARALLEL_COORDINATES_LAYOUT_ID ||
    layoutId === CALENDAR_HEATMAP_LAYOUT_ID
  )
}

export function registerBuiltInChartRecipeLayouts(): void {
  registerRecipeLayout(
    PARALLEL_COORDINATES_LAYOUT_ID,
    parallelCoordinatesLayout,
    { version: "1" }
  )
  registerRecipeLayout(CALENDAR_HEATMAP_LAYOUT_ID, calendarLayout, {
    version: "1"
  })
}
