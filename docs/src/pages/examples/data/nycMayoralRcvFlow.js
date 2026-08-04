/**
 * Certified NYC Democratic mayoral-primary ranked-choice totals, 2021.
 *
 * Source: NYC Board of Elections, Official Ranked Choice Rounds,
 * contest 024306 (certified July 20, 2021).
 * https://vote.nyc/sites/default/files/pdf/election_results/2021/20210622Primary%20Election/rcv/024306_1.html
 *
 * The Board reports one combined transfer for candidates eliminated together,
 * so McGuire, Morales, and Stringer remain one auditable pool here. No
 * candidate-level destination split is inferred inside that joint pool.
 */

export const NYC_RCV_SOURCE = Object.freeze({
  label: "NYC Board of Elections — Official Ranked Choice Rounds",
  href: "https://vote.nyc/sites/default/files/pdf/election_results/2021/20210622Primary%20Election/rcv/024306_1.html",
  certified: "July 20, 2021",
})

export const NYC_RCV_COLORS = Object.freeze({
  baseline: "#76808d",
  adams: "#f2b544",
  garcia: "#36b7a6",
  wiley: "#a778d5",
  yang: "#58a6d8",
  field: "#e87959",
  inactive: "#697386",
})

export const ROUND_FIVE_TALLY = Object.freeze([
  { id: "ADAMS", label: "Eric Adams", category: "adams", votes: 295798 },
  { id: "WILEY", label: "Maya Wiley", category: "wiley", votes: 209108 },
  { id: "GARCIA", label: "Kathryn Garcia", category: "garcia", votes: 191876 },
  { id: "YANG", label: "Andrew Yang", category: "yang", votes: 121597 },
  {
    id: "JOINT_FIELD",
    label: "McGuire + Morales + Stringer",
    category: "field",
    votes: 115590,
  },
  { id: "INACTIVE", label: "Inactive ballots", category: "inactive", votes: 8062 },
])

export const TRANSFER_POOLS = Object.freeze([
  {
    id: "field",
    label: "Joint elimination",
    shortLabel: "Field of three",
    source: "JOINT_FIELD",
    roundFrom: 5,
    roundTo: 6,
    sourceTotal: 115590,
    startTime: 4.85,
    endTime: 5.15,
    transfers: Object.freeze([
      { target: "GARCIA", value: 31758 },
      { target: "WILEY", value: 30066 },
      { target: "ADAMS", value: 21294 },
      { target: "INACTIVE", value: 18383 },
      { target: "YANG", value: 14089 },
    ]),
  },
  {
    id: "yang",
    label: "Andrew Yang eliminated",
    shortLabel: "Yang",
    source: "YANG",
    roundFrom: 6,
    roundTo: 7,
    sourceTotal: 135686,
    startTime: 5.85,
    endTime: 6.15,
    transfers: Object.freeze([
      { target: "GARCIA", value: 43298 },
      { target: "INACTIVE", value: 39269 },
      { target: "ADAMS", value: 37565 },
      { target: "WILEY", value: 15554 },
    ]),
  },
  {
    id: "wiley",
    label: "Maya Wiley eliminated",
    shortLabel: "Wiley",
    source: "WILEY",
    roundFrom: 7,
    roundTo: 8,
    sourceTotal: 254728,
    startTime: 6.85,
    endTime: 7.15,
    transfers: Object.freeze([
      { target: "GARCIA", value: 130384 },
      { target: "INACTIVE", value: 74488 },
      { target: "ADAMS", value: 49856 },
    ]),
  },
])

const NODE_END = Object.freeze({
  ROUND_FIVE_TALLY: 4.05,
  JOINT_FIELD: 4.85,
  YANG: 5.85,
  WILEY: 6.85,
  ADAMS: 7.55,
  GARCIA: 7.55,
  INACTIVE: 7.55,
})

const NODE_DESCRIPTIONS = Object.freeze({
  ROUND_FIVE_TALLY: "All active and already-inactive ballots entering the fifth certified count.",
  ADAMS: "The leading tally. It gains ballots in every remaining transfer and finishes first.",
  GARCIA: "The third-place Round 5 tally. It gains more than Adams from every late transfer pool.",
  WILEY: "The second-place Round 5 tally, redistributed after Round 7.",
  YANG: "The fourth-place Round 5 tally, redistributed after Round 6.",
  JOINT_FIELD: "Raymond McGuire, Dianne Morales, and Scott Stringer, eliminated together after Round 5.",
  INACTIVE: "Ballots with no continuing valid ranked choice in the remaining field.",
})

