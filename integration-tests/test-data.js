// Shared test data for all visual regression tests

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
  category: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C"
}))

export const barData = [
  { category: "Alpha", value: 25 },
  { category: "Beta", value: 45 },
  { category: "Gamma", value: 30 },
  { category: "Delta", value: 60 },
  { category: "Epsilon", value: 15 }
]

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

export const hierarchyData = {
  name: "root",
  children: [
    {
      name: "branch1",
      value: 30,
      children: [
        { name: "leaf1-1", value: 10 },
        { name: "leaf1-2", value: 20 }
      ]
    },
    {
      name: "branch2",
      value: 50,
      children: [
        { name: "leaf2-1", value: 25 },
        { name: "leaf2-2", value: 15 },
        { name: "leaf2-3", value: 10 }
      ]
    },
    {
      name: "branch3",
      value: 20,
      children: [{ name: "leaf3-1", value: 20 }]
    }
  ]
}

export const areaData = [
  { x: 0, y: 5, y2: 10 },
  { x: 1, y: 8, y2: 15 },
  { x: 2, y: 3, y2: 8 },
  { x: 3, y: 12, y2: 18 },
  { x: 4, y: 7, y2: 13 }
]

export const colors = ["#ac58e5", "#E0488B", "#9fd0cb", "#e0d33a", "#7566ff"]
