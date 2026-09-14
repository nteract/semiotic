import React, { useState } from "react"
import BlogLayout from "./components/BlogLayout.jsx"
import BlogEntryView from "./components/BlogEntryView.jsx"
import BlogEntryCard from "./components/BlogEntryCard.jsx"
import { entriesByDateDesc } from "./entries.js"

/**
 * /blog/ — most recent entry full, then a preview list of the
 * next 10 underneath, with earlier posts available on demand. The break has its
 * own thick band + label so a scrolling reader doesn't lose
 * track of where the article ends.
 */
export default function BlogIndexPage() {
  const [previewCount, setPreviewCount] = useState(10)
  const entries = entriesByDateDesc()
  if (entries.length === 0) {
    return (
      <BlogLayout>
        <div style={styles.empty}>
          <h1>Semiotic Blog</h1>
          <p>No entries yet.</p>
        </div>
      </BlogLayout>
    )
  }
  const [latest, ...rest] = entries
  const previews = rest.slice(0, previewCount)
  return (
    <BlogLayout>
      <BlogEntryView entry={latest} />
      {previews.length > 0 && (
        <>
          <div style={styles.divider}>
            <div style={styles.dividerInner}>
              <span style={styles.dividerLabel}>More from the blog</span>
              <span role="status" style={styles.dividerCount}>
                {previews.length} of {rest.length} earlier posts
              </span>
            </div>
          </div>
          <section style={styles.previews} aria-label="Earlier blog posts">
            {previews.map((e) => (
              <BlogEntryCard key={e.slug} entry={e} />
            ))}
            {previews.length < rest.length && (
              <button type="button" onClick={() => setPreviewCount((count) => count + 10)}>
                Show older posts
              </button>
            )}
          </section>
        </>
      )}
    </BlogLayout>
  )
}

const styles = {
  empty: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "48px 32px",
  },
  // Heavier divider band — the article above ends with body text
  // and the cards below open with bold titles, so the reader needs
  // a clear "section change" beat between them. A full-bleed strip
  // with a tinted background + section label does the lift.
  divider: {
    background: "var(--surface-1, #111118)",
    borderTop: "1px solid var(--surface-3, #2a2a35)",
    borderBottom: "1px solid var(--surface-3, #2a2a35)",
    marginTop: 56,
    marginBottom: 0,
  },
  dividerInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "20px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  dividerLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "var(--text-primary, #e5e7eb)",
    fontWeight: 700,
  },
  dividerCount: {
    fontSize: 12,
    color: "var(--text-secondary, #94a3b8)",
    letterSpacing: "0.04em",
    fontFamily: "var(--font-code, ui-monospace, SFMono-Regular, Menlo, monospace)",
  },
  previews: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "8px 32px 48px",
  },
}
