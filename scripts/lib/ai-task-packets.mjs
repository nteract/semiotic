import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { relative, resolve } from "node:path"

export const TASK_IDS = [
  "compare-category-totals",
  "update-live-chart",
  "correct-published-chart"
]
export const GENERATOR = "scripts/generate-ai-task-packets.mjs"
export const EVIDENCE_PATH = "ai/tasks/verification.json"
export const digest = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`
const json = (value) => JSON.stringify(value, null, 2) + "\n"

export function readSource(root, path) {
  if (
    typeof path !== "string" ||
    !path ||
    path.startsWith("/") ||
    path.split(/[\\/]/).includes("..")
  )
    throw new Error(`Invalid task source path: ${path}`)
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) throw new Error(`Missing task source: ${path}`)
  return readFileSync(absolute, "utf8")
}

function walk(root, directory) {
  if (!existsSync(resolve(root, directory))) return []
  return readdirSync(resolve(root, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const path = `${directory}/${entry.name}`
      return entry.isDirectory() ? walk(root, path) : [path]
    })
    .sort()
}

function sourceTree(root, paths) {
  const files = [...new Set(paths)]
    .sort()
    .map((path) => ({ path, digest: digest(readSource(root, path)) }))
  return { digest: digest(json(files)), fileCount: files.length }
}

export function evidenceFor(record, id, sourceRevision, checks) {
  if (!record) return { status: "proposed", observed: null }
  if (
    record.schemaVersion !== 1 ||
    record.taskRevisions?.[id] !== sourceRevision
  )
    return { status: "stale", observed: null }
  if (
    record.scope !== "source-only" ||
    !record.environment ||
    !["node", "platform", "architecture", "browser"].every(
      (key) =>
        typeof record.environment[key] === "string" && record.environment[key]
    )
  )
    throw new Error(
      "Task verification requires its source scope and execution environment"
    )
  if (
    !Array.isArray(record.runs) ||
    record.runs.length !== 2 ||
    record.runs.some(
      (run) =>
        run.exitCode !== 0 ||
        !Number.isInteger(run.passed) ||
        run.passed < 1 ||
        run.skipped !== 0 ||
        typeof run.command !== "string" ||
        !run.command.trim() ||
        typeof run.name !== "string" ||
        !run.name.trim()
    )
  )
    throw new Error(
      "Task verification must contain successful, unskipped test runs"
    )
  if (!Number.isFinite(Date.parse(record.verifiedAt)))
    throw new Error("Invalid task verification time")
  for (const kind of ["unit", "browser"]) {
    const runs = record.runs.filter((run) => run.kind === kind)
    if (runs.length !== 1)
      throw new Error(`Task verification requires one ${kind} run`)
    const run = runs[0]
    if (
      !Array.isArray(run.targets) ||
      !run.targets.length ||
      !run.passedByFile ||
      run.targets.some(
        (target) =>
          !Number.isInteger(run.passedByFile[target]) ||
          run.passedByFile[target] < 1
      )
    )
      throw new Error(
        `Task verification requires passing results for every ${kind} target`
      )
    if (
      checks &&
      (!run.targets.includes(checks[kind]) || !run.passedByFile[checks[kind]])
    )
      throw new Error(
        `Task verification did not execute declared ${kind} check: ${checks[kind]}`
      )
  }
  return {
    status: "supported-in-scope",
    observed: {
      verifiedAt: record.verifiedAt,
      environment: record.environment,
      runs: record.runs,
      record: EVIDENCE_PATH,
      authorship:
        "Agent-observed execution of repository tests; independent review is not recorded."
    }
  }
}

export function assertTaskVersion(packet, installedVersion) {
  if (packet.identity.packageVersion !== installedVersion)
    throw new Error(
      `Task targets source package ${packet.identity.packageVersion}; installed ${installedVersion}. Retrieve matching guidance and revalidate.`
    )
  return {
    packageVersionMatches: true,
    availability:
      "Source guidance only; version equality does not establish packed or deployed parity."
  }
}

export function buildTaskPackets(root, { verification } = {}) {
  const require = createRequire(resolve(root, "package.json"))
  const metadata = require(resolve(root, "ai/componentMetadata.cjs"))
  const behavior = require(resolve(root, "ai/behaviorContracts.cjs"))
  const pkg = JSON.parse(readSource(root, "package.json"))
  const schema = JSON.parse(readSource(root, "ai/schema.json"))
  const surface = JSON.parse(readSource(root, "package-surface.manifest.json"))
  const aiSurface = JSON.parse(readSource(root, "ai/surface-manifest.json"))
  if (
    schema.version !== pkg.version ||
    surface.package.version !== pkg.version ||
    aiSurface.version !== pkg.version
  )
    throw new Error(
      "Task inputs disagree on package version; regenerate schema and package surfaces"
    )
  const runtime = sourceTree(root, [
    ...walk(root, "src").filter(
      (path) => /\.[cm]?[jt]sx?$/.test(path) && !/\.test\./.test(path)
    ),
    "package.json",
    "ai/schema.json",
    "ai/componentMetadata.cjs",
    "ai/behaviorContracts.cjs",
    "ai/surface-manifest.json",
    "package-surface.manifest.json",
    "ai/mcp-server.ts",
    "ai/mcp-task-resources.ts"
  ])
  const taskSources = sourceTree(root, [
    "ai/mcp-task-resources.test.ts",
    ...walk(root, "docs/src/pages/tasks"),
    "docs/src/App.jsx",
    "docs/src/components/PageLayout.jsx",
    "docs/src/components/CodeBlock.jsx",
    "vite.shared.mjs",
    "vite.docs.config.mjs",
    "package-lock.json",
    "src/setupTests.ts",
    "scripts/ai-tasks/tsconfig.json",
    "integration-tests/docs-examples-tasks.spec.ts",
    "integration-tests/docs-examples-task-live.spec.ts",
    "playwright.docs-examples.config.ts",
    "vitest.config.mts",
    GENERATOR,
    "scripts/lib/ai-task-packets.mjs",
    "scripts/verify-ai-tasks.mjs"
  ])
  const record =
    verification === undefined && existsSync(resolve(root, EVIDENCE_PATH))
      ? JSON.parse(readSource(root, EVIDENCE_PATH))
      : verification
  return TASK_IDS.map((id) => {
    const definitionPath = `ai/tasks/${id}.json`
    const task = JSON.parse(readSource(root, definitionPath))
    if (
      task.id !== id ||
      !task.title ||
      !task.summary ||
      !task.job ||
      !task.dataShape
    )
      throw new Error(`Invalid task identity or opening: ${id}`)
    if (!["static", "push"].includes(task.usageMode))
      throw new Error(`Invalid task usage mode: ${id}`)
    for (const key of [
      "fit",
      "exclusions",
      "props",
      "contracts",
      "examples",
      "recovery"
    ])
      if (!Array.isArray(task[key]) || !task[key].length)
        throw new Error(`Missing ${key}: ${id}`)
    const component = metadata.findComponent(schema, task.component)
    if (!component) throw new Error(`Unknown task component: ${task.component}`)
    const componentMetadata = metadata.metadataForComponent(component)
    if (
      typeof task.importPath !== "string" ||
      !/^semiotic\/[a-z-]+$/.test(task.importPath)
    )
      throw new Error(`Invalid public task import: ${task.importPath}`)
    const allowedImports = [componentMetadata.importPath]
    if (task.component === "LineChart") allowedImports.push("semiotic/line")
    if (!allowedImports.includes(task.importPath))
      throw new Error(
        `Task import does not export ${task.component}: ${task.importPath}`
      )
    const subpath = task.importPath.replace(/^semiotic(?=\/|$)/, ".")
    if (
      !pkg.exports[subpath] ||
      !surface.entries.some((entry) => entry.subpath === subpath)
    )
      throw new Error(`Task import is not public: ${task.importPath}`)
    const properties = Object.fromEntries(
      task.props.map((name) => {
        const property = component.parameters.properties[name]
        if (!property)
          throw new Error(`Unknown task prop: ${task.component}.${name}`)
        return [name, property]
      })
    )
    const contracts = task.contracts.map((contractId) => {
      const contract = behavior.BEHAVIOR_CONTRACTS.find(
        (item) => item.id === contractId
      )
      if (!contract) throw new Error(`Unknown behavior contract: ${contractId}`)
      return {
        id: contract.id,
        title: contract.title,
        summary: contract.summary,
        action: contract.agentAction
      }
    })
    for (const recovery of task.recovery)
      if (
        recovery.contractId &&
        !contracts.some((contract) => contract.id === recovery.contractId)
      )
        throw new Error(
          `Recovery references an undeclared contract: ${recovery.contractId}`
        )
    const examples = task.examples.map((example) => {
      if (!example.title || !example.environment)
        throw new Error(`Missing example context: ${id}`)
      const source = readSource(root, example.path)
      return { ...example, source, digest: digest(source) }
    })
    readSource(root, task.checks.unit)
    readSource(root, task.checks.browser)
    if (
      !task.checks.expected?.length ||
      !task.checks.unassessed?.length ||
      !task.continuation?.loss
    )
      throw new Error(
        `Missing expected facts, evidence limits or handoff limits: ${id}`
      )
    const declaredSources = sourceTree(root, [
      ...task.examples.map((example) => example.path),
      task.checks.unit,
      task.checks.browser
    ])
    const sourceRevision = digest(
      json({
        runtime,
        taskSources,
        declaredSources,
        definition: digest(readSource(root, definitionPath))
      })
    )
    const evidence = evidenceFor(record, id, sourceRevision, task.checks)
    return {
      schemaVersion: 1,
      generatedBy: GENERATOR,
      id,
      title: task.title,
      summary: task.summary,
      route: `/tasks/${id}`,
      identity: {
        packageName: pkg.name,
        packageVersion: pkg.version,
        channel: "source",
        sourceRevision,
        revisionKind: "content-digest",
        runtime,
        taskSources,
        availability:
          "Verified source checkout guidance; npm package, hosted site and MCP deployment identities require separate checks."
      },
      job: task.job,
      dataShape: task.dataShape,
      fit: task.fit,
      exclusions: task.exclusions,
      api: {
        ...componentMetadata,
        component: task.component,
        importPath: task.importPath,
        usageMode: task.usageMode,
        dataRequired: behavior.dataRequiredForUsageMode(
          task.component,
          task.usageMode
        ),
        schema: {
          type: "object",
          properties,
          requiredForStatic: component.parameters.required ?? []
        },
        schemaScope:
          "Selected properties copied from ai/schema.json; retrieve the component resource for the full schema. React push mode follows the included behavior contracts.",
        contracts
      },
      examples,
      evidence: {
        claimId: `task.${id}`,
        statement: task.summary,
        owner: "Semiotic repository maintainers",
        ...evidence,
        validity:
          "Only the content digests and environment recorded here; not a release range or an adoption result.",
        invalidation:
          "Changes to runtime source, schemas, manifests, task examples, tests, verification tooling or this task definition invalidate the recorded result.",
        commands: [
          `npx vitest run ${task.checks.unit}`,
          `npx playwright test --config playwright.docs-examples.config.ts ${task.checks.browser}`
        ],
        checks: { unit: task.checks.unit, browser: task.checks.browser },
        expected: task.checks.expected,
        unassessed: task.checks.unassessed
      },
      recovery: task.recovery,
      continuation: task.continuation,
      update: task.update,
      definition: definitionPath
    }
  })
}

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n")
}

export function renderTaskMarkdown(task) {
  return (
    [
      `<!-- Generated by ${GENERATOR}; edit ${task.definition}. -->`,
      `# ${task.title}`,
      task.summary,
      `Source package: ${task.identity.packageName}@${task.identity.packageVersion}. Channel: source.\nSource revision: ${task.identity.sourceRevision}. ${task.identity.availability}`,
      "## The job",
      task.job,
      `Data: ${task.dataShape}`,
      "## Fit and constraints",
      bullets(task.fit),
      bullets(task.exclusions),
      "## Smallest working path",
      `Component: ${task.api.component} from \`${task.api.importPath}\`. Usage: ${task.api.usageMode}. Data prop required in this mode: ${task.api.dataRequired}.`,
      ...task.examples.map(
        (example) =>
          `### ${example.title}\n\n${example.environment}; source: ${example.path}.\n\n\`\`\`${example.path.endsWith("css") ? "css" : example.path.endsWith("tsx") ? "tsx" : "ts"}\n${example.source.trimEnd()}\n\`\`\``
      ),
      "## Check the result",
      `Evidence state: ${task.evidence.status}. ${task.evidence.validity}`,
      bullets(task.evidence.expected),
      "Run:",
      "```sh\n" + task.evidence.commands.join("\n") + "\n```",
      ...(task.evidence.observed
        ? [
            `Recorded execution: ${task.evidence.observed.verifiedAt}. ${task.evidence.observed.authorship}`
          ]
        : [
            "No current execution result is recorded for these source contents."
          ]),
      "Not assessed:",
      bullets(task.evidence.unassessed),
      "## Repair and recheck",
      ...task.recovery.map(
        (repair) =>
          `### ${repair.symptom}\n\n${repair.action}\n\nRecheck: ${repair.recheck}${repair.contractId ? `\n\nContract: ${repair.contractId}.` : ""}`
      ),
      "## Exact API and mode guidance",
      task.api.schemaScope,
      `Full component resource: ${task.api.schemaResourceUri}. Machine packet: /tasks/${task.id}.json.`,
      ...task.api.contracts.map(
        (contract) =>
          `- **${contract.id}:** ${contract.summary} ${contract.action}`
      ),
      "## Maintenance context",
      task.continuation.rationale,
      bullets(task.continuation.recheck),
      task.continuation.loss,
      "Read the installed package and lockfile before applying source guidance. A matching version string alone does not establish deployed parity. These notes are removable project context, subordinate to the current task and dependency policy.",
      ...(task.update
        ? [
            "## Behavioral update",
            `Status: ${task.update.status}. Released introduction: ${task.update.introducedIn ?? "not established"}.`,
            `Assumption to revisit: ${task.update.previousAssumption}`,
            task.update.action,
            bullets(task.update.recheck),
            task.update.remaining
          ]
        : [])
    ].join("\n\n") + "\n"
  )
}

export function taskOutputs(packets) {
  const outputs = new Map()
  const index = {
    schemaVersion: 1,
    generatedBy: GENERATOR,
    channel: "source",
    tasks: packets.map((task) => ({
      id: task.id,
      title: task.title,
      summary: task.summary,
      route: task.route,
      packageVersion: task.identity.packageVersion,
      sourceRevision: task.identity.sourceRevision,
      markdown: `/tasks/${task.id}.md`,
      json: `/tasks/${task.id}.json`,
      evidenceStatus: task.evidence.status
    }))
  }
  for (const prefix of ["ai/task-packets", "docs/public/tasks"]) {
    outputs.set(`${prefix}/index.json`, json(index))
    for (const task of packets) {
      outputs.set(`${prefix}/${task.id}.json`, json(task))
      outputs.set(`${prefix}/${task.id}.md`, renderTaskMarkdown(task))
    }
  }
  return outputs
}

export function compareOutputs(root, outputs) {
  return [...outputs]
    .filter(
      ([path, content]) =>
        !existsSync(resolve(root, path)) ||
        readFileSync(resolve(root, path), "utf8") !== content
    )
    .map(([path]) => relative(root, resolve(root, path)))
}
