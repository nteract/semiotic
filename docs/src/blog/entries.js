/**
 * Blog entry registry.
 *
 * Each entry is a plain object — no MDX, no filesystem scanning, no
 * build-time codegen. The list order IS the published order (most
 * recent first); the OG-card pipeline and prerender meta both walk
 * this same array, so adding an entry is a single registration here.
 *
 * Shape (enforced by the blog-post skill, but documented here too):
 *
 *   {
 *     slug:     string          // URL segment under /blog/<slug>/
 *     title:    string          // h1 on the entry page
 *     subtitle: string          // 1-2 sentence orientation
 *     author:   string          // byline
 *     date:     string          // ISO yyyy-mm-dd; controls sort
 *     tags:     string[]        // free-form, see TAGS below
 *     excerpt:  string          // 2-3 sentence preview card body
 *     component: () => JSX.Element  // entry body; rendered inside BlogEntryPage
 *
 *     // Optional OG-card customization. The OG renderer reserves
 *     // the right third of the card for a chart preview. Supply a
 *     // SSR-renderable spec via `ogChart` if you want a different
 *     // chart than the first one shown in the entry.
 *     ogChart?: { component: string, props: Record<string, unknown> }
 *   }
 *
 * Tags vocabulary (additive — don't be precious):
 *   - release          version-summary posts
 *   - chart-explainer  single-chart "what / when / how" posts
 *   - case-study       narrative posts that compare approaches
 *   - tutorial         step-by-step builds
 *   - xy | network | geo | ordinal | realtime | hierarchy   chart-family tags
 */

import ProcessSankeyVsClassicSankey from "./entries/process-sankey-vs-classic-sankey.js"
import MinardsMarch from "./entries/minards-march.js"
import Release352 from "./entries/release-3-5-2.js"
import DifferenceChartExplainer from "./entries/difference-chart.js"
import QuadrantChartExplainer from "./entries/quadrant-chart.js"
import FunnelChartExplainer from "./entries/funnel-chart.js"
import OrbitDiagramExplainer from "./entries/orbit-diagram.js"

export const blogEntries = [
  ProcessSankeyVsClassicSankey,
  MinardsMarch,
  Release352,
  DifferenceChartExplainer,
  QuadrantChartExplainer,
  FunnelChartExplainer,
  OrbitDiagramExplainer,
]

export function getEntry(slug) {
  return blogEntries.find((e) => e.slug === slug)
}

export function entriesByDateDesc() {
  return [...blogEntries].sort((a, b) => (a.date < b.date ? 1 : -1))
}
