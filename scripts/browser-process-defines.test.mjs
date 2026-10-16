import assert from "node:assert/strict"
import test from "node:test"
import { transform } from "esbuild"
import { browserProcessDefines } from "../vite.shared.mjs"

test("browser process substitutions never contain provider credentials", async () => {
  const previous = process.env.ANTHROPIC_API_KEY
  const sentinel = "test-secret-browser-build-regression"
  process.env.ANTHROPIC_API_KEY = sentinel
  try {
    for (const mode of ["production", "development"]) {
      const define = browserProcessDefines(mode)
      assert.deepEqual(Object.keys(define), ["process.env.NODE_ENV"])
      const { code } = await transform("console.log(process.env.ANTHROPIC_API_KEY, process.env.NODE_ENV)", { define })
      assert(!code.includes(sentinel))
      assert(code.includes(JSON.stringify(mode)))
    }
  } finally {
    if (previous === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = previous
  }
})
