import { describe, expect, it } from "vitest"
import { prepareChart } from "semiotic/ai/core"
import { renderChartWithEvidence } from "semiotic/server"
import {
  buildDecisionFlow,
  caseGroups,
  decisionCases,
  decisionChartProps,
  decisionClass,
  type CaseGroup,
} from "./decision-data"

describe("superpersuasion: a map of expectations, not conversion results", () => {
  it("preserves all 24 source cases and the authored response distribution", () => {
    const flow = buildDecisionFlow()
    expect(flow.cases).toEqual(decisionCases)
    expect(flow.cases).toHaveLength(24)
    expect(new Set(flow.cases.map((testCase) => testCase.id)).size).toBe(24)
    expect(
      Object.fromEntries(
        flow.nodes
          .filter((node) => node.column === "decision")
          .map((node) => [node.id, node.count]),
      ),
    ).toEqual({
      "decision:use-semiotic": 9,
      "decision:judgment-required": 5,
      "decision:keep-existing": 3,
      "decision:no-chart": 4,
      "decision:request-evidence": 2,
      "decision:migrate-away": 1,
    })
    expect(
      Object.fromEntries(
        flow.nodes.filter((node) => node.column === "setting").map((node) => [node.id, node.count]),
      ),
    ).toEqual({
      "setting:semiotic-execution": 7,
      "setting:controlled-choice": 11,
      "setting:delayed-handoff": 6,
    })
  })

  it.each([undefined, ...(Object.keys(caseGroups) as CaseGroup[])])(
    "conserves one full case at each stage when the group is %s",
    (group) => {
      const flow = buildDecisionFlow(group)
      expect(flow.edges).toHaveLength(flow.cases.length * 2)
      for (const stage of ["context", "response"]) {
        const edges = flow.edges.filter((edge) => edge.stage === stage)
        expect(edges.reduce((sum, edge) => sum + edge.value, 0)).toBe(flow.cases.length)
        expect(new Set(edges.map((edge) => edge.caseId)).size).toBe(flow.cases.length)
      }
      for (const testCase of flow.cases) {
        const path = flow.edges.filter((edge) => edge.caseId === testCase.id)
        expect(path.map((edge) => edge.value)).toEqual([1, 1])
        expect(path[0].source).toBe(`group:${testCase.group}`)
        expect(path[0].target).toBe(path[1].source)
        expect(path[1].target).toBe(`decision:${decisionClass(testCase)}`)
        if (group) expect(testCase.group).toBe(group)
      }
      for (const node of flow.nodes) {
        const incoming = flow.edges
          .filter((edge) => edge.target === node.id)
          .reduce((sum, edge) => sum + edge.value, 0)
        const outgoing = flow.edges
          .filter((edge) => edge.source === node.id)
          .reduce((sum, edge) => sum + edge.value, 0)
        if (node.column !== "group") expect(incoming).toBe(node.count)
        if (node.column !== "decision") expect(outgoing).toBe(node.count)
      }
    },
  )

  it("retains alternatives as judgment calls and treats departure as a valid handoff", () => {
    const choice = decisionCases.find(
      (testCase) => testCase.id === "requested-capability-comparison",
    )!
    expect(choice.expect.decisions).toEqual(["evaluate-semiotic", "keep-existing"])
    expect(decisionClass(choice)).toBe("judgment-required")
    const departure = decisionCases.find(
      (testCase) => testCase.id === "handoff-new-runtime-constraint",
    )!
    expect(decisionClass(departure)).toBe("migrate-away")
    const wrongFit = buildDecisionFlow("negative-fit")
    expect(wrongFit.cases).toHaveLength(6)
    expect(
      wrongFit.nodes
        .filter((node) => node.column === "decision")
        .map((node) => node.id)
        .sort(),
    ).toEqual(["decision:keep-existing", "decision:no-chart"])
  })

  it("validates the proposal and renders each unit ribbon and proportional nodes", () => {
    const flow = buildDecisionFlow()
    const result = prepareChart(
      { component: "SankeyDiagram", props: decisionChartProps(flow) },
      { render: renderChartWithEvidence },
    )
    expect(result.ok, result.reasons.join("; ")).toBe(true)
    expect(result.evidence?.empty).toBe(false)
    const document = new DOMParser().parseFromString(result.svg!, "image/svg+xml")
    const paths = [...document.querySelectorAll("path")].filter(
      (path) => !path.closest("defs") && path.getAttribute("fill") !== "none",
    )
    expect(paths).toHaveLength(48)
    for (const path of paths) {
      expect(path.getAttribute("d")).toMatch(/^M/)
      expect(path.getAttribute("d")).not.toMatch(/NaN|Infinity/)
    }
    const nodes = [...document.querySelectorAll("rect")].filter(
      (rect) => !rect.closest("defs") && rect.getAttribute("fill") !== "none",
    )
    expect(nodes).toHaveLength(flow.nodes.length)
    const heightsPerCase = nodes.map(
      (node, index) => Number(node.getAttribute("height")) / flow.nodes[index].count,
    )
    for (const height of heightsPerCase) expect(height).toBeCloseTo(heightsPerCase[0], 5)
    expect(document.querySelector("desc")?.textContent).toContain(
      "expectations, not observed agent results",
    )
  })
})
