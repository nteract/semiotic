// Shared test data for all visual regression tests

// Simple seeded pseudo-random number generator for deterministic data
function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

export const lineData = [
  { x: 0, value: 10, series: "A" },
  { x: 1, value: 15, series: "A" },
  { x: 2, value: 12, series: "A" },
  { x: 3, value: 20, series: "A" },
  { x: 4, value: 18, series: "A" },
  { x: 0, value: 5, series: "B" },
  { x: 1, value: 8, series: "B" },
  { x: 2, value: 13, series: "B" },
  { x: 3, value: 10, series: "B" },
  { x: 4, value: 15, series: "B" }
]

// Use deterministic data instead of random for consistent snapshots
export const scatterData = Array.from({ length: 50 }, (_, i) => ({
  x: (i * 7 + 13) % 97 + Math.sin(i) * 5,
  y: (i * 11 + 23) % 89 + Math.cos(i) * 5,
  size: ((i * 13 + 7) % 30) + 5,
  category: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C"
}))

export const barData = [
  { category: "Alpha", value: 25 },
  { category: "Beta", value: 45 },
  { category: "Gamma", value: 30 },
  { category: "Delta", value: 60 },
  { category: "Epsilon", value: 15 }
]

export const stackedBarData = [
  { category: "A", type: "X", value: 10 },
  { category: "A", type: "Y", value: 15 },
  { category: "A", type: "Z", value: 8 },
  { category: "B", type: "X", value: 20 },
  { category: "B", type: "Y", value: 10 },
  { category: "B", type: "Z", value: 12 },
  { category: "C", type: "X", value: 15 },
  { category: "C", type: "Y", value: 25 },
  { category: "C", type: "Z", value: 5 }
]

export const groupedBarData = [
  { category: "2021", product: "Widgets", value: 30 },
  { category: "2021", product: "Gadgets", value: 20 },
  { category: "2021", product: "Gizmos", value: 15 },
  { category: "2022", product: "Widgets", value: 35 },
  { category: "2022", product: "Gadgets", value: 28 },
  { category: "2022", product: "Gizmos", value: 22 },
  { category: "2023", product: "Widgets", value: 40 },
  { category: "2023", product: "Gadgets", value: 32 },
  { category: "2023", product: "Gizmos", value: 30 }
]

// Statistical data: many observations per category for boxplot/violin/histogram/swarm
const rng = seededRandom(42)
export const statisticalData = []
const categories = ["Group A", "Group B", "Group C"]
const categoryMeans = [50, 65, 45]
const categorySDs = [12, 8, 15]
for (let c = 0; c < categories.length; c++) {
  for (let i = 0; i < 40; i++) {
    // Box-Muller transform for normal distribution from seeded random
    const u1 = rng()
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const val = categoryMeans[c] + z * categorySDs[c]
    statisticalData.push({ category: categories[c], value: Math.round(val * 10) / 10 })
  }
}

export const timelineData = [
  { task: "Design", start: 0, end: 5 },
  { task: "Development", start: 3, end: 12 },
  { task: "Testing", start: 10, end: 15 },
  { task: "Deployment", start: 14, end: 16 }
]

export const networkData = {
  nodes: [
    { id: "A", label: "Node A" },
    { id: "B", label: "Node B" },
    { id: "C", label: "Node C" },
    { id: "D", label: "Node D" },
    { id: "E", label: "Node E" }
  ],
  edges: [
    { source: "A", target: "B", weight: 5 },
    { source: "A", target: "C", weight: 3 },
    { source: "B", target: "D", weight: 7 },
    { source: "C", target: "D", weight: 2 },
    { source: "D", target: "E", weight: 4 }
  ]
}

export const chordData = [
  { source: "A", target: "B", value: 5 },
  { source: "A", target: "C", value: 3 },
  { source: "B", target: "C", value: 7 },
  { source: "B", target: "D", value: 4 },
  { source: "C", target: "D", value: 2 }
]

export const hierarchyData = {
  name: "root",
  children: [
    {
      name: "branch1",
      children: [
        { name: "leaf1-1", value: 10 },
        { name: "leaf1-2", value: 20 }
      ]
    },
    {
      name: "branch2",
      children: [
        { name: "leaf2-1", value: 25 },
        { name: "leaf2-2", value: 15 },
        { name: "leaf2-3", value: 10 }
      ]
    },
    {
      name: "branch3",
      children: [{ name: "leaf3-1", value: 20 }]
    }
  ]
}

export const areaData = [
  { x: 0, y: 5, series: "A" },
  { x: 1, y: 8, series: "A" },
  { x: 2, y: 3, series: "A" },
  { x: 3, y: 12, series: "A" },
  { x: 4, y: 7, series: "A" },
  { x: 0, y: 10, series: "B" },
  { x: 1, y: 15, series: "B" },
  { x: 2, y: 8, series: "B" },
  { x: 3, y: 18, series: "B" },
  { x: 4, y: 13, series: "B" }
]

export const colors = ["#ac58e5", "#E0488B", "#9fd0cb", "#e0d33a", "#7566ff"]
