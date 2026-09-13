import type {
  CircuitEdition,
  CircuitNodeReading,
  CircuitTotals,
  FlowCircuitProjection
} from "./flowCircuitTypes"
import tapeFixture from "../../../../scripts/network-atlas/fixtures/flow-circuit-intervals-v1.json"

const absentTotals: CircuitTotals = {
  arrivals: null,
  completions: null,
  capacity: null,
  queued: null,
  roots: null,
  attempts: null,
  retries: null,
  successes: null,
  errors: null
}
const sampleTimes = tapeFixture.atSeconds
const reading = (
  arrivals: number | null,
  completions: number | null,
  capacity: number | null = null,
  queued: number | null = null
): CircuitNodeReading => ({
  arrivals,
  completions,
  capacity,
  queued,
  status: completions === null ? "incomplete" : "exact"
})

function provenance(
  circuit: FlowCircuitProjection,
  id: string,
  modeled: boolean
) {
  return {
    id,
    synthetic: true,
    kind: modeled ? ("modeled" as const) : ("observed" as const),
    sourceRevision: circuit.atlas.provenance.sourceRevision,
    analysisRevision: circuit.atlas.analysisRevision,
    timing: "aggregate-intervals" as const,
    individualTimings: "unavailable" as const,
    evidenceRefs: [circuit.atlas.sourceGraphRef, tapeFixture.id]
  }
}

/** Conditional no-loss arithmetic upstream of the renderer, without particles. */
export function buildEtlEdition(
  circuit: FlowCircuitProjection,
  input: {
    partitionCount: number
    capacityPerPartition: number
    arrivalsPerSecond: number
    hotPartitionArrivalsPerSecond: number
  },
  hotPartitions?: number
): CircuitEdition {
  const modeled = hotPartitions !== undefined
  const hot = hotPartitions ?? 1
  if (!Number.isInteger(hot) || hot < 1 || hot >= input.partitionCount)
    throw new Error(
      "Hot-key partition count must leave at least one other partition"
    )
  const coldLoad = input.arrivalsPerSecond - input.hotPartitionArrivalsPerSecond
  const rates = Array.from({ length: input.partitionCount }, (_, index) => {
    const count = index < hot ? hot : input.partitionCount - hot
    const amount = index < hot ? input.hotPartitionArrivalsPerSecond : coldLoad
    const position = index < hot ? index : index - hot
    return Math.floor(amount / count) + (position < amount % count ? 1 : 0)
  })
  const completed = rates.map((rate) =>
    Math.min(rate, input.capacityPerPartition)
  )
  const totalCompleted = completed.reduce((sum, value) => sum + value, 0)
  const feasible = rates.every((rate) => rate <= input.capacityPerPartition)
  const id = modeled ? `etl-model-hot-${hot}` : "etl-observed"
  return {
    ...provenance(circuit, id, modeled),
    label: modeled
      ? `Modeled · ${hot} hot-key partitions`
      : "Observed · hot partition",
    unit: "records",
    assumptions: [
      "Synthetic rates held constant over the declared 60-second window.",
      "Complete no-loss ledger; initially empty FIFO queues; no cancellation, rejection or duplicate work.",
      "The seven original cold partitions divide 30,000 records/s as evenly as integral counts permit.",
      ...(modeled
        ? [
            "Hot and other keys divide evenly among their assigned partitions; service is work-conserving."
          ]
        : [])
    ],
    ...(modeled && {
      model: {
        id: "etl-uniform-redistribution-v1",
        observedEditionId: "etl-observed",
        assumptions: {
          hotPartitions: hot,
          otherPartitions: input.partitionCount - hot,
          service: "work-conserving, no loss"
        },
        guardrails: [
          {
            label: "Per-partition capacity",
            status: feasible ? ("pass" as const) : ("fail" as const),
            detail: feasible
              ? "Every partition's offered load fits installed capacity."
              : "At least one partition still accumulates work."
          },
          {
            label: "Ordering, state, duplicates and outputs",
            status: "unverified" as const,
            detail:
              "Validate key semantics and output equivalence before adopting the redistribution."
          }
        ]
      }
    }),
    entries: sampleTimes.map((at) => ({
      id: `${id}:${at}`,
      at,
      nodes: Object.fromEntries([
        ["source", reading(input.arrivalsPerSecond, input.arrivalsPerSecond)],
        ["router", reading(input.arrivalsPerSecond, input.arrivalsPerSecond)],
        ...rates.map((rate, i) => [
          `p${i + 1}`,
          reading(
            rate,
            completed[i],
            input.capacityPerPartition,
            (rate - completed[i]) * at
          )
        ]),
        ["output", reading(totalCompleted, totalCompleted)]
      ]),
      flows: circuit.atlas.source.edges.map((edge) => ({
        edgeId: edge.id,
        unit: "records" as const,
        perSecond:
          edge.id === "intake"
            ? input.arrivalsPerSecond
            : edge.id.startsWith("in:")
              ? rates[Number(edge.target.slice(1)) - 1]
              : completed[Number(edge.source.slice(1)) - 1]
      })),
      totals: {
        ...absentTotals,
        arrivals: input.arrivalsPerSecond,
        completions: totalCompleted,
        capacity: input.partitionCount * input.capacityPerPartition,
        queued: (input.arrivalsPerSecond - totalCompleted) * at
      }
    }))
  }
}

