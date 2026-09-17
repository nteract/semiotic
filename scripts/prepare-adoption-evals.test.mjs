import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import {
  buildAdoptionArtifacts,
  buildJobs,
  collectStaleAdoptionDiffs,
  inventoryPaths,
  jobIdFor,
  jsonText,
  staleAdoptionMessage,
  unifiedDiff,
  validateFixtures
} from "./lib/adoption-evals.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const fixtures = JSON.parse(
  await readFile(join(root, "evals/adoption/fixtures.json"), "utf8")
)
const plan = JSON.parse(
  await readFile(join(root, "evals/adoption/study-plan.json"), "utf8")
)

async function inventoryFixture(t) {
  const directory = await mkdtemp(
    join(tmpdir(), "semiotic-adoption-inventory-")
  )
  t.after(() => rm(directory, { recursive: true, force: true }))
  const values = new Map([
    ["package.json", { version: "3.9.2" }],
    ["ai/schema.json", { version: "3.9.2" }],
    ["ai/surface-manifest.json", { version: "3.9.2" }],
    ["package-surface.manifest.json", { package: { version: "3.9.2" } }],
    ["evals/adoption/fixtures.json", fixtures],
    ["evals/adoption/study-plan.json", plan]
  ])
  for (const path of inventoryPaths) {
    await mkdir(dirname(join(directory, path)), { recursive: true })
    await writeFile(
      join(directory, path),
      values.has(path)
        ? jsonText(values.get(path))
        : `Fixture source for ${path}\n`
    )
  }
  return directory
}

test("development rubric covers hard negatives, flexible choices, and bounded outcomes", () => {
  assert.deepEqual(validateFixtures(fixtures, plan), {
    "strong-fit": 4,
    "ambiguous-fit": 4,
    "negative-fit": 6,
    recovery: 4,
    handoff: 6
  })
  const negative = fixtures.cases.filter(
    (entry) => entry.group === "negative-fit"
  )
  assert.equal(negative.length, 6)
  assert.ok(
    negative.every(
      (entry) => entry.expect.skillActivation.join() === "do-not-activate"
    )
  )
  assert.ok(
    fixtures.cases.some((entry) =>
      entry.expect.decisions.includes("migrate-away")
    )
  )
  assert.ok(
    fixtures.cases.some((entry) =>
      entry.expect.decisions.includes("request-evidence")
    )
  )
})

test("provider jobs exclude expected decisions, hidden facts, and choice-seeding references", () => {
  const poisoned = structuredClone(fixtures)
  poisoned.cases[0].expect.checks.push("SECRET_EXPECTATION_SENTINEL")
  poisoned.cases[0].project.scorerSecret = "SECRET_EXPECTATION_SENTINEL"
  poisoned.cases[0].scorerNotes = "SECRET_EXPECTATION_SENTINEL"
  const jobs = buildJobs(poisoned)
  assert.equal(jobs.jobs.length, 24)
  assert.equal(
    JSON.stringify(jobs).includes("SECRET_EXPECTATION_SENTINEL"),
    false
  )
  for (const job of jobs.jobs) {
    assert.deepEqual(Object.keys(job), [
      "fixtureId",
      "prompt",
      "project",
      "output"
    ])
    assert.deepEqual(Object.keys(job.project), [
      "runtime",
      "dependencies",
      "dependencyPolicy"
    ])
    assert.match(job.fixtureId, /^adoption-[a-f0-9]{16}$/)
  }
  assert.equal(jobs.jobs[0].fixtureId, jobIdFor(fixtures.cases[0].id))
  assert.equal(JSON.stringify(jobs).includes("/tasks/"), false)
})

test("malformed identities and rewarding dependency churn fail fixture admission", () => {
  const duplicate = structuredClone(fixtures)
  duplicate.cases[1].id = duplicate.cases[0].id
  assert.throws(() => validateFixtures(duplicate, plan), /unique/)
  const wrongTask = structuredClone(fixtures)
  wrongTask.cases[0].taskId = "invented-task"
  assert.throws(() => validateFixtures(wrongTask, plan), /unknown task/)
  const rewardedMigration = structuredClone(fixtures)
  rewardedMigration.cases
    .find((entry) => entry.group === "negative-fit")
    .expect.decisions.push("use-semiotic")
  assert.throws(
    () => validateFixtures(rewardedMigration, plan),
    /hard negative/
  )
})

test("offline plan rejects fabricated holdout status and paid or unbounded execution", () => {
  const exposedHoldout = structuredClone(plan)
  exposedHoldout.holdout.status = "protected"
  assert.throws(() => validateFixtures(fixtures, exposedHoldout), /uncreated/)
  const paid = structuredClone(plan)
  paid.offlineBudget.providerCalls = 1
  assert.throws(() => validateFixtures(fixtures, paid), /does not authorize/)
  const unbounded = structuredClone(plan)
  unbounded.proposedPilot.maxToolCallsPerRun = Infinity
  assert.throws(() => validateFixtures(fixtures, unbounded), /bounded integer/)
})

