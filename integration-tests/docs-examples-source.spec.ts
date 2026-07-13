import { expect, test } from "@playwright/test"
import { EXAMPLES } from "../docs/src/pages/examples/examplesManifest.js"

type BrowserProblem = {
  kind: "console" | "pageerror"
  message: string
}

// A cold Vite process transforms many large lazy route modules on first use.
// Keep each assertion batch small enough to localize a slow page while
// preserving one server/module cache for the complete manifest walk.
const ROUTES_PER_BATCH = 8
const EXAMPLE_ROUTE_BATCHES = Array.from(
  { length: Math.ceil(EXAMPLES.length / ROUTES_PER_BATCH) },
  (_, index) => EXAMPLES.slice(index * ROUTES_PER_BATCH, (index + 1) * ROUTES_PER_BATCH),
)

/**
 * This is deliberately a route-load contract, not a visual or interaction
 * suite. Every narrative example has its own stateful/animated behavior, so
 * a single deterministic readiness predicate would be misleading. What all
 * examples must guarantee is that the authored source page, its public
 * Semiotic imports, and its initial chart mount can execute without a browser
 * exception or console error.
 */
test.describe("docs example source route smoke", () => {
  // The batches deliberately share Vite's transform cache but run one at a
  // time: parallel cold loads turn this broad integrity gate into a CPU and
  // memory contention benchmark on smaller CI runners.
  test.describe.configure({ mode: "serial" })

  for (const [batchIndex, examples] of EXAMPLE_ROUTE_BATCHES.entries()) {
    const firstPath = examples[0]?.path ?? ""
    const lastPath = examples.at(-1)?.path ?? ""

    test(
      `mounts example source routes ${batchIndex + 1}/${EXAMPLE_ROUTE_BATCHES.length} (${firstPath} through ${lastPath})`,
      async ({ page }) => {
        const problems: BrowserProblem[] = []

        page.on("console", (message) => {
          if (message.type() === "error") {
            problems.push({ kind: "console", message: message.text() })
          }
        })
        page.on("pageerror", (error) => {
          problems.push({ kind: "pageerror", message: error.message })
        })

        for (const example of examples) {
          const before = problems.length
          await test.step(example.path, async () => {
            await page.goto(example.path, { waitUntil: "domcontentloaded" })

            // ExamplePageLayout owns the H1 for all manifest entries. Requiring its
            // title proves the lazy route module loaded and the page completed its
            // first React commit, rather than merely receiving the SPA shell.
            await expect(page.getByRole("heading", { level: 1, name: example.title })).toBeVisible({
              timeout: 60_000,
            })
            await page.evaluate(async () => {
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
            })
          })

          const routeProblems = problems.slice(before)
          expect(routeProblems, `source route ${example.path} emitted browser errors`).toEqual([])
        }
      },
    )
  }
})
