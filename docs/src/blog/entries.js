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
 *
 *     // Set `draft: true` to keep an entry out of the index list, the
 *     // RSS feed, and SEO prerender meta. The route still resolves at
 *     // /blog/<slug>/ so authors can preview before publishing.
 *     draft?: boolean
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
import Release354 from "./entries/release-3-5-4.js"
import Release353 from "./entries/release-3-5-3.js"
import MinardsMarch from "./entries/minards-march.js"
import Release352 from "./entries/release-3-5-2.js"
import DifferenceChartExplainer from "./entries/difference-chart.js"
import QuadrantChartExplainer from "./entries/quadrant-chart.js"
import FunnelChartExplainer from "./entries/funnel-chart.js"
import OrbitDiagramExplainer from "./entries/orbit-diagram.js"
import ChartsThatKnow from "./entries/charts-that-know-what-theyre-for.js"
import MultimodalResponse from "./entries/multimodal-response.js"
import AnchoredConversations from "./entries/anchored-conversations.js"
import LiveDashboard from "./entries/live-conversational-dashboard.js"
import Release360 from "./entries/release-3-6-0.js"
import TalkTrackIntelligence from "./entries/talk-track-intelligence.js"
import FromSpecToRuntime from "./entries/from-spec-to-runtime.js"
import ScaleAwareSuggestions from "./entries/scale-aware-suggestions.js"
import AuditingWhatYouCantSee from "./entries/auditing-what-you-cant-see.js"
import WhatAScreenReaderShouldHear from "./entries/what-a-screen-reader-should-hear.js"
import NavigatingAChartYouCantSee from "./entries/navigating-a-chart-you-cant-see.js"
import WhatAnAnnotationShouldCarry from "./entries/what-an-annotation-should-carry.js"
import AnnotationsThatLeadAndLand from "./entries/annotations-that-lead-and-land.js"
import AnnotationsThatMakeRoomAndMakeSense from "./entries/annotations-that-make-room-and-make-sense.js"
import AnnotationsThatAdaptAndTravel from "./entries/annotations-that-adapt-and-travel.js"

/**
 * Every entry, drafts included. Consumers that need the full list (direct
 * URL access, sync check) read this. Consumers that should NEVER surface
 * drafts (index listing, RSS, SEO prerender) read `blogEntries` below.
 */
export const allBlogEntries = [
  AnnotationsThatAdaptAndTravel,
  AnnotationsThatMakeRoomAndMakeSense,
  AnnotationsThatLeadAndLand,
  WhatAnAnnotationShouldCarry,
  NavigatingAChartYouCantSee,
  WhatAScreenReaderShouldHear,
  AuditingWhatYouCantSee,
  ScaleAwareSuggestions,
  Release360,
  FromSpecToRuntime,
  TalkTrackIntelligence,
  LiveDashboard,
  AnchoredConversations,
  MultimodalResponse,
  ChartsThatKnow,
  Release354,
  Release353,
  ProcessSankeyVsClassicSankey,
  MinardsMarch,
  Release352,
  DifferenceChartExplainer,
  QuadrantChartExplainer,
  FunnelChartExplainer,
  OrbitDiagramExplainer,
]

/**
 * Published entries — the canonical reader-facing list. Filters out anything
 * marked `draft: true`. Used by the blog index, RSS feed, and prerender.
 */
export const blogEntries = allBlogEntries.filter((entry) => !entry.draft)

/**
 * Slug lookup intentionally returns drafts too. Drafts must be routable so
 * authors can preview them before publishing — the listings and feeds are
 * the surfaces that filter, not the URL space.
 */
export function getEntry(slug) {
  return allBlogEntries.find((e) => e.slug === slug)
}

export function entriesByDateDesc() {
  return [...blogEntries].sort((a, b) => (a.date < b.date ? 1 : -1))
}
