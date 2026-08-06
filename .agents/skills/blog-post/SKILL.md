---
name: blog-post
description: Author a new entry for the Semiotic blog. Use this skill whenever the user asks for a blog post, release summary, chart explainer, or case study to publish at /blog/SLUG.
---

# Writing a Semiotic blog post

This skill writes one entry for the Semiotic blog. The blog lives at
`/blog/`; entries live at `/blog/<slug>/`. Three story shapes are
supported — pick the one that matches what's being written:

1. **Chart explainer** — single chart, "what / why / when / wiring".
2. **Release summary** — what's new in a version, ordered by impact.
3. **Narrative / case study** — comparative posts ("X vs Y"),
   walkthroughs, recreations of historical visualizations.

Every entry follows the same structure regardless of shape. The
**why-care** section is non-negotiable: the post has to give the
reader a reason to read it that lands even if they're not currently
using Semiotic. The blog isn't reference docs; it's a publication
that happens to be hosted on the docs site.

## Before writing anything

**Ask the user for the author byline** unless they've already given
one. Don't assume "Elijah Meeks" by default — many entries will be
co-authored or attributed to "Semiotic Team" for releases. One short
question, then proceed.

## File structure

For a new entry with slug `<slug>`:

1. **Body component** — `docs/src/blog/entries/<slug>.jsx`. Default
   export is `{ slug, title, subtitle, author, date, tags, excerpt,
   component, ogChart? }`. The `component` is a React function
   returning JSX (the entry's body — no header, no chrome, the
   `BlogEntryView` wraps it).
2. **Register in registry** — `docs/src/blog/entries.js` imports
   the new file and adds it to `blogEntries`.
3. **Register in metadata mirror** — `docs/src/blog/entries-meta.js`
   gets the same metadata object (without `component`, without the
   React imports). This mirror is read by the OG-card generator
   and the prerender script, both of which run under plain Node
   and can't load JSX.

Both registry files must stay in sync. The OG-card generator and
prerender script read `entries-meta.js`; the React app reads
`entries.js`.

## Required fields

```js
{
  slug: "kebab-case-route",
  title: "Title-Case Headline",
  subtitle: "One or two sentences orienting the reader.",
  author: "Author Name",                  // ASK THE USER if unspecified
  date: "YYYY-MM-DD",                     // ISO; controls sort order
  tags: ["release"] | ["chart-explainer", "xy"] | ...,
  excerpt: "2–3 sentence preview shown on the index card.",
  component: Body,                        // function returning JSX
  ogChart: { component: "DifferenceChart" }, // optional, see OG step
}
```

### Tags vocabulary

Pick freely from:

- **Shape**: `release`, `chart-explainer`, `case-study`, `tutorial`
- **Family**: `xy`, `network`, `geo`, `ordinal`, `realtime`,
  `hierarchy`

Multi-tag is fine and encouraged. Don't invent new top-level tags
without checking the existing taxonomy in `entries.js`.

## The skeleton — applies to all shapes

Every entry MUST have these sections (with the names below as h2
headings, except the intro):

1. **Opening paragraph** (no heading) — one paragraph that orients
   the reader. State the chart / topic in concrete terms. Don't
   start with "In this post we will…". Start with the thing.
2. **Why this exists / why care** — answer "why should I care about
   this if I'm not currently using Semiotic?". Even chart-explainer
   posts need this: tell the data-viz audience what makes the
   chart-type interesting, then connect it to Semiotic's
   implementation.
3. **The thing itself** — live demo, or release-note bullets, or
   the comparative pair. This is the meat. Show, don't tell.
4. **How to read / how it works** — once the reader has seen the
   thing, walk them through how to read the visual encoding (for
   chart posts) or where to look for the API change (for releases).
5. **When to reach for it / when not** — guidance. Pair every "use
   it for X" with "don't use it for Y, use Z instead". This is
   the section that earns the reader's trust.
6. **Wiring it up** — minimal code snippet showing the prop shape.
   For releases, link to the changelog and migration notes.
7. **Related** — link to neighbor charts, related features, and
   the full reference page.

The Why and the When-to-reach sections are what distinguish a
Semiotic blog post from the reference docs at `/charts/<name>`.
The reference doc tells you what's there; the blog post tells you
when you'd care.

## Story-shape specifics

### Chart explainer