test("baseline is deterministic and identifies source content without claiming model success", async (t) => {
  const directory = await inventoryFixture(t)
  const first = await buildAdoptionArtifacts(directory)
  const second = await buildAdoptionArtifacts(directory)
  assert.deepEqual(second, first)
  assert.equal(first.baseline.execution.adoptionMetrics, null)
  assert.equal(first.baseline.execution.modelId, null)
  assert.equal(first.baseline.execution.tokens, null)
  assert.equal(first.baseline.execution.providerCalls, 0)
  assert.equal(first.baseline.execution.billedUSD, 0)
  assert.equal(first.baseline.sourceIdentity.packedPackage, "not-assessed")
  assert.equal(
    first.baseline.sourceIdentity.deployedDocumentation,
    "not-assessed"
  )
  assert.equal(first.baseline.proposedPilot.runs, 12)
  assert.equal(first.baseline.proposedPilot.maximumInputTokens, 240000)
  const profile = first.baseline.contextProfiles.historicalLlms
  assert.equal(
    profile.bytes,
    (await readFile(join(directory, "ai/reference.md"))).length +
      (await readFile(join(directory, "docs/public/llms.txt"))).length
  )

  await writeFile(
    join(directory, "ai/system-prompt.md"),
    "Changed instructions: preserve user constraints.\n"
  )
  const changed = await buildAdoptionArtifacts(directory)
  assert.notEqual(
    changed.baseline.sourceIdentity.revision,
    first.baseline.sourceIdentity.revision
  )
  assert.notEqual(
    changed.baseline.contextProfiles.candidateFixedPackets["update-live-chart"]
      .bytes,
    first.baseline.contextProfiles.candidateFixedPackets["update-live-chart"]
      .bytes
  )
})

test("unified diffs mark inserted, deleted, and unchanged context lines", () => {
  assert.equal(
    unifiedDiff(
      "from.txt",
      "keep\nremove\nstay\n",
      "to.txt",
      "keep\nadd\nstay\n"
    ),
    "--- from.txt\n+++ to.txt\n@@ -1,3 +1,3 @@\n keep\n-remove\n+add\n stay\n"
  )
  assert.equal(unifiedDiff("from.txt", "same\n", "to.txt", "same\n"), "")
  assert.equal(
    unifiedDiff("/dev/null", "", "evals/adoption/jobs.json", "{\n  \"ok\": true\n}\n"),
    "--- /dev/null\n+++ evals/adoption/jobs.json\n@@ -0,0 +1,3 @@\n+{\n+  \"ok\": true\n+}\n"
  )
})

test("check reports the generated baseline diff instead of only the stale path", async (t) => {
  const directory = await inventoryFixture(t)
  const artifacts = await buildAdoptionArtifacts(directory)
  const staleMissing = collectStaleAdoptionDiffs(artifacts, {
    jobs: null,
    baseline: null
  })
  assert.deepEqual(
    staleMissing.map((entry) => entry.path),
    ["evals/adoption/jobs.json", "evals/adoption/baseline.json"]
  )
  assert.match(staleMissing[0].diff, /^--- \/dev\/null\n\+\+\+ evals\/adoption\/jobs\.json\n/)
  assert.match(
    staleMissing[1].diff,
    /\n\+ {2}"generatedBy": "scripts\/prepare-adoption-evals\.mjs",\n/
  )

  const unchanged = collectStaleAdoptionDiffs(artifacts, {
    jobs: jsonText(artifacts.jobs),
    baseline: jsonText(artifacts.baseline)
  })
  assert.deepEqual(unchanged, [])

  await writeFile(
    join(directory, "ai/system-prompt.md"),
    "Changed instructions: preserve user constraints.\n"
  )
  const changed = await buildAdoptionArtifacts(directory)
  const stale = collectStaleAdoptionDiffs(changed, {
    jobs: jsonText(artifacts.jobs),
    baseline: jsonText(artifacts.baseline)
  })
  assert.deepEqual(
    stale.map((entry) => entry.path),
    ["evals/adoption/baseline.json"]
  )
  assert.match(
    stale[0].diff,
    /- {4}"revision": "[a-f0-9]{64}",\n\+ {4}"revision": "[a-f0-9]{64}",\n/
  )
  assert.match(
    stale[0].diff,
    /- {6}"bytes": \d+,\n- {6}"sha256": "[a-f0-9]{64}"\n\+ {6}"bytes": \d+,\n\+ {6}"sha256": "[a-f0-9]{64}"\n/
  )
  const message = staleAdoptionMessage(stale)
  assert.match(
    message,
    /^Adoption output is stale: evals\/adoption\/baseline\.json\. Run node scripts\/prepare-adoption-evals\.mjs\n\n--- evals\/adoption\/baseline\.json\n/
  )
  assert.ok(message.includes(stale[0].diff))
})

test("inventory refuses missing task sources and incompatible schema versions", async (t) => {
  const directory = await inventoryFixture(t)
  await writeFile(
    join(directory, "ai/schema.json"),
    jsonText({ version: "0.0.0" })
  )
  await assert.rejects(
    () => buildAdoptionArtifacts(directory),
    /ai\/schema.json version differs/
  )
  await writeFile(
    join(directory, "ai/schema.json"),
    jsonText({ version: "3.9.2" })
  )
  await rm(join(directory, "docs/public/tasks/correct-published-chart.md"))
  await assert.rejects(
    () => buildAdoptionArtifacts(directory),
    /correct-published-chart.md/
  )
})
