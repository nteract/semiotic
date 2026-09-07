import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const taskIds = [
  "compare-category-totals",
  "update-live-chart",
  "correct-published-chart"
]

export const inventoryPaths = [
  "package.json",
  "README.md",
  "ai/schema.json",
  "ai/behaviorContracts.cjs",
  "ai/system-prompt.md",
  "ai/reference.md",
  "ai/examples.md",
  "ai/surface-manifest.json",
  "ai/mcp-server.ts",
  "ai/mcp-task-resources.ts",
  "ai/mcp-task-resources.test.ts",
  "ai/task-packets/index.json",
  "package-surface.manifest.json",
  "llms.txt",
  "docs/public/llms.txt",
  "context7.json",
  "agent-skill/semiotic-charts/SKILL.md",
  "evals/adoption/fixtures.json",
  "evals/adoption/study-plan.json",
  "evals/first-try/README.md",
  "evals/first-try/jobs.json",
  "scripts/run-openai-ai-evals.mjs",
  "scripts/prepare-adoption-evals.mjs",
  "scripts/lib/adoption-evals.mjs",
  ...taskIds.flatMap((id) => [
    `ai/tasks/${id}.json`,
    `ai/task-packets/${id}.json`,
    `ai/task-packets/${id}.md`,
    `docs/public/tasks/${id}.json`,
    `docs/public/tasks/${id}.md`
  ])
].sort()

const groups = {
  "strong-fit": 4,
  "ambiguous-fit": 4,
  "negative-fit": 6,
  recovery: 4,
  handoff: 6
}
const settings = new Set([
  "controlled-choice",
  "semiotic-execution",
  "delayed-handoff"
])
const decisions = new Set([
  "use-semiotic",
  "evaluate-semiotic",
  "keep-existing",
  "no-chart",
  "migrate-away",
  "request-evidence"
])
const isText = (value) => typeof value === "string" && value.trim().length > 0
const textList = (value) =>
  Array.isArray(value) && value.length > 0 && value.every(isText)
