import assert from "node:assert/strict"
import test from "node:test"
import { context7SubpathDrift } from "./lib/context7-subpaths.mjs"

test("nested imports never stand in for missing parent entries", () => {
  assert.deepEqual(
    context7SubpathDrift(
      ["artifact", "artifact/react", "server", "server/node"],
      ["Stable sub-paths: /artifact/react,/server/node"]
    ),
    { missing: ["artifact", "server"], phantom: [] }
  )
})

test("compares whole sibling tokens including digits, underscores, and dots", () => {
  assert.deepEqual(
    context7SubpathDrift(
      ["ai", "ai/core"],
      ["Stable sub-paths: /ai2,/ai/core-next,/ai_core,/ai.core,/ai2"]
    ),
    {
      missing: ["ai", "ai/core"],
      phantom: ["ai2", "ai/core-next", "ai_core", "ai.core"]
    }
  )
})

test("combines separate rules and accepts package-qualified imports", () => {
  assert.deepEqual(
    context7SubpathDrift(
      ["artifact", "artifact/react", "server/node"],
      [
        "Stable sub-paths: `semiotic/artifact`, `/artifact/react`",
        "More sub-paths: `semiotic/server/node`"
      ]
    ),
    { missing: [], phantom: [] }
  )
})
