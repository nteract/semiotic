import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"
import { validateEagerDocsMount } from "./check-docs-routes.mjs"

function createBuild(files) {
  const buildDir = mkdtempSync(join(tmpdir(), "semiotic-docs-entry-"))
  for (const [filePath, contents] of Object.entries(files)) {
    const target = join(buildDir, filePath)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, contents)
  }
  return buildDir
}

test("accepts a React mount in the eager docs module graph", (context) => {
  const buildDir = createBuild({
    "index.html": '<script type="module" src="./assets/index-good.js"></script>',
    "assets/index-good.js":
      'import "./runtime.js"; (0, ReactDOM.createRoot)(document.getElementById("root")).render(app)',
    "assets/runtime.js": "export const runtime = true",
  })
  context.after(() => rmSync(buildDir, { recursive: true, force: true }))

  assert.deepEqual(validateEagerDocsMount(buildDir), [])
})

test("rejects an app mount hidden behind a circular dynamic entry import", (context) => {
  const buildDir = createBuild({
    "index.html": '<script type="module" src="./assets/index-deadlock.js"></script>',
    "assets/index-deadlock.js": 'import("./app.js")',
    "assets/app.js":
      'import "./index-deadlock.js"; (0, ReactDOM.createRoot)(document.getElementById("root")).render(app)',
  })
  context.after(() => rmSync(buildDir, { recursive: true, force: true }))

  assert.match(validateEagerDocsMount(buildDir).join("\n"), /no eager React mount/)
})