const digest = (value) => createHash("sha256").update(value).digest("hex")
export const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`
export const jobIdFor = (fixtureId) =>
  `adoption-${digest(fixtureId).slice(0, 16)}`

export function validateFixtures(fixtures, plan) {
  if (fixtures.version !== 1 || !isText(fixtures.fixtureRevision)) {
    throw new Error("Adoption fixtures need version 1 and a fixture revision")
  }
  if (
    !Array.isArray(fixtures.cases) ||
    fixtures.cases.length !== plan.developmentCases
  ) {
    throw new Error(
      "Adoption development fixture count differs from the study plan"
    )
  }
  const ids = new Set()
  const observedGroups = {}
  for (const entry of fixtures.cases) {
    const fail = (message) => {
      throw new Error(`${entry.id ?? "Unknown fixture"}: ${message}`)
    }
    if (!isText(entry.id) || ids.has(entry.id))
      fail("fixture IDs must be unique")
    ids.add(entry.id)
    if (!(entry.group in groups) || !settings.has(entry.setting))
      fail("unknown group or setting")
    observedGroups[entry.group] = (observedGroups[entry.group] ?? 0) + 1
    if (entry.taskId !== null && !taskIds.includes(entry.taskId))
      fail("unknown task reference")
    if (entry.setting === "semiotic-execution" && entry.taskId === null)
      fail("execution needs a task")
    if (
      !isText(entry.prompt) ||
      !isText(entry.project?.runtime) ||
      !isText(entry.project?.dependencyPolicy) ||
      !Array.isArray(entry.project?.dependencies) ||
      !entry.project.dependencies.every(isText)
    )
      fail("incomplete agent input")
    if (
      !textList(entry.expect?.decisions) ||
      !entry.expect.decisions.every((value) => decisions.has(value))
    ) {
      fail("unknown or missing acceptable decisions")
    }
    if (
      !textList(entry.expect?.skillActivation) ||
      !entry.expect.skillActivation.every((value) =>
        ["activate", "do-not-activate"].includes(value)
      )
    ) {
      fail("missing skill activation rubric")
    }
    if (!textList(entry.expect?.checks) || !textList(entry.expect?.unassessed))
      fail("missing success criteria or limits")
    if (
      entry.group === "negative-fit" &&
      (entry.taskId !== null ||
        entry.expect.skillActivation.includes("activate") ||
        entry.expect.decisions.some((value) =>
          ["use-semiotic", "evaluate-semiotic"].includes(value)
        ))
    )
      fail("a hard negative cannot reward introducing Semiotic")
  }
  for (const [group, count] of Object.entries(groups)) {
    if (observedGroups[group] !== count)
      throw new Error(`Expected ${count} ${group} development cases`)
  }
  if (
    plan.holdout?.status !== "not-authored" ||
    plan.holdout.authoredCases !== 0 ||
    Object.values(plan.holdout.allocation).reduce(
      (total, count) => total + count,
      0
    ) !== plan.holdout.plannedCases
  ) {
    throw new Error(
      "Holdout must remain explicitly uncreated with a consistent allocation"
    )
  }
  if (
    plan.offlineBudget?.providerCalls !== 0 ||
    plan.offlineBudget.billedUSD !== 0 ||
    plan.offlineBudget.networkAccess !== false ||
    plan.proposedPilot?.status !== "not-authorized-or-run" ||
    plan.proposedPilot.maxBilledUSD !== null
  ) {
    throw new Error(
      "This offline study does not authorize provider calls or paid work"
    )
  }
  for (const key of [
    "tasks",
    "conditions",
    "models",
    "repetitions",
    "maxToolCallsPerRun",
    "maxInputTokensPerRun",
    "maxOutputTokensPerRun",
    "maxWallSecondsPerRun"
  ]) {
    if (
      !Number.isSafeInteger(plan.proposedPilot[key]) ||
      plan.proposedPilot[key] <= 0
    ) {
      throw new Error(`Pilot ${key} must be a positive, bounded integer`)
    }
  }
  return observedGroups
}

export function buildJobs(fixtures) {
  return {
    version: 1,
    fixtureRevision: fixtures.fixtureRevision,
    scope:
      "Public development inputs; supply only these jobs and permitted sources to an agent.",
    jobs: fixtures.cases.map((entry) => ({
      fixtureId: jobIdFor(entry.id),
      prompt: entry.prompt,
      project: {
        runtime: entry.project.runtime,
        dependencies: [...entry.project.dependencies],
        dependencyPolicy: entry.project.dependencyPolicy
      },
      output:
        "Give a decision and short rationale grounded in the project constraints, the implementation or repair when applicable, checks actually performed, and remaining limits."
    }))
  }
}

export async function buildAdoptionArtifacts(root) {
  const source = new Map(
    await Promise.all(
      inventoryPaths.map(async (path) => {
        try {
          return [path, await readFile(join(root, path))]
        } catch (error) {
          throw new Error(
            `Adoption inventory cannot read ${path}; generate task packets first`,
            { cause: error }
          )
        }
      })
    )
  )
  const readJson = (path) => JSON.parse(source.get(path).toString("utf8"))
  const fixtures = readJson("evals/adoption/fixtures.json")
  const plan = readJson("evals/adoption/study-plan.json")
  const groupCounts = validateFixtures(fixtures, plan)
  const packageVersion = readJson("package.json").version
  for (const [path, version] of [
    ["ai/schema.json", readJson("ai/schema.json").version],
    ["ai/surface-manifest.json", readJson("ai/surface-manifest.json").version],
    [
      "package-surface.manifest.json",
      readJson("package-surface.manifest.json").package.version
    ]
  ]) {
    if (!isText(packageVersion) || version !== packageVersion) {
      throw new Error(`${path} version differs from package.json`)
    }
  }
  const inventory = inventoryPaths.map((path) => ({
    path,
    bytes: source.get(path).byteLength,
    sha256: digest(source.get(path))
  }))
  const profile = (paths) => ({
    paths,
    bytes: paths.reduce(
      (total, path) => total + source.get(path).byteLength,
      0
    ),
    measurement: "UTF-8 source bytes; not token usage or billed cost"
  })
  const compactProfiles = Object.fromEntries(
    taskIds.map((id) => [
      id,
      profile(["ai/system-prompt.md", `docs/public/tasks/${id}.md`])
    ])
  )
  const proposedRuns =
    plan.proposedPilot.tasks *
    plan.proposedPilot.conditions *
    plan.proposedPilot.models *
    plan.proposedPilot.repetitions
  const baseline = {
    version: 1,
    generatedBy: "scripts/prepare-adoption-evals.mjs",
    scope:
      "Offline source inventory and development-fixture validation; no agent adoption experiment was run.",
    sourceIdentity: {
      packageVersion,
      releaseChannel: "development",
      revisionKind: "sha256-of-inventoried-source-content",
      revision: digest(jsonText(inventory)),
      packedPackage: "not-assessed",
      deployedDocumentation: "not-assessed",
      deployedMCP: "not-assessed"
    },
    fixtureRevision: fixtures.fixtureRevision,
    development: {
      count: fixtures.cases.length,
      groups: groupCounts,
      definitionValidation: "passed",
      executionFixtures:
        "scenario-definitions-only; full project snapshots not yet materialized"
    },
    holdout: plan.holdout,
    observedFriction: [
      {
        rank: 1,
        issue:
          "Historical first-try context conditions both include the full reference.",
        sources: [
          "evals/first-try/README.md",
          "scripts/run-openai-ai-evals.mjs"
        ],
        implication: "They do not isolate compact, on-demand retrieval."
      },
      {
        rank: 2,
        issue:
          "Existing first-try jobs require Semiotic; they do not measure an appropriate library choice.",
        sources: ["evals/first-try/jobs.json"],
        implication:
          "Choice and negative-fit trials require their own rubric and controlled source pool."
      },
      {
        rank: 3,
        issue:
          "Static rendering cannot establish live subscription cleanup, reconnect, or correction behavior.",
        sources: ["evals/first-try/README.md"],
        implication:
          "Live tasks require browser lifecycle checks in addition to a static oracle."
      }
    ],
    contextProfiles: {
      historicalLlms: profile(["ai/reference.md", "docs/public/llms.txt"]),
      historicalSkill: profile([
        "ai/reference.md",
        "agent-skill/semiotic-charts/SKILL.md"
      ]),
      candidateFixedPackets: compactProfiles,
      interpretation:
        "These are source-size measurements. Candidate packets are fixed bundles, not evidence of interactive retrieval quality."
    },
    taskRoutes: taskIds.map((id) => ({
      taskId: id,
      route: `/tasks/${id}`,
      packet: `docs/public/tasks/${id}.json`
    })),
    execution: {
      mode: "offline-static-validation",
      modelId: null,
      providerCalls: 0,
      billedUSD: 0,
      tokens: null,
      agentToolCalls: null,
      agentWallTime: null,
      adoptionMetrics: null
    },
    proposedPilot: {
      ...plan.proposedPilot,
      runs: proposedRuns,
      maximumAgentToolCalls:
        proposedRuns * plan.proposedPilot.maxToolCallsPerRun,
      maximumInputTokens:
        proposedRuns * plan.proposedPilot.maxInputTokensPerRun,
      maximumOutputTokens:
        proposedRuns * plan.proposedPilot.maxOutputTokensPerRun,
      maximumSerialWallSeconds:
        proposedRuns * plan.proposedPilot.maxWallSecondsPerRun
    },
    inventory
  }
  return { jobs: buildJobs(fixtures), baseline }
}
