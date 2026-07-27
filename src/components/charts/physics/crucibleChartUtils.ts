import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type {
  CrucibleColorBy,
  CrucibleControls
} from "./crucibleChartProps"
import type {
  CrucibleComponentState,
  CrucibleRunState
} from "./crucibleTypes"

const PALETTE = [
  "#356b63",
  "#a34b43",
  "#c08b38",
  "#3e5f83",
  "#785b7c",
  "#6e7740",
  "#8f5c3a",
  "#41717b"
]

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function numericCrucibleSeed(seed: number | string | undefined): number {
  return typeof seed === "number" && Number.isFinite(seed)
    ? seed
    : hashText(String(seed ?? "crucible"))
}

export function boundedCruciblePlaybackRate(value: unknown): number {
  const rate = Number(value)
  return Number.isFinite(rate) && rate > 0
    ? Math.max(0.05, Math.min(8, rate))
    : 1
}

export function resolveCrucibleControls(
  controls: boolean | CrucibleControls | undefined
): Required<CrucibleControls> {
  if (!controls) {
    return {
      playPause: false,
      reset: false,
      stepPhase: false,
      timeline: false,
      speed: false
    }
  }
  if (controls === true) {
    return {
      playPause: true,
      reset: true,
      stepPhase: true,
      timeline: true,
      speed: true
    }
  }
  return {
    playPause: controls.playPause ?? true,
    reset: controls.reset ?? true,
    stepPhase: controls.stepPhase ?? true,
    timeline: controls.timeline ?? true,
    speed: controls.speed ?? false
  }
}

function readColorAccessor<TDatum extends Datum>(
  accessor: ChartAccessor<TDatum, string>,
  datum: TDatum,
  index: number
): string {
  const value =
    typeof accessor === "function" ? accessor(datum, index) : datum[accessor]
  return String(value ?? "unassigned")
}

export function crucibleColorKey<TDatum extends Datum>(
  component: CrucibleComponentState<TDatum>,
  colorBy: CrucibleColorBy<TDatum>,
  index: number
): string {
  if (colorBy === "category") return component.category
  if (colorBy === "status") return component.status
  if (colorBy === "outlet") return component.outletId ?? "in chamber"
  if (colorBy === "product") return component.productIds[0] ?? "unalloyed"
  return readColorAccessor(
    colorBy as ChartAccessor<TDatum, string>,
    component.datum,
    index
  )
}

export function crucibleColorForKey(key: string): string {
  return PALETTE[hashText(key) % PALETTE.length]
}

export function crucibleStateSummary<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  amountLabel?: string
): string {
  const components = Object.keys(state.components).length
  const products = Object.keys(state.products).length
  const amount = Object.values(state.products).reduce(
    (sum, product) => sum + product.amount,
    0
  )
  const unit = amountLabel ? ` ${amountLabel}` : " amount"
  const outcome = state.outcome ? ` Outcome: ${state.outcome}.` : ""
  return `${components} source component${components === 1 ? "" : "s"}; ${products} product${products === 1 ? "" : "s"}; ${amount.toLocaleString()}${unit} in products.${outcome}`
}
