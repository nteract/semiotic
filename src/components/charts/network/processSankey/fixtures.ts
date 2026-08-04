import type { ProcessSankeyEdge, ProcessSankeyNode } from "./algorithm"

type EdgeTuple = readonly [string, string, string, number, number, number]

function edgesFromTuples(rows: readonly EdgeTuple[]): ProcessSankeyEdge[] {
  return rows.map(([id, source, target, value, startTime, endTime]) => ({
    id, source, target, value, startTime, endTime,
  }))
}

/** Non-temporal topology expressed as scheduled process events, including a
 * later repartition loop. Exercises chains, merge/fan-out, and a static cycle. */
export const processLineageFixture: {
  nodes: ProcessSankeyNode[]
  edges: ProcessSankeyEdge[]
} = {
  nodes: [
    "topic-a", "topic-b", "parse-a", "parse-b", "join",
    "repartition", "aggregate", "sink-a", "sink-b",
  ].map((id) => ({ id })),
  edges: edgesFromTuples([
    ["ta-pa", "topic-a", "parse-a", 8, 0, 10],
    ["tb-pb", "topic-b", "parse-b", 5, 0, 10],
    ["pa-j", "parse-a", "join", 8, 14, 24],
    ["pb-j", "parse-b", "join", 5, 14, 24],
    ["j-r", "join", "repartition", 13, 28, 38],
    ["r-a", "repartition", "aggregate", 13, 42, 52],
    ["a-r", "aggregate", "repartition", 3, 56, 66],
    ["a-sa", "aggregate", "sink-a", 6, 70, 84],
    ["a-sb", "aggregate", "sink-b", 4, 72, 88],
  ]),
}

/** Wide hospital-flow shape with dense lanes and several long transits. */
export const processHospitalFixture: {
  nodes: ProcessSankeyNode[]
  edges: ProcessSankeyEdge[]
} = {
  nodes: [
    "ER", "Clinic", "Referral", "ICU", "Surgery", "Ward", "Imaging",
    "Lab", "Rehab", "Skilled", "Home", "Hospice",
  ].map((id) => ({ id, xExtent: [0, 100] })),
  edges: edgesFromTuples([
    ["er-icu", "ER", "ICU", 18, 5, 38],
    ["er-ward", "ER", "Ward", 12, 8, 45],
    ["er-imaging", "ER", "Imaging", 7, 10, 55],
    ["clinic-surgery", "Clinic", "Surgery", 9, 12, 42],
    ["clinic-lab", "Clinic", "Lab", 5, 15, 60],
    ["ref-ward", "Referral", "Ward", 11, 7, 48],
    ["ref-surgery", "Referral", "Surgery", 6, 18, 52],
    ["icu-rehab", "ICU", "Rehab", 13, 45, 74],
    ["icu-hospice", "ICU", "Hospice", 5, 50, 86],
    ["surgery-skilled", "Surgery", "Skilled", 10, 50, 82],
    ["surgery-home", "Surgery", "Home", 5, 54, 88],
    ["ward-home", "Ward", "Home", 17, 56, 91],
    ["imaging-ward", "Imaging", "Ward", 7, 60, 69],
    ["lab-home", "Lab", "Home", 5, 66, 94],
    ["rehab-home", "Rehab", "Home", 9, 78, 98],
    ["rehab-skilled", "Rehab", "Skilled", 4, 76, 96],
  ]),
}

/** Deterministic 60-node/200-edge stress shape for the ordering budget. */
export function processOrderingStressFixture(): {
  nodes: ProcessSankeyNode[]
  edges: ProcessSankeyEdge[]
} {
  const nodes = Array.from({ length: 60 }, (_, i) => ({
    id: `N${i}`,
    xExtent: [0, 100] as [number, number],
  }))
  const edges = Array.from({ length: 200 }, (_, i) => ({
    id: `E${i}`,
    source: `N${i % 30}`,
    target: `N${30 + ((i * 7) % 30)}`,
    value: 1 + (i % 9),
    startTime: i % 20,
    endTime: 60 + (i % 30),
  }))
  return { nodes, edges }
}
