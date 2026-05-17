import React from "react"
import { useParams, Navigate, Link } from "react-router-dom"
import BlogLayout from "./components/BlogLayout.js"
import BlogEntryView from "./components/BlogEntryView.js"
import { getEntry, entriesByDateDesc } from "./entries.js"

/**
 * /blog/:slug/ — full single-entry view. Adds a small back-to-index
 * link above the entry header. Unknown slug redirects to /blog/.
 */
export default function BlogEntryPage() {
  const { slug } = useParams()
  const entry = getEntry(slug)
  if (!entry) return <Navigate to="/blog" replace />
  const all = entriesByDateDesc()
  const idx = all.findIndex((e) => e.slug === slug)
  const prev = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null
  const next = idx > 0 ? all[idx - 1] : null
  return (
    <BlogLayout>
      <div style={styles.backstrip}>
        <Link to="/blog" style={styles.back}>{"\u2190"} All entries</Link>
      </div>
      <BlogEntryView entry={entry} />
      {(prev || next) && (
        <nav style={styles.nav}>
          {prev ? (
            <Link to={`/blog/${prev.slug}`} style={styles.navLink}>
              <span style={styles.navLabel}>Previous</span>
              <span style={styles.navTitle}>{prev.title}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/blog/${next.slug}`} style={{ ...styles.navLink, textAlign: "right" }}>
              <span style={styles.navLabel}>Next</span>
              <span style={styles.navTitle}>{next.title}</span>
            </Link>
          ) : <span />}
        </nav>
      )}
    </BlogLayout>
  )
}

const styles = {
  backstrip: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "20px 24px 0",
  },
  back: {
    color: "var(--text-secondary, #94a3b8)",
    textDecoration: "none",
    fontSize: 13,
  },
  nav: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "0 24px 40px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    borderTop: "1px solid var(--surface-3, #2a2a35)",
    paddingTop: 24,
  },
  navLink: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    textDecoration: "none",
    color: "inherit",
  },
  navLabel: {
    fontSize: 12,
    color: "var(--text-secondary, #94a3b8)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  navTitle: {
    fontSize: 15,
    color: "var(--text-primary, #e5e7eb)",
    fontWeight: 500,
  },
}
