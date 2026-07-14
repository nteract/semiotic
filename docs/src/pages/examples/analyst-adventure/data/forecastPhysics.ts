import { ANALYST_ADVENTURE_SEED } from "../storySeed1984"

export interface ForecastBodyDatum {
  id: string
  label: string
  growthClaim: number
  denominatorPresent: boolean
  freshEvidence: boolean
  lineageComplete: boolean
  kind: "forecast" | "ceo"
}

export type ForecastResultBin =
  "DEFENSIBLE" | "NEEDS CAVEAT" | "PURE EXECUTIVE WEATHER" | "MANUAL LINEAGE OVERRIDE"

export interface SettledForecastBody extends ForecastBodyDatum {
  resultBin: ForecastResultBin
  settledX: number
  settledY: number
}

function mulberry32(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function createForecastBodies(seed: number = ANALYST_ADVENTURE_SEED): ForecastBodyDatum[] {
  const random = mulberry32(seed)
  const forecasts = Array.from({ length: 30 }, (_, index) => {
    const group = Math.floor(index / 10)
    const missingGate = index % 3
    return {
      id: `forecast-${String(index + 1).padStart(2, "0")}`,
      label: `Q${(index % 4) + 1} SCENARIO ${String(index + 1).padStart(2, "0")}`,
      growthClaim: Math.round((4 + random() * 18) * 10) / 10,
      denominatorPresent: group === 0 || (group === 1 && missingGate !== 0),
      freshEvidence: group === 0 || (group === 1 && missingGate !== 1),
      lineageComplete: group === 0 || (group === 1 && missingGate !== 2),
      kind: "forecast" as const,
    }
  })

  return [
    ...forecasts,
    {
      id: "mort-zork",
      label: "M. ZORK",
      growthClaim: 0,
      kind: "ceo",
      denominatorPresent: true,
      freshEvidence: true,
      lineageComplete: false,
    },
  ]
}

export function forecastResultBin(body: ForecastBodyDatum): ForecastResultBin {
  if (body.kind === "ceo") return "MANUAL LINEAGE OVERRIDE"
  const passedGates = [body.denominatorPresent, body.freshEvidence, body.lineageComplete].filter(
    Boolean,
  ).length
  if (passedGates === 3) return "DEFENSIBLE"
  if (passedGates === 2) return "NEEDS CAVEAT"
  return "PURE EXECUTIVE WEATHER"
}

const BIN_X: Record<ForecastResultBin, number> = {
  DEFENSIBLE: 110,
  "NEEDS CAVEAT": 300,
  "PURE EXECUTIVE WEATHER": 490,
  "MANUAL LINEAGE OVERRIDE": 390,
}

export function settleForecastBodies(bodies: readonly ForecastBodyDatum[]): SettledForecastBody[] {
  const counts: Partial<Record<ForecastResultBin, number>> = {}
  return bodies.map((body) => {
    const resultBin = forecastResultBin(body)
    const indexInBin = counts[resultBin] ?? 0
    counts[resultBin] = indexInBin + 1
    return {
      ...body,
      resultBin,
      settledX:
        BIN_X[resultBin] +
        (indexInBin % 5) * 18 -
        (resultBin === "MANUAL LINEAGE OVERRIDE" ? 0 : 36),
      settledY:
        resultBin === "MANUAL LINEAGE OVERRIDE" ? 176 : 330 - Math.floor(indexInBin / 5) * 18,
    }
  })
}

export function deriveForecastFacts(bodies: readonly ForecastBodyDatum[]) {
  const settledBodies = settleForecastBodies(bodies)
  const settledCounts = settledBodies.reduce<
    Record<Exclude<ForecastResultBin, "MANUAL LINEAGE OVERRIDE">, number>
  >(
    (counts, body) => {
      if (body.resultBin !== "MANUAL LINEAGE OVERRIDE") {
        counts[body.resultBin] += 1
      }
      return counts
    },
    {
      DEFENSIBLE: 0,
      "NEEDS CAVEAT": 0,
      "PURE EXECUTIVE WEATHER": 0,
    },
  )
  const ceoBody = settledBodies.find((body) => body.id === "mort-zork")

  if (!ceoBody) {
    throw new Error("Forecast fixture must include Mort Zork")
  }

  return {
    forecastCount: bodies.filter((body) => body.kind === "forecast").length,
    ceoBody,
    settledBodies,
    settledCounts,
  }
}

export const forecastBodies = createForecastBodies()
export const forecastFacts = deriveForecastFacts(forecastBodies)
