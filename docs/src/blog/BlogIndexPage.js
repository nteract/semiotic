import React from "react"
import BlogLayout from "./components/BlogLayout.js"
import BlogEntryView from "./components/BlogEntryView.js"
import BlogEntryCard from "./components/BlogEntryCard.js"
import { entriesByDateDesc } from "./entries.js"

/**
 * /blog/ — show the most recent entry in full, then a list of
 * preview cards for the next 10 entries below. "Most recent in
 * full" matches Joel-style classic blog layout: a fresh reader
 * lands on an actual article, not a TOC.
 */
export default function BlogIndexPage() {
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
  const previews = rest.slice(0, 10)
  return (
    <BlogLayout>
      <BlogEntryView entry={latest} />
      {previews.length > 0 && (
        <section style={styles.previews}>
          <h2 style={styles.previewsHeader}>More from the blog</h2>
          {previews.map((e) => (
            <BlogEntryCard key={e.slug} entry={e} />
          ))}
        </section>
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
  previews: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "0 32px 48px",
  },
  previewsHeader: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--text-secondary, #94a3b8)",
    margin: 0,
    marginBottom: 8,
    paddingTop: 36,
    paddingBottom: 4,
    borderTop: "1px solid var(--surface-3, #2a2a35)",
    fontWeight: 600,
  },
}