- Title format: `<ChartName>, explained`.
- Opening: one-sentence elevator pitch. ("DifferenceChart is the
  chart you reach for when the story is the gap between two
  series, not either series on its own.")
- Why-care section: cover the general data-viz problem the chart
  solves, NOT the Semiotic-specific API. The same audience that
  reads HN data-viz threads should find this useful. Then add a
  paragraph relating it to Semiotic's implementation (e.g. "in
  Semiotic this is wired through…").
- Live demo: one self-contained chart with inline synthetic data.
  Keep the data small enough that the reader can imagine the
  underlying rows (5–15 rows is the sweet spot).
- When-to-reach section: list 3–5 cases for it, then 3 cases
  against it pointing to the right alternative chart.
- Wiring section: ≤15 lines of code. Just the minimum props.
- **Streaming / push mode section** — REQUIRED for every chart
  explainer. Three pieces:
  1. **A live push demo** using `BlogPushDemo` from
     `docs/src/blog/components/BlogPushDemo.jsx`. Hand it a
     `chartRef`, the `frames` array (one entry per step), a
     `pushAt(ref, row, i)` callback that calls the chart's
     push method, and a `resetAt(ref)` callback that calls
     `clear()`. The demo gives the reader Play / Step / Reset
     controls and a step counter for free.
  2. **A push-mode wiring snippet** — ≤15 lines — showing the
     ref, the `push()` / `update()` calls relevant to the
     chart, and any required `*IdAccessor` (XY charts want
     `pointIdAccessor`; ordinal charts want `dataIdAccessor`;
     network HOCs use `nodeIDAccessor` / `edgeIdAccessor`).
  3. **A "why push helps here" paragraph** specific to this
     chart's nature. Generic boilerplate is worthless; the
     story has to land on a property the reader can map back
     to their own code. Examples from the seeded entries:
       - DifferenceChart: segment recomputation is cheap and
         in-buffer; setting `data` on every tick triggers
         React reconciliation that push skips.
       - QuadrantChart: `update(id, fn)` mutates one point
         without re-keying the rest; preserves hover and
         in-flight tooltips.
       - FunnelChart: bar-and-trapezoid size deltas are
         animated; `data` resets lose the animation.
  Charts that explicitly DO NOT support push (hierarchy HOCs:
  OrbitDiagram, TreeDiagram, Treemap, CirclePack) get a
  different streaming section that explains WHY push doesn't
  apply (the layout reads the full tree, not incremental
  appends) and the pattern that does work (set the `data`
  prop to a new tree; the chart's transitions still ease
  cleanly between trees).
- Tags: `["chart-explainer", "<family>"]`.

#### Push-mode demo skeleton

Inside the entry file, alongside the static `Body` function,
declare a `PushDemo` function that wires `BlogPushDemo`:

```jsx
function PushDemo() {
  const chartRef = useRef(null)
  return (
    <div style={chartFrame}>
      <ThemeProvider theme="carbon-dark">
        <BlogPushDemo
          chartRef={chartRef}
          frames={DEMO_DATA}                 // array, one item per step
          pushAt={(ref, row) => ref?.push?.(row)}
          resetAt={(ref) => ref?.clear?.()}
        >
          <YourChart
            ref={chartRef}
            // ...the same props as the static demo, MINUS `data`
            pointIdAccessor="id"             // or dataIdAccessor etc.
          />
        </BlogPushDemo>
      </ThemeProvider>
    </div>
  )
}
```

Then reference `<PushDemo />` from inside `<Body>`'s streaming
section. Keep the same chart frame styling as the static demo so
the visual continuity between the two reads as "same chart, two
flavors."

### Release summary

- Title format: `Semiotic <X.Y.Z>` (no "released today" or other
  date-stamped language; the entry's own date carries that).
- Opening: one sentence summarizing the release's theme ("3.5.2 is
  mostly a factor-and-extend release."). Link to the full
  CHANGELOG entry on GitHub.
- Why-care section: optional for releases, but if there's a
  big-picture story (new hook family, new chart, architecture
  shift) tell it here.
- Sections: one h2 per major feature group, ordered by impact.
  Use the actual feature names so the reader can grep CHANGELOG.
- Upgrade notes h2: any breakages or behavior changes, even small
  ones. Be explicit about what to do if affected.
- No live demos required; link to the docs pages for new features.
- Tags: `["release"]`.

### Narrative / case study

- Title format: pick a memorable one. `X vs Y` works; so does
  `<famous-thing>, rebuilt in Semiotic`.
- Opening: state the comparison or the recreation in the first
  paragraph. Include the punchline. Don't bury it.
- Why-care section: the reader is here because the topic is
  interesting independently of Semiotic. Lean into that. If
  you're rebuilding Minard's map, say what makes Minard's map
  the canonical example of data-viz composition. If you're
  comparing two chart types, say what makes the question
  "which one?" hard.
- Multiple demos throughout. Comparative posts ideally show the
  two charts side-by-side or stacked.
- Add a final h2 that lists 3–5 OTHER domains where the same
  story plays out. ("This pattern also shows up in
  pull-request lifecycle, supply-chain logistics, financial
  settlement, manufacturing rework.") The blog audience often
  isn't in the example domain; the cross-references are what
  make the post useful.
- Tags: `["case-study", ...]`. Add a family tag if the post is
  centered on one chart family.

## OG card

Each entry produces a 1200×630 PNG at
`docs/public/blog/og/<slug>.png` for social previews. Layout:

- Left 2/3 — designed text: "Semiotic · BLOG" brand row, large
  title, subtitle, byline + date, tags row.
- Right 1/3 — chart panel. When `ogChart` is set in metadata, the
  generator renders that chart via `semiotic/server`'s
  `renderChart` and embeds the SVG. When omitted (release-summary
  posts, narrative posts without a single canonical chart), the
  panel renders a brand placeholder.

To add a chart preview:

```js
ogChart: {
  component: "DifferenceChart",      // chart name as known to renderChart
  props: { /* optional overrides */ }
}
```

Supported chart components live in
`scripts/generate-blog-og-cards.mjs`'s `OG_CHART_PRESETS`. Add a
new preset there if the chart you want isn't listed — preset
fields are `chartType` + `defaults` (props object). The
`renderChart` function only knows the chart families it has
config for; check `src/components/server/serverChartConfigs.ts`
to see what's supported. Charts not in `renderChart` (e.g.
QuadrantChart, OrbitDiagram, AnscombesSankey, MinardsMarch) fall
through to the brand-only card.

Run `npm run generate:blog-og-cards` after registering a new
entry to refresh `docs/public/blog/og/<slug>.png`. The website
build pipeline runs this automatically (it sits between
`generate:demo-gifs` and `parcel build` in `website:build`).

## SEO / pre-rendering

The blog inherits the docs' static-prerender path
(`scripts/prerender.mjs`). For each blog entry, the script:

- Reads metadata from `docs/src/blog/entries-meta.js`.
- Writes `docs/build/blog/<slug>/index.html` with the title set
  to `<entry-title> — Semiotic Blog`.
- Injects per-entry `<meta name="description">`,
  `og:type=article`, `og:title`, `og:description`, `og:image`
  (the rendered card PNG), `article:published_time`,
  `article:author`, per-tag `article:tag`, the full
  `twitter:summary_large_image` block, and a `BlogPosting`
  JSON-LD payload.

No additional wiring required — registering the entry in
`entries-meta.js` is what the prerender script reads. Crawlers
get a fully-resolved meta block; humans get the same SPA-loaded
React experience.

## Verification

Before declaring an entry done, run:

```bash
# Typecheck
npm run typescript

# OG card generation
npm run generate:blog-og-cards

# Open in dev server after building the library
npm run website:start   # → http://localhost:3000/blog/<slug>/
```

Check that:

- The entry appears in `/blog/` (most recent in full, or in the
  preview list below).
- The entry renders at `/blog/<slug>/` with title, subtitle,
  byline, tags, and body content.
- The OG card PNG was written and has the entry's title,
  subtitle, byline, and (if `ogChart` set) a rendered chart on
  the right.
- The site builds: `npm run website:build` succeeds and
  `docs/build/blog/<slug>/index.html` has the entry-specific
  meta tags injected into `<head>`.

## Template starter

A starter template is in `templates/`. Copy the shape that
matches what you're writing:

- `templates/chart-explainer.js`
- `templates/release-summary.js`
- `templates/narrative.js`

Each template has placeholder sections at the right heading
levels and TODO comments at each spot the author needs to fill
in. Use the templates as a checklist — every TODO needs an
answer before publishing.
