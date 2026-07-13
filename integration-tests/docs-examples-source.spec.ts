import { expect, test } from "@playwright/test"
import { EXAMPLES } from "../docs/src/pages/examples/examplesManifest.js"

type BrowserProblem = {
  kind: "console" | "pageerror"
  message: string
}

/**
 * A few flagship examples intentionally fetch live third-party data on mount
 * (civic records, weather, a public edit stream) and are designed to degrade
 * to an explicit "unavailable" notice per source when that data can't be
 * reached — see e.g. docs/src/pages/examples/localGovernmentData.js. Even
 * though the app already handles the rejected fetch/EventSource, the browser
 * itself still emits a console message for a blocked/failed cross-origin
 * request ("blocked by CORS policy", "net::ERR_FAILED") whenever the upstream
 * service has a hiccup — that's true regardless of app-level error handling.
 * The generic "net::ERR_FAILED" message doesn't name the offending host, so
 * it's matched against actual failed requests (`requestfailed`) rather than
 * message text. Tolerate it only when the failed request itself hit a host a
 * given route intentionally reaches, so a genuinely broken lazy import or
 * same-origin asset failure still fails the route contract for every route.
 */
const NATIVE_NETWORK_FAILURE = /blocked by CORS policy|net::ERR_FAILED/
const LIVE_EXTERNAL_DATA_HOSTS_BY_ROUTE: Record<string, string[]> = {
  "/examples/local-government-explorer": [
    "api.usaspending.gov",
    "api.zippopotam.us",
    "datasets-server.huggingface.co",
    "geo.fcc.gov",
    "www.fema.gov",
    "data.seattle.gov",
    "data.sfgov.org",
    "data.cityofchicago.org",
    "data.austintexas.gov",
  ],
  "/examples/climate-anomaly": ["api.open-meteo.com", "archive-api.open-meteo.com", "geocoding-api.open-meteo.com"],
  "/examples/climate-radial-weather": [
    "api.open-meteo.com",
    "archive-api.open-meteo.com",
    "geocoding-api.open-meteo.com",
  ],
  "/examples/wikipedia-realtime": ["stream.wikimedia.org"],
}

function isExpectedLiveDataNetworkProblem(
  problem: BrowserProblem,
  allowedHosts: string[],
  failedRequestHosts: string[],
): boolean {
  if (problem.kind !== "console" || !NATIVE_NETWORK_FAILURE.test(problem.message)) return false
  if (allowedHosts.some((host) => problem.message.includes(host))) return true
  return failedRequestHosts.some((host) => allowedHosts.includes(host))
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
        const failedRequestHosts: string[] = []

        page.on("console", (message) => {
          if (message.type() === "error") {
            problems.push({ kind: "console", message: message.text() })
          }
        })
        page.on("pageerror", (error) => {
          problems.push({ kind: "pageerror", message: error.message })
        })
        page.on("requestfailed", (request) => {
          try {
            failedRequestHosts.push(new URL(request.url()).host)
          } catch {
            // Malformed/opaque request URL — nothing to correlate against.
          }
        })

        for (const example of examples) {
          const before = problems.length
          const hostsBefore = failedRequestHosts.length
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

          const allowedHosts = LIVE_EXTERNAL_DATA_HOSTS_BY_ROUTE[example.path] ?? []
          const routeFailedHosts = failedRequestHosts.slice(hostsBefore)
          const routeProblems = problems
            .slice(before)
            .filter((problem) => !isExpectedLiveDataNetworkProblem(problem, allowedHosts, routeFailedHosts))
          expect(routeProblems, `source route ${example.path} emitted browser errors`).toEqual([])
        }
      },
    )
  }
})
