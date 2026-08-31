import assert from "node:assert/strict"
import test from "node:test"
import {
  validateDocsEntryBundle,
  validateDocsEntrySource,
} from "./check-docs-entry-contract.mjs"

test("accepts a direct top-level React root mount", () => {
  const source = `
    const root = createRoot(document.getElementById("root"))
    root.render(<App />)
  `

  assert.deepEqual(validateDocsEntrySource(source), [])
})

test("rejects mount-shaped code inside an uncalled helper", () => {
  const source = `
    export function mount() {
      const root = createRoot(document.getElementById("root"))
      root.render(<App />)
    }
  `

  assert.match(validateDocsEntrySource(source).join("\n"), /direct top-level statements/)
})

test("accepts the app source in the Rollup entry chunk", () => {
  const entryPath = "/repo/docs/src/index.jsx"
  const bundle = {
    "index.js": {
      type: "chunk",
      isEntry: true,
      facadeModuleId: "/repo/docs/public/index.html",
      moduleIds: [entryPath],
    },
  }

  assert.deepEqual(validateDocsEntryBundle(bundle, entryPath), [])
})

test("rejects an async wrapper that leaves the app source out of the entry chunk", () => {
  const entryPath = "/repo/docs/src/index.jsx"
  const bundle = {
    "index.js": {
      type: "chunk",
      isEntry: true,
      facadeModuleId: "/repo/docs/public/index.html",
      moduleIds: ["/repo/docs/public/docs-entry.jsx"],
    },
  }

  assert.match(validateDocsEntryBundle(bundle, entryPath).join("\n"), /must eagerly include/)
})
