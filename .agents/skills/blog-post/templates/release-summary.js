// TEMPLATE — release summary
//
// Replace every TODO before publishing. Pull facts from
// CHANGELOG.md; the changelog is canonical, the blog post is the
// audience-facing translation.
//
// Naming: slug = "release-X-Y-Z". Title = "Semiotic X.Y.Z".

import React from "react"

function Body() {
  return (
    <>
      {/* OPENING — one sentence on the release's theme, one
          sentence linking to the full changelog. */}
      <p>
        {/* TODO: theme sentence. ("3.5.2 is mostly a factor-and-
            extend release." / "3.6 ships a new chart family." /
            "3.5.3 is a fast-follow bug fix.") */}
        {/* TODO: link to full changelog on GitHub. */}
        Full release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#TODO-anchor"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      {/* Optional WHY-CARE — only include if the release has a
          big-picture story (new hook family, new chart, arch
          shift). Skip for routine bug-fix releases. */}
      {/*
      <h2 id="why-care">Why this matters</h2>
      <p>
        TODO: 2–4 sentences on the arc — what's been building, why
        this release matters for users at large.
      </p>
      */}

      {/* SECTIONS — one h2 per major feature group, ordered by
          impact. Use the actual feature names from CHANGELOG so
          readers can grep. */}

      <h2 id="todo-feature-group-1">TODO Major feature group 1</h2>
      <p>
        {/* TODO: opening paragraph for this feature group. */}
      </p>
      <ul>
        {/* TODO: bullets — name each feature inline as code, brief
            description (1–3 sentences each). Link to docs page. */}
        <li>
          <strong>
            <code>featureName</code>
          </strong>{" "}
          — TODO description.
        </li>
      </ul>

      <h2 id="todo-feature-group-2">TODO Major feature group 2</h2>
      <p>{/* TODO */}</p>

      <h2 id="other-fixes">Other fixes worth mentioning</h2>
      <ul>
        {/* TODO: shorter list — anything that didn't warrant its
            own h2 but is worth a sentence. Performance, smaller
            bug fixes, docs improvements. */}
        <li>
          <strong>TODO fix.</strong> Brief description.
        </li>
      </ul>

      <h2 id="upgrade-notes">Upgrade notes</h2>
      {/* UPGRADE NOTES — required if there are any breaking
          changes or behavior changes, even small ones. Be
          explicit about what to do if affected. If the release
          is purely additive, this section can be omitted; the
          skill won't complain. */}
      <p>
        {/* TODO: opening sentence about scope of changes. */}
        Most of TODO_VERSION is additive.
        {/* TODO: list breaking changes if any. */}
      </p>
      <ul>
        <li>
          <strong>TODO change.</strong> What broke; what to do
          about it.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "release-TODO-X-Y-Z",            // e.g. "release-3-5-2"
  title: "Semiotic TODO X.Y.Z",
  subtitle: "TODO one-sentence summary of the release theme.",
  author: "TODO ASK USER",              // typically "Elijah Meeks" or "Semiotic Team"
  date: "TODO YYYY-MM-DD",              // release date from CHANGELOG
  tags: ["release"],
  excerpt: "TODO 2–3 sentence preview hitting the release's headline features.",
  component: Body,
  // Release posts typically don't have a single canonical chart
  // for the OG card. Omit `ogChart` so the card falls back to
  // the brand-only layout.
}

// REMEMBER:
//   1. Add to docs/src/blog/entries.js (import + push into blogEntries).
//   2. Add metadata-only copy to docs/src/blog/entries-meta.js.
//   3. Run `npm run generate:blog-og-cards`.
//   4. Verify at http://localhost:3000/blog/<slug>/.
