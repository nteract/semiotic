import { describe, it, expect } from "vitest"
import {
  buildNavigationTree,
  flattenVisible,
  countNodes,
  type NavTreeNode
} from "./navigationTree"

const childrenRoles = (n: NavTreeNode) => (n.children ?? []).map((c) => c.role)
const childrenLabels = (n: NavTreeNode) =>
  (n.children ?? []).map((c) => c.label)

describe("buildNavigationTree — single-series XY", () => {
  const data = [
    { month: "Jan", sales: 100 },
    { month: "Feb", sales: 250 },
    { month: "Mar", sales: 180 }
  ]
  const tree = buildNavigationTree("LineChart", {
    data,
    xAccessor: "month",
    yAccessor: "sales"
  })

  it("roots at the chart with an L1–L3 label", () => {
    expect(tree.role).toBe("chart")
    expect(tree.level).toBe(1)
    expect(tree.label).toContain("A line chart of sales by month")
  })

  it("leads with axis-context nodes, then datum leaves", () => {
    const roles = childrenRoles(tree)
    expect(roles).toEqual(["axis", "axis", "datum", "datum", "datum"])
    const [xAxis, vAxis] = tree.children!
    expect(xAxis.label).toContain("X axis: month, Jan to Mar (3 points)")
    expect(vAxis.label).toContain("Value axis: sales, 100 to 250")
  })

  it("labels each leaf as 'dimension: value' and carries the datum + value", () => {
    const leaves = tree.children!.filter((c) => c.role === "datum")
    expect(leaves.map((l) => l.label)).toEqual([
      "Jan: 100",
      "Feb: 250",
      "Mar: 180"
    ])
    expect(leaves[1].value).toBe(250)
    expect(leaves[1].datum).toEqual({ month: "Feb", sales: 250 })
    expect(leaves[1].level).toBe(2)
  })
})

describe("buildNavigationTree — multi-series", () => {
  const data = [
    { month: "Jan", sales: 100, region: "West" },
    { month: "Feb", sales: 200, region: "West" },
    { month: "Jan", sales: 50, region: "East" },
    { month: "Feb", sales: 80, region: "East" }
  ]
  const tree = buildNavigationTree("LineChart", {
    data,
    xAccessor: "month",
    yAccessor: "sales",
    lineBy: "region"
  })

  it("reports distinct dimension values on the axis (not raw-array first/last)", () => {
    // x repeats across series (Jan/Feb per region) — axis must read Jan to Feb.
    const xAxis = tree.children!.find((c) => c.role === "axis")!
    expect(xAxis.label).toContain("X axis: month, Jan to Feb (4 points)")
  })

  it("creates one series branch per group, each with its own datum leaves", () => {
    const seriesNodes = tree.children!.filter((c) => c.role === "series")
    expect(seriesNodes).toHaveLength(2)
    expect(seriesNodes[0].label).toContain("Series West:")
    expect(seriesNodes[0].children!.every((c) => c.role === "datum")).toBe(true)
    expect(seriesNodes[0].children!).toHaveLength(2)
    expect(seriesNodes[0].children![0].level).toBe(3) // chart → series → datum
  })
})

describe("buildNavigationTree — part-to-whole & caps & degradation", () => {
  it("lists pie segments as leaves with no axis nodes", () => {
    const tree = buildNavigationTree("PieChart", {
      data: [
        { category: "A", value: 10 },
        { category: "B", value: 30 }
      ],
      categoryAccessor: "category",
      valueAccessor: "value"
    })
    expect(childrenRoles(tree)).toEqual(["datum", "datum"])
    expect(childrenLabels(tree)).toEqual(["A: 10", "B: 30"])
  })

  it("caps leaves per branch and notes the elision", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i * 10 }))
    const tree = buildNavigationTree(
      "LineChart",
      { data, xAccessor: "x", yAccessor: "y" },
      { maxLeaves: 3 }
    )
    const leaves = tree.children!.filter((c) => c.role === "datum")
    expect(leaves).toHaveLength(4) // 3 + elision note
    expect(leaves[3].label).toBe("…and 7 more points")
  })

  it("builds a node and link structure for network charts", () => {
    const tree = buildNavigationTree("ForceDirectedGraph", {
      nodes: [{ id: "a" }, { id: "b" }],
      edges: []
    })
    expect(tree.role).toBe("chart")
    expect(tree.children?.map((child) => child.role)).toEqual(["series"])
    expect(tree.children?.[0].children?.map((child) => child.label)).toEqual([
      "a: 0 links.",
      "b: 0 links."
    ])
    expect(tree.label).toContain("network graph")
  })

  it("degrades when data is absent (push mode)", () => {
    const tree = buildNavigationTree("LineChart", {
      xAccessor: "x",
      yAccessor: "y"
    })
    expect(tree.children).toEqual([])
  })
})

