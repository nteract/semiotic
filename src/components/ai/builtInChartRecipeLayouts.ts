import { calendarLayout } from "../recipes/calendar"
import { parallelCoordinatesLayout } from "../recipes/parallelCoordinates"
import { registerRecipeLayout } from "./chartRecipeRegistry"
import {
  CALENDAR_HEATMAP_LAYOUT_ID,
  PARALLEL_COORDINATES_LAYOUT_ID
} from "./builtInChartRecipes"

export function registerBuiltInChartRecipeLayouts(): void {
  registerRecipeLayout(
    PARALLEL_COORDINATES_LAYOUT_ID,
    parallelCoordinatesLayout
  )
  registerRecipeLayout(CALENDAR_HEATMAP_LAYOUT_ID, calendarLayout)
}