/** Explicit outcome assumptions produce a separate retry-policy edition. */
export function buildRetryEdition(
  circuit: FlowCircuitProjection,
  input: {
    rootsPerSecond: number
    attemptsPerSecond: number
    retriesPerSecond: number
  },
  retryBudget?: number
): CircuitEdition {
  const modeled = retryBudget !== undefined
  const budget = retryBudget ?? 0
  if (!Number.isInteger(budget) || budget < 0 || budget > 2)
    throw new Error("This bounded retry model admits zero, one or two retries")
  let remaining = input.rootsPerSecond * 0.2
  let retries = 0
  for (let retry = 0; retry < budget; retry++) {
    retries += remaining
    remaining *= 0.5
  }
  const attempts = modeled
    ? input.rootsPerSecond + retries
    : input.attemptsPerSecond
  const offeredRetries = modeled ? retries : input.retriesPerSecond
  const successes = modeled ? input.rootsPerSecond - remaining : null
  const id = modeled ? `retry-model-budget-${budget}` : "retry-observed"
  return {
    ...provenance(circuit, id, modeled),
    label: modeled
      ? `Modeled · retry budget ${budget}`
      : "Observed · retry incident",
    unit: "attempts",
    assumptions: [
      "Synthetic aggregate rates; individual arrivals, completions and cancellation times are unavailable.",
      "Observed offered attempts do not establish queue growth or successful outcomes.",
      "One initial inventory attempt per boundary root. The authored tape adds retry traffic at 10 and 20 seconds.",
      ...(modeled
        ? [
            "80% succeed on the first attempt; half of remaining requests succeed on each allowed retry.",
            "Attempts finish inside the interval; successful requests stop retrying; no hedging or extra arrivals."
          ]
        : [])
    ],
    ...(modeled && {
      model: {
        id: "bounded-retry-budget-v1",
        observedEditionId: "retry-observed",
        assumptions: {
          retryBudget: budget,
          firstAttemptSuccessBps: 8000,
          retrySuccessBps: 5000
        },
        guardrails: [
          {
            label: "At least 95% successful roots",
            status:
              successes! / input.rootsPerSecond >= 0.95
                ? ("pass" as const)
                : ("fail" as const),
            detail: `${successes} successful roots/s under the stated assumptions; observed success is unmeasured.`
          },
          {
            label: "Latency and cancellation behavior",
            status: "unverified" as const,
            detail:
              "No timing evidence supports an availability or queueing claim for deployment."
          }
        ]
      }
    }),
    entries: sampleTimes.map((at, index) => {
      const intervalRetries = modeled
        ? offeredRetries
        : tapeFixture.retryRates[index]
      const intervalAttempts = modeled
        ? attempts
        : input.rootsPerSecond + intervalRetries
      return {
        id: `${id}:${at}`,
        at,
        nodes: {
          boundary: reading(input.rootsPerSecond, input.rootsPerSecond),
          inventory: reading(
            intervalAttempts,
            modeled ? intervalAttempts : null
          ),
          retry: reading(intervalRetries, intervalRetries),
          outcome: reading(
            modeled ? input.rootsPerSecond : null,
            modeled ? input.rootsPerSecond : null
          )
        },
        flows: circuit.atlas.source.edges.map((edge) => ({
          edgeId: edge.id,
          unit:
            edge.id === "external" || edge.id === "outcomes"
              ? ("roots" as const)
              : ("attempts" as const),
          perSecond:
            edge.id === "external"
              ? input.rootsPerSecond
              : edge.id === "outcomes"
                ? modeled
                  ? input.rootsPerSecond
                  : null
                : intervalRetries
        })),
        totals: {
          ...absentTotals,
          roots: input.rootsPerSecond,
          attempts: intervalAttempts,
          retries: intervalRetries,
          arrivals: intervalAttempts,
          completions: modeled ? attempts : null,
          successes,
          errors: modeled ? remaining : null
        }
      }
    })
  }
}
