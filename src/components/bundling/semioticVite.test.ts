import { describe, expect, it } from "vitest"
import { semioticVite } from "./semioticVite"

describe("semioticVite", () => {
  const asset = (fileName: string, source = "self.onmessage = () => {}") => ({
    type: "asset" as const,
    fileName,
    source
  })
  it("removes only orphan Semiotic workers and their maps", () => {
    const bundle = {
      "app.js": {
        type: "chunk" as const,
        fileName: "app.js",
        code: 'new Worker("/assets/forceLayoutWorker-used.js")'
      },
      used: asset("assets/forceLayoutWorker-used.js"),
      unused: asset("assets/processSankeyLayoutWorker-unused.js"),
      map: asset("assets/processSankeyLayoutWorker-unused.js.map"),
      unrelated: asset("assets/my-worker.js"),
      other: asset("assets/data.json")
    }
    semioticVite().generateBundle.handler({}, bundle)
    expect(Object.keys(bundle)).toEqual([
      "app.js",
      "used",
      "unrelated",
      "other"
    ])
  })
  it("preserves references in byte-buffer assets such as generated HTML", () => {
    const bundle = {
      html: {
        type: "asset" as const,
        fileName: "index.html",
        source: new TextEncoder().encode(
          '<script>new Worker("/physicsWorker.js")</script>'
        )
      },
      worker: asset("physicsWorker.js"),
      map: asset("physicsWorker.js.map")
    }
    semioticVite().generateBundle.handler({}, bundle)
    expect(Object.keys(bundle)).toEqual(["html", "worker", "map"])
  })
  it("follows references between workers and preserves URL-free outputs", () => {
    const bundle = {
      "app.js": {
        type: "chunk" as const,
        fileName: "app.js",
        code: 'new Worker("/physicsWorker.js")'
      },
      parent: asset(
        "physicsWorker.js",
        'import "./forceLayoutWorker-nested.js"'
      ),
      child: asset("forceLayoutWorker-nested.js")
    }
    semioticVite().generateBundle.handler({}, bundle)
    expect(Object.keys(bundle)).toHaveLength(3)
    const empty = { image: asset("preview.png") }
    semioticVite().generateBundle.handler({}, empty)
    expect(empty).toEqual({ image: asset("preview.png") })
  })
})