export const NYC_RCV_PROCESS_NODES = Object.freeze([
  {
    id: "ROUND_FIVE_TALLY",
    label: "Round 5 tally",
    category: "baseline",
    xExtent: [4, NODE_END.ROUND_FIVE_TALLY],
    description: NODE_DESCRIPTIONS.ROUND_FIVE_TALLY,
  },
  ...ROUND_FIVE_TALLY.map((row) => ({
    id: row.id,
    label: row.label,
    category: row.category,
    xExtent: [4.25, NODE_END[row.id]],
    description: NODE_DESCRIPTIONS[row.id],
  })),
])

const baselineEdges = ROUND_FIVE_TALLY.map((row) => ({
  id: `round-5-${row.id.toLowerCase()}`,
  source: "ROUND_FIVE_TALLY",
  target: row.id,
  value: row.votes,
  startTime: 4.05,
  endTime: 4.25,
  kind: "opening-tally",
  roundFrom: 4,
  roundTo: 5,
  sourceLabel: "Round 5 tally",
  targetLabel: row.label,
}))

const transferEdges = TRANSFER_POOLS.flatMap((pool) =>
  pool.transfers.map((transfer) => {
    const target = ROUND_FIVE_TALLY.find((row) => row.id === transfer.target)
    return {
      id: `${pool.id}-${transfer.target.toLowerCase()}`,
      source: pool.source,
      target: transfer.target,
      value: transfer.value,
      startTime: pool.startTime,
      endTime: pool.endTime,
      kind: "transfer",
      poolId: pool.id,
      poolLabel: pool.label,
      roundFrom: pool.roundFrom,
      roundTo: pool.roundTo,
      sourceLabel: ROUND_FIVE_TALLY.find((row) => row.id === pool.source)?.label,
      targetLabel: target?.label,
      poolTotal: pool.sourceTotal,
      share: transfer.value / pool.sourceTotal,
    }
  }),
)

export const NYC_RCV_PROCESS_EDGES = Object.freeze([...baselineEdges, ...transferEdges])

export const NYC_RCV_DOMAIN = Object.freeze([4, 7.6])

export const NYC_RCV_AXIS_TICKS = Object.freeze([
  { date: 4.25, label: "Round 5" },
  { date: 5.15, label: "Round 6" },
  { date: 6.15, label: "Round 7" },
  { date: 7.15, label: "Final" },
])

const tallyById = Object.fromEntries(ROUND_FIVE_TALLY.map((row) => [row.id, row.votes]))
const receivedBy = (target) => TRANSFER_POOLS.reduce(
  (sum, pool) => sum + (pool.transfers.find((row) => row.target === target)?.value ?? 0),
  0,
)

const countedBallots = ROUND_FIVE_TALLY.reduce((sum, row) => sum + row.votes, 0)
const roundFiveGap = tallyById.ADAMS - tallyById.GARCIA
const finalAdams = tallyById.ADAMS + receivedBy("ADAMS")
const finalGarcia = tallyById.GARCIA + receivedBy("GARCIA")
const finalInactive = tallyById.INACTIVE + receivedBy("INACTIVE")
const adamsLateGain = receivedBy("ADAMS")
const garciaLateGain = receivedBy("GARCIA")
const gapClosed = garciaLateGain - adamsLateGain

export const NYC_RCV_METRICS = Object.freeze({
  countedBallots,
  roundFiveGap,
  finalAdams,
  finalGarcia,
  finalInactive,
  adamsLateGain,
  garciaLateGain,
  gapClosed,
  finalGap: finalAdams - finalGarcia,
  gapClosedShare: gapClosed / roundFiveGap,
  inactiveShare: finalInactive / countedBallots,
})

let runningAdams = tallyById.ADAMS
let runningGarcia = tallyById.GARCIA

export const TRANSFER_ANALYSIS = Object.freeze(
  TRANSFER_POOLS.map((pool) => {
    const adamsGain = pool.transfers.find((row) => row.target === "ADAMS")?.value ?? 0
    const garciaGain = pool.transfers.find((row) => row.target === "GARCIA")?.value ?? 0
    const inactiveGain = pool.transfers.find((row) => row.target === "INACTIVE")?.value ?? 0
    const gapBefore = runningAdams - runningGarcia
    runningAdams += adamsGain
    runningGarcia += garciaGain

    return Object.freeze({
      ...pool,
      adamsGain,
      garciaGain,
      inactiveGain,
      gapBefore,
      gapAfter: runningAdams - runningGarcia,
      netClosing: garciaGain - adamsGain,
    })
  }),
)

export function formatVotes(value) {
  return new Intl.NumberFormat("en-US").format(value)
}

export function transferPoolById(id) {
  return TRANSFER_POOLS.find((pool) => pool.id === id) ?? TRANSFER_POOLS[0]
}

export function candidateLabel(id) {
  return ROUND_FIVE_TALLY.find((row) => row.id === id)?.label ?? id
}