describe("buildNavigationTree — network, hierarchy, and geo families", () => {
  it("groups network nodes and exposes links as traversable leaves", () => {
    const tree = buildNavigationTree("SankeyDiagram", {
      nodes: [
        { id: "Visit", group: "entry" },
        { id: "Signup", group: "conversion" }
      ],
      edges: [{ source: "Visit", target: "Signup", value: 12 }],
      valueAccessor: "value",
      enableHover: true
    })
    expect(tree.label).toContain("Hover or focus a mark for its details.")
    expect(tree.children?.map((child) => child.label)).toEqual([
      "entry: 1 node.",
      "conversion: 1 node.",
      "Links: 1 connection."
    ])
    expect(tree.children?.[2].children?.[0].label).toBe("Visit to Signup: 12.")
    expect(tree.children?.[2].children?.[0].datum).toEqual({
      source: "Visit",
      target: "Signup",
      value: 12
    })
  })

  it("descends hierarchy branches and keeps leaf data attached", () => {
    const tree = buildNavigationTree("Treemap", {
      data: {
        name: "Total",
        children: [
          { name: "Engineering", children: [{ name: "Platform", value: 4 }] },
          { name: "Sales", value: 2 }
        ]
      },
      valueAccessor: "value",
      childrenAccessor: "children"
    })
    expect(tree.label).toBe(
      "A treemap chart with 2 leaves and 3 total descendants across 3 hierarchy levels, leaf total 6."
    )
    const rootBranch = tree.children?.[0]
    expect(rootBranch?.label).toBe(
      "Total: 2 direct children, 3 total descendants, 2 leaves, leaf total 6."
    )
    expect(rootBranch?.datum).toMatchObject({ name: "Total" })
    expect(rootBranch?.children?.[0].label).toBe(
      "Engineering: 1 direct child, 1 total descendant, 1 leaf, leaf total 4."
    )
    expect(rootBranch?.children?.[0].children?.[0]).toMatchObject({
      role: "datum",
      label: "Platform: 4.",
      datum: { name: "Platform", value: 4 }
    })
  })

  it("turns geographic areas and routes into labeled branches", () => {
    const tree = buildNavigationTree("ChoroplethMap", {
      areas: [
        { type: "Feature", properties: { name: "North", value: 8 } },
        { type: "Feature", properties: { name: "South", value: 3 } }
      ],
      valueAccessor: "value",
      linkedHover: { name: "regions", fields: ["name"] }
    })
    expect(tree.label).toContain("2 regions")
    expect(tree.label).toContain(
      "Use linked highlighting to compare related locations."
    )
    expect(tree.label).toContain(
      "Values are available for 2 of 2 regions; range 3 to 8, average 5.5, total 11."
    )
    expect(tree.children?.map((child) => child.label)).toEqual([
      "Highest values: 1 region, range 8 to 8, average 8, total 8.",
      "Lowest values: 1 region, range 3 to 3, average 3, total 3."
    ])
    expect(
      tree.children
        ?.flatMap((child) => child.children ?? [])
        .map((child) => child.label)
    ).toEqual(["North: 8, rank 1 of 2.", "South: 3, rank 2 of 2."])
  })

  it("speaks hierarchy zeros and negatives and caps omitted leaves once per branch", () => {
    const tree = buildNavigationTree(
      "TreeDiagram",
      {
        data: {
          name: "Portfolio",
          children: [
            {
              name: "Signed",
              children: [
                { name: "Zero", value: 0 },
                { name: "Loss", value: -4 },
                { name: "Gain", value: 9 }
              ]
            },
            { name: "Deferred", value: 3 }
          ]
        }
      },
      { maxLeaves: 2 }
    )
    const portfolio = tree.children?.[0]
    const signed = portfolio?.children?.[0]

    expect(tree.label).toContain("4 leaves and 5 total descendants")
    expect(tree.label).toContain("leaf total 8")
    expect(signed?.children?.map((child) => child.label)).toEqual([
      "Zero: 0.",
      "Loss: -4.",
      "1 more leaf in Signed not shown; navigation is capped at 2."
    ])
    expect(portfolio?.children?.[1].label).toBe(
      "1 more leaf in Portfolio not shown; navigation is capped at 2."
    )
  })

  it("groups choropleth regions into metric readings and isolates missing values", () => {
    const areas = [
      { type: "Feature", properties: { name: "Alpha", score: 100 } },
      { type: "Feature", properties: { name: "Beta", score: 60 } },
      { type: "Feature", properties: { name: "Gamma", score: 40 } },
      { type: "Feature", properties: { name: "Delta", score: 10 } },
      { type: "Feature", properties: { name: "Unknown", score: null } }
    ]
    const tree = buildNavigationTree("ChoroplethMap", {
      areas,
      valueAccessor: "score"
    })

    expect(tree.label).toContain(
      "Values are available for 4 of 5 regions; range 10 to 100, average 52.5, total 210."
    )
    expect(tree.children?.map((child) => child.label)).toEqual([
      "Highest values: 1 region, range 100 to 100, average 100, total 100.",
      "Middle values: 2 regions, range 40 to 60, average 50, total 100.",
      "Lowest values: 1 region, range 10 to 10, average 10, total 10.",
      "No numeric value: 1 region, no numeric values."
    ])
    expect(tree.children?.[1].children?.map((child) => child.label)).toEqual([
      "Beta: 60, rank 2 of 4.",
      "Gamma: 40, rank 3 of 4."
    ])
    expect(tree.children?.[3].children?.[0]).toMatchObject({
      label: "Unknown: no numeric value.",
      datum: areas[4]
    })
  })

  it("uses FlowMap nodes and ProportionalSymbolMap point IDs for locations", () => {
    const flows = buildNavigationTree("FlowMap", {
      nodes: [{ city: "Alpha" }, { city: "Beta" }],
      flows: [{ source: "Alpha", target: "Beta", value: 3 }],
      nodeIdAccessor: "city"
    })
    const symbols = buildNavigationTree("ProportionalSymbolMap", {
      points: [{ place: "North", value: 4 }],
      pointIdAccessor: "place",
      sizeBy: "value"
    })

    expect(flows.label).toContain("2 locations")
    expect(flows.children?.[0]).toMatchObject({
      label: "Locations: 2 marks.",
      children: expect.arrayContaining([
        expect.objectContaining({ label: "Alpha." })
      ])
    })
    expect(symbols.children?.[0]?.children?.[0]?.label).toBe("North: 4.")
  })

  it("keeps slug-colliding network group and node IDs unique", () => {
    const tree = buildNavigationTree("ForceDirectedGraph", {
      nodes: [
        { id: "A B", group: "A B" },
        { id: "A-B", group: "A-B" }
      ],
      edges: []
    })
    const expanded = new Set([
      "root",
      ...(tree.children?.map((node) => node.id) ?? [])
    ])
    const ids = flattenVisible(tree, expanded).map((node) => node.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("buildNavigationTree — annotations branch (M8)", () => {
  const data = [
    { month: "Jan", sales: 100 },
    { month: "Feb", sales: 250 },
    { month: "Mar", sales: 180 }
  ]
  const annotationBranch = (tree: NavTreeNode) =>
    tree.children?.find((c) => c.role === "annotation")

  it("adds no annotation branch when the chart has none", () => {
    const tree = buildNavigationTree("LineChart", {
      data,
      xAccessor: "month",
      yAccessor: "sales"
    })
    expect(annotationBranch(tree)).toBeUndefined()
  })

  it("appends a grouped annotations branch after the data, reusing the prose vocabulary", () => {
    const tree = buildNavigationTree("LineChart", {
      data,
      xAccessor: "month",
      yAccessor: "sales",
      annotations: [
        { type: "callout", x: "Feb", label: "Peak to investigate" },
        {
          type: "y-threshold",
          y: 200,
          label: "Target",
          provenance: { authorKind: "agent" }
        }
      ]
    })
    const branch = annotationBranch(tree)
    expect(branch?.label).toBe("Annotations: 2 marked features.")
    expect(branch?.children?.map((c) => c.label)).toEqual([
      `A callout labeled "Peak to investigate".`,
      `An AI-suggested threshold line labeled "Target".`
    ])
    // Each node carries its raw annotation for consumers (e.g. focusAnnotation).
    expect(branch?.children?.[0].datum?.label).toBe("Peak to investigate")
  })

  it("surfaces editorial status inline and skips retracted notes", () => {
    const tree = buildNavigationTree("LineChart", {
      data,
      xAccessor: "month",
      yAccessor: "sales",
      annotations: [
        {
          type: "callout",
          x: "Feb",
          label: "Contested",
          lifecycle: { status: "disputed" }
        },
        {
          type: "callout",
          x: "Mar",
          label: "Withdrawn",
          lifecycle: { status: "retracted" }
        },
        {
          type: "callout",
          x: "Jan",
          label: "Confirmed",
          lifecycle: { status: "accepted" }
        }
      ]
    })
    const labels = annotationBranch(tree)?.children?.map((c) => c.label)
    // Retracted is gone; disputed wears its status; accepted reads plainly.
    expect(labels).toEqual([
      `A callout labeled "Contested" (disputed).`,
      `A callout labeled "Confirmed".`
    ])
  })

  it("skips superseded notes in both the root description and annotation branch", () => {
    const tree = buildNavigationTree("LineChart", {
      data,
      xAccessor: "month",
      yAccessor: "sales",
      annotations: [
        { type: "callout", label: "Old", provenance: { stableId: "claim-1" } },
        {
          type: "callout",
          label: "Current",
          provenance: { stableId: "claim-2" },
          lifecycle: { supersedes: "claim-1" }
        }
      ]
    })
    expect(tree.label).toContain('"Current"')
    expect(tree.label).not.toContain('"Old"')
    expect(annotationBranch(tree)?.children?.map((c) => c.label)).toEqual([
      `A callout labeled "Current".`
    ])
  })

  it("surfaces annotations alongside network structure", () => {
    const tree = buildNavigationTree("ForceDirectedGraph", {
      nodes: [{ id: "a" }],
      edges: [],
      annotations: [{ type: "label", x: 1, y: 1, label: "Cluster" }]
    })
    expect(tree.children?.map((c) => c.role)).toEqual(["series", "annotation"])
  })
})

describe("flattenVisible & countNodes", () => {
  const data = [
    { m: "Jan", v: 1, g: "A" },
    { m: "Feb", v: 2, g: "A" },
    { m: "Jan", v: 3, g: "B" }
  ]
  const tree = buildNavigationTree("LineChart", {
    data,
    xAccessor: "m",
    yAccessor: "v",
    lineBy: "g"
  })

  it("shows only the root's children when only the root is expanded", () => {
    const visible = flattenVisible(tree, new Set([tree.id]))
    // root + 2 axis + 2 series (series children hidden)
    expect(visible).toHaveLength(5)
    expect(visible[0]).toBe(tree)
  })

  it("reveals a series' leaves once it's expanded", () => {
    const seriesA = tree.children!.find((c) => c.role === "series")!
    const visible = flattenVisible(tree, new Set([tree.id, seriesA.id]))
    expect(visible.some((n) => n.id === seriesA.children![0].id)).toBe(true)
  })

  it("counts every node in the tree", () => {
    // root + 2 axis + 2 series + (2 + 1) leaves = 8
    expect(countNodes(tree)).toBe(8)
  })
})
