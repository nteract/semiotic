import type { SankeyDiagramProps } from "semiotic/network"
import fixtures from "../../../../../evals/adoption/fixtures.json"

export const decisionCases = fixtures.cases
export type DecisionCase = (typeof decisionCases)[number]

export const caseGroups = {
  "strong-fit": "Clear fit",
  "ambiguous-fit": "Close call",
  "negative-fit": "Wrong fit",
  recovery: "Repair",
  handoff: "Handoff",
} as const
export type CaseGroup = keyof typeof caseGroups

export const decisionSettings = {
  "semiotic-execution": "Build or repair",
  "controlled-choice": "Choose a tool",
  "delayed-handoff": "Return later",
} as const

export const decisionLabels = {
  "use-semiotic": "Use Semiotic",
  "judgment-required": "Judgment required",
  "keep-existing": "Keep current tool",
  "no-chart": "Skip the chart",
  "request-evidence": "Ask for evidence",
  "migrate-away": "Move to another tool",
  "evaluate-semiotic": "Try an isolated pilot",
} as const
export type DecisionClass = keyof typeof decisionLabels

export const decisionPalette = {
  teal: "#24766d",
  ochre: "#ba7138",
  ink: "#172e34",
  brick: "#a14d48",
  muted: "#a2b3aa",
}

export function decisionClass(testCase: DecisionCase): DecisionClass {
  const decisions = testCase.expect.decisions
  if (decisions.length > 1) return "judgment-required"
  const decision = decisions[0]
  if (!(decision in decisionLabels)) throw new Error(`Unknown decision: ${decision}`)
  return decision as DecisionClass
}

export function caseGroupLabel(group: string): string {
  if (!(group in caseGroups)) throw new Error(`Unknown case group: ${group}`)
  return caseGroups[group as CaseGroup]
}

export function settingLabel(setting: string): string {
  if (!(setting in decisionSettings)) throw new Error(`Unknown setting: ${setting}`)
  return decisionSettings[setting as keyof typeof decisionSettings]
}

export function caseTitle(testCase: DecisionCase): string {
  const words = testCase.id.replace(/^(negative|repair|handoff)-/, "").replaceAll("-", " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export interface DecisionNode {
  id: string
  label: string
  name: string
  count: number
  column: "group" | "setting" | "decision"
  tone: keyof typeof decisionPalette
}

export interface DecisionEdge {
  id: string
  source: string
  target: string
  value: number
  caseId: string
  stage: "context" | "response"
}

export interface DecisionFlowData {
  cases: DecisionCase[]
  nodes: DecisionNode[]
  edges: DecisionEdge[]
}

const groupTones: Record<CaseGroup, keyof typeof decisionPalette> = {
  "strong-fit": "teal",
  "ambiguous-fit": "ochre",
  "negative-fit": "brick",
  recovery: "teal",
  handoff: "ink",
}

const decisionTones: Record<DecisionClass, keyof typeof decisionPalette> = {
  "use-semiotic": "teal",
  "judgment-required": "ochre",
  "keep-existing": "ink",
  "no-chart": "brick",
  "request-evidence": "ochre",
  "migrate-away": "ink",
  "evaluate-semiotic": "ochre",
}

/** Each authored case has one unit at both stages, including ambiguous cases. */
export function buildDecisionFlow(group?: CaseGroup): DecisionFlowData {
  const cases = decisionCases.filter((testCase) => !group || testCase.group === group)
  const nodes = new Map<string, DecisionNode>()
  const edges: DecisionEdge[] = []

  const addNode = (
    id: string,
    name: string,
    column: DecisionNode["column"],
    tone: DecisionNode["tone"],
  ) => {
    const previous = nodes.get(id)
    const count = (previous?.count ?? 0) + 1
    nodes.set(id, { id, name, count, column, tone, label: `${name} · ${count}` })
  }

  for (const testCase of cases) {
    const decision = decisionClass(testCase)
    const groupId = `group:${testCase.group}`
    const settingId = `setting:${testCase.setting}`
    const decisionId = `decision:${decision}`
    addNode(
      groupId,
      caseGroupLabel(testCase.group),
      "group",
      groupTones[testCase.group as CaseGroup],
    )
    addNode(settingId, settingLabel(testCase.setting), "setting", "muted")
    addNode(decisionId, decisionLabels[decision], "decision", decisionTones[decision])
    edges.push(
      {
        id: `${testCase.id}:context`,
        source: groupId,
        target: settingId,
        value: 1,
        caseId: testCase.id,
        stage: "context",
      },
      {
        id: `${testCase.id}:response`,
        source: settingId,
        target: decisionId,
        value: 1,
        caseId: testCase.id,
        stage: "response",
      },
    )
  }

  return { cases, nodes: [...nodes.values()], edges }
}

export function decisionChartProps(flow: DecisionFlowData) {
  return {
    nodes: flow.nodes,
    edges: flow.edges,
    sourceAccessor: "source",
    targetAccessor: "target",
    valueAccessor: "value",
    nodeIdAccessor: "id",
    nodeLabel: "label",
    colorBy: "tone",
    colorScheme: decisionPalette,
    edgeColorBy: "target",
    edgeOpacity: 0.55,
    nodeWidth: 10,
    nodePaddingRatio: 0.065,
    nodeAlign: "justify",
    orientation: "horizontal",
    width: 980,
    height: 460,
    margin: { top: 35, right: 180, bottom: 16, left: 115 },
    title: "A good answer can take several routes",
    description: `${flow.cases.length} authored test cases, each counted once at each stage. Ribbons connect a starting situation to its decision context and acceptable response. These are expectations, not observed agent results.`,
    summary:
      "Use the group buttons and case selector below to explore each prompt and its acceptable responses. A table lists every case and route. Multiple acceptable responses share the judgment-required category; their counts are not divided into probabilities.",
    accessibleTable: true,
    showLegend: false,
    showLabels: true,
    enableHover: false,
    tooltip: false,
  } satisfies SankeyDiagramProps<DecisionNode, DecisionEdge>
}
