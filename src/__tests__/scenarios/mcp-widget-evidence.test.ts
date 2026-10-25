import { renderedSceneHash } from "../../components/evidence/renderedSceneHash"
import type { RenderEvidence } from "../../components/server/renderEvidence"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import { waitForProcessExit } from "./mcpHttpServerHarness"

const props = {
  data: [
    { region: "North", revenue: 10 },
    { region: "South", revenue: 18 }
  ],
  categoryAccessor: "region",
  valueAccessor: "revenue",
  title: "Regional revenue",
  description: "South revenue exceeds North revenue."
}

describe("shipped widget artifact evidence", () => {
  it.each(["public", "developer"])(
    "binds the %s evidence to the delivered SVG after sanitization and theming",
    async (profile) => {
      const proc = spawnServer(["--profile", profile])
      try {
        await initializeServer(proc)
        const hashes: string[] = []
        // Repeated themes must be stable; changing the delivered theme must
        // change the digest. Each call still has the harness's 10s deadline.
        for (const font of [
          undefined,
          '"ACME; Sans", sans-serif',
          '"ACME; Sans", sans-serif'
        ]) {
          const args = {
            component: "BarChart",
            props,
            data: props.data,
            ...(font ? { theme: { "--semiotic-font-family": font } } : {})
          }
          const { result } = await sendRequest(proc, "tools/call", {
            name:
              profile === "public" ? "createChart" : "renderInteractiveChart",
            arguments: args
          })
          expect(result.isError).not.toBe(true)
          const svg = result._meta.svg as string
          expect(
            new DOMParser()
              .parseFromString(svg, "image/svg+xml")
              .querySelector("parsererror")
          ).toBeNull()
          if (font) expect(svg).toContain(font)
          let evidence: RenderEvidence
          if (profile === "public") {
            expect(result.structuredContent.status).toBe("render-proven")
            const envelope = result.structuredContent.evidenceEnvelope
            evidence = envelope.render.evidence
            expect(envelope.render.sceneHash).toBe(evidence.sceneHash)
            expect(envelope.render.sceneHashVersion).toBe(2)
            expect(result.structuredContent.render.evidence.sceneHash).toBe(
              evidence.sceneHash
            )
          } else {
            // The developer widget preview is intentionally lossy. Use the
            // full static evidence for the unchanged coordinate context only.
            const staticResult = await sendRequest(proc, "tools/call", {
              name: "renderChart",
              arguments: { ...args, format: "svg" }
            })
            expect(staticResult.result.isError).not.toBe(true)
            const block = staticResult.result.content.find(
              (item: { type: string; text?: string }) =>
                item.type === "text" &&
                item.text?.startsWith("Render evidence:\n")
            )
            evidence = JSON.parse(block.text.slice("Render evidence:\n".length))
          }
          const expected = renderedSceneHash(svg, evidence)
          expect(result._meta.evidence).toMatchObject({
            sceneHash: expected,
            sceneHashVersion: 2
          })
          if (profile === "public") expect(evidence.sceneHash).toBe(expected)
          hashes.push(expected)
        }
        expect(hashes[0]).not.toBe(hashes[1])
        expect(hashes[1]).toBe(hashes[2])
      } finally {
        proc.kill("SIGTERM")
        await waitForProcessExit(proc)
      }
    },
    70_000
  )
})
