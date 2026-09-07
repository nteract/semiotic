import { SEASON_DAYS, waterYear } from "./calendar"
import type { GuideState, ReservoirSnapshot } from "./types"

export const STORY_PATH = "/examples/reservoir-guide"
export const STORY_URL = `https://semiotic.nteract.io${STORY_PATH}`

export function defaultState(
  snapshot: Pick<ReservoirSnapshot, "editionId" | "baseline">,
): GuideState {
  return {
    version: 1,
    editionId: snapshot.editionId,
    stationId: "SHA",
    waterYear: 2025,
    comparisonYear: 2021,
    monthDay: "07-30",
    baselineId: snapshot.baseline.id,
  }
}

export function validateState(value: unknown): GuideState {
  if (!value || typeof value !== "object") throw new Error("Invalid saved selection")
  const state = value as GuideState
  if (state.version !== 1) throw new Error("Unsupported saved-selection version")
  if (
    typeof state.editionId !== "string" ||
    !/^[a-zA-Z0-9._-]{1,160}$/.test(state.editionId) ||
    typeof state.baselineId !== "string" ||
    state.baselineId.length > 160 ||
    !state.baselineId ||
    typeof state.stationId !== "string" ||
    !/^[A-Z0-9]{3}$/.test(state.stationId) ||
    ![state.waterYear, state.comparisonYear].every(
      (year) => Number.isInteger(year) && year >= 1900 && year <= 2200,
    ) ||
    !SEASON_DAYS.includes(state.monthDay)
  )
    throw new Error("Invalid reservoir, year, season date or baseline")
  return {
    version: 1,
    editionId: state.editionId,
    stationId: state.stationId,
    waterYear: state.waterYear,
    comparisonYear: state.comparisonYear,
    monthDay: state.monthDay,
    baselineId: state.baselineId,
  }
}

export function resolveState(state: GuideState, snapshot: ReservoirSnapshot) {
  if (state.editionId !== snapshot.editionId)
    return "This saved edition is unavailable. Your selection has not been replaced."
  if (state.baselineId !== snapshot.baseline.id)
    return "The saved comparison baseline is unavailable in this edition."
  if (!snapshot.reservoirs.some((item) => item.id === state.stationId))
    return "The selected reservoir is unavailable in this edition."
  const first = waterYear(snapshot.startDate)
  const last = waterYear(snapshot.endDate)
  if ([state.waterYear, state.comparisonYear].some((year) => year < first || year > last))
    return "A selected water year is unavailable in this edition. Choose compatible years or retain the old edition."
  return null
}

export function stateSearch(state: GuideState) {
  return `?guide=${encodeURIComponent(JSON.stringify(validateState(state)))}`
}

export function readStateSearch(
  search: string,
  snapshot: Pick<ReservoirSnapshot, "editionId" | "baseline">,
) {
  const value = new URLSearchParams(search).get("guide")
  if (!value) return defaultState(snapshot)
  if (value.length > 3000) throw new Error("Saved selection is too large")
  return validateState(JSON.parse(value))
}
