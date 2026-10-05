import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { renderChartWithEvidence } from "../../src/components/server/renderToStaticSVG"
import { auditAccessibility } from "../../src/components/charts/shared/auditAccessibility"
import { resolutionChartProps } from "../../src/components/recipes/atlas/resolution/chartProps"
import {
  defaultResolutionView,
  projectResolutionView
} from "../../src/components/recipes/atlas/resolution/project"
import { exportResolutionEvidence } from "../../src/components/recipes/atlas/resolution/evidence"
import { flagship } from "./fixtures"

// Owning generator for the reviewable static editions; no browser or animation is required.
const directory = resolve(
  process.argv[2] ?? "/private/tmp/semiotic-network-resolution"
)
mkdirSync(directory, { recursive: true })
const resolution = flagship()
const escape = (value: unknown) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
const figures: string[] = []
for (const mode of ["resolution-atlas", "boundary-loom"] as const) {
  const view = {
    ...defaultResolutionView(resolution, mode),
    pageIds: resolution.pages
      .slice(0, mode === "resolution-atlas" ? 4 : 5)
      .map((p) => p.id)
  }
  const projection = projectResolutionView(resolution, view)
  const props = {
    ...resolutionChartProps(
      { resolution, view, width: 1200, height: 760 },
      mode
    ),
    accessibleTable: true
  }
  const { svg, evidence } = renderChartWithEvidence("NetworkCustomChart", props)
  const accessibility = auditAccessibility("NetworkCustomChart", props)
  if (!Object.values(evidence.markCountByType).some((count) => count > 0))
    throw new Error("Static edition drew no data marks")
  writeFileSync(resolve(directory, `${mode}.svg`), svg)
  writeFileSync(
    resolve(directory, `${mode}.evidence.json`),
    JSON.stringify(
      {
        revision: resolution.revision,
        analysisRevision: resolution.analysisRevision,
        evidence,
        accessibility,
        disclosure: projection.disclosure,
        edgeCoverage: projection.edgeCoverageByPage
      },
      null,
      2
    )
  )
  figures.push(
    `<figure><h2>${escape(props.title)}</h2>${svg}<figcaption>${escape(projection.caption)}</figcaption></figure>`
  )
}
writeFileSync(
  resolve(directory, "e17.evidence.json"),
  JSON.stringify(
    exportResolutionEvidence(resolution, {
      kind: "original-edge",
      edgeId: "e17"
    }),
    null,
    2
  )
)
writeFileSync(
  resolve(directory, "index.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Network Resolution — static editions</title><style>body{font:16px system-ui;margin:2rem;color:#243640;max-width:1250px}figure{margin:2rem 0}svg{max-width:100%;height:auto}figcaption{line-height:1.5}</style><h1>Network Resolution</h1><p>Authored synthetic fixture. The automatic planner also folds x–y early; the supplied reference instead authors that merge on page 3. Both retain all 18 edge records and cycle rank 5.</p>${figures.join("\n")}<p>Experimental schema 0.1. Source revision: ${escape(resolution.revision.sourceRevision)}.</p></html>`
)
console.log(
  `Wrote static SVG editions, accessibility/render evidence, and review page to ${directory}`
)
// Rendering imports retain runtime handles. All edition writes above are synchronous.
process.exit(0)
