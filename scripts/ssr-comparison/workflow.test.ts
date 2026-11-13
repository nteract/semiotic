import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { test } from "node:test"

const root = resolve(import.meta.dirname, "../..")
test("manual evidence builds once, requires a baseline and retains failures without publishing", () => {
  const workflow = readFileSync(
    resolve(root, ".github/workflows/ssr-comparison.yml"),
    "utf8"
  )
  assert.match(
    workflow,
    /workflow_dispatch:[\s\S]*previous_version:[\s\S]*required: true/
  )
  assert.equal(workflow.match(/npm run dist:prod/g)?.length, 1)
  assert.match(workflow, /--previous "\$PREVIOUS_VERSION" --current \./)
  assert.match(workflow, /if: always\(\)[\s\S]*uses: actions\/upload-artifact/)
  assert.doesNotMatch(
    workflow,
    /npm publish|id-token: write|pull_request_target/
  )
  const release = readFileSync(
    resolve(root, ".github/workflows/release.yml"),
    "utf8"
  )
  assert.doesNotMatch(
    release,
    /report:ssr-comparison/,
    "Older-tag recovery cannot assume this new command exists; evidence has its own manual lane"
  )
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
  assert.doesNotMatch(
    pkg.scripts["check:release-preflight"],
    /report:ssr-comparison/
  )
})
