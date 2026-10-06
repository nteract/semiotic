import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  RELEASE_PREFLIGHT_CHECKS,
  runReleasePreflight
} from "./check-release-preflight.ts"

const root = new URL("../", import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), "utf8")
const { scripts } = JSON.parse(read("package.json"))

test("preflight reports dependency and generated failures together without expensive work", () => {
  const commands: string[] = []
  const errors: string[] = []
  const status = runReleasePreflight({
    root: "/tagged-source",
    execute(command, args, options) {
      assert.equal(command, "npm")
      assert.equal(options.cwd, "/tagged-source")
      assert.equal(options.timeout, 120_000)
      commands.push(args.join(" "))
      return {
        status: args[0] === "audit" || args[1] === "check:ai-tasks" ? 1 : 0
      }
    },
    log() {},
    error(message: string) {
      errors.push(message)
    }
  })
  assert.equal(status, 1)
  assert.equal(
    commands[0],
    "audit --registry=https://registry.npmjs.org --audit-level=moderate"
  )
  assert.ok(commands.includes("run check:adoption-evals"))
  assert.equal(commands.length, RELEASE_PREFLIGHT_CHECKS.length + 1)
  assert.match(errors.at(-1)!, /failed \(2 checks\)/)
  assert.match(errors.at(-1)!, /npm audit/)
  assert.match(errors.at(-1)!, /npm run check:ai-tasks/)
  assert.doesNotMatch(
    commands.join("\n"),
    /build:|dist:|typescript|test:coverage|test:examples|website:|npm publish/
  )
})

test("preflight fails closed on a missing script, timeout, or process signal", () => {
  for (const result of [
    { status: 1 },
    { status: null, error: new Error("spawnSync npm ETIMEDOUT") },
    { status: null }
  ]) {
    const status = runReleasePreflight({
      execute: (_command, args) =>
        args[1] === "check:ai-tasks" ? result : { status: 0 },
      log() {},
      error() {}
    })
    assert.equal(status, 1)
  }
})

test("preflight succeeds only when every registered check succeeds", () => {
  for (const name of RELEASE_PREFLIGHT_CHECKS) {
    assert.equal(typeof scripts[name], "string", `Missing npm script ${name}`)
  }
  assert.equal(
    new Set(RELEASE_PREFLIGHT_CHECKS).size,
    RELEASE_PREFLIGHT_CHECKS.length
  )
  assert.equal(
    runReleasePreflight({
      execute: () => ({ status: 0 }),
      log() {},
      error() {}
    }),
    0
  )
})

test("local release and direct publish start with preflight; fast checks include packet dependents", () => {
  for (const name of ["release:check", "prepublishOnly"]) {
    assert.equal(
      scripts[name].split(" && ")[0],
      "npm run check:release-preflight"
    )
  }
  assert.equal(
    scripts["check:release-preflight"],
    "node --experimental-strip-types scripts/check-release-preflight.ts"
  )
  const fast = scripts["check:preflight"].split(" && ")
  assert.deepEqual(fast.slice(0, 2), [
    "npm run check:ai-tasks",
    "npm run check:adoption-evals"
  ])
})

test("release gates browsers and publication on current preflight policy against tagged source", () => {
  const workflow = read(".github/workflows/release.yml")
  const source = workflow
    .split("  source-preflight:")[1]
    .split("  docs-examples:")[0]
  assert.match(source, /needs: npm-publish-preflight/)
  assert.match(
    source,
    /name: Checkout tagged source[\s\S]*?ref: \$\{\{ env.RELEASE_TAG \}\}/
  )
  assert.match(
    source,
    /name: Checkout release preflight harness[\s\S]*?ref: \$\{\{ github.sha \}\}/
  )
  assert.match(source, /sparse-checkout: scripts\/check-release-preflight.ts/)
  const command =
    "node --experimental-strip-types .release-preflight/scripts/check-release-preflight.ts"
  assert.ok(source.indexOf(command) > source.indexOf("if npm ci; then"))
  assert.ok(source.indexOf(command) < source.indexOf("npm run typescript"))
  assert.match(source, /npm run typescript:mcp/)
  assert.doesNotMatch(
    source,
    /working-directory:|continue-on-error:|if: always\(\)/
  )
  assert.match(workflow, / {2}docs-examples:\n {4}needs: source-preflight\n/)
  assert.match(workflow, / {2}publish:\n {4}needs: docs-examples\n/)
})

test("PR preflight catches dependency and generated drift before type preparation", () => {
  const preflight = read(".github/workflows/node.js.yml")
    .split("  fast-contracts:")[1]
    .split("  coverage-shards:")[0]
  for (const command of [
    "npm audit --registry=https://registry.npmjs.org --audit-level=moderate",
    "npm run check:ai-tasks",
    "npm run check:adoption-evals"
  ]) {
    assert.ok(preflight.indexOf(command) > preflight.indexOf("run: npm ci"))
    assert.ok(
      preflight.indexOf(command) < preflight.indexOf("npm run typescript")
    )
  }
})

test("release preparation refreshes packets and dependent inventory after other generators", () => {
  const script = read("scripts/create-release-branch.sh")
  const packets = script.lastIndexOf("npm run docs:ai-tasks")
  const adoption = script.lastIndexOf("npm run prepare:adoption-evals")
  assert.ok(packets > script.indexOf("npm run baseline:browser"))
  assert.ok(adoption > packets)
  assert.ok(script.indexOf("npm run release:check") > adoption)
})
