import React from "react"
import { Link } from "react-router-dom"

/**
 * Preview card used in the index. Compact: title, subtitle, byline,
 * date, tag chips, excerpt. Click-target is the whole card via the
 * outer Link. No OG image rendered here — the cards stay text-first
 * so the index scans cleanly. (OG images get used by social/search
 * crawlers, not in-page.)
 */
export default function BlogEntryCard({ entry }) {
  const dateLabel = new Date(entry.date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
  return (
    <Link to={`/blog/${entry.slug}`} style={styles.card}>
      <article>
        <div style={styles.meta}>
          <span>{entry.author}</span>
          <span style={styles.dot}>·</span>
          <time dateTime={entry.date}>{dateLabel}</time>
        </div>
        <h2 style={styles.title}>{entry.title}</h2>
        <p style={styles.subtitle}>{entry.subtitle}</p>
        <p style={styles.excerpt}>{entry.excerpt}</p>
        <ul style={styles.tags}>
          {entry.tags.map((t) => (
            <li key={t} style={styles.tag}>#{t}</li>
          ))}
        </ul>
      </article>
    </Link>
  )
}

const styles = {
  card: {
    display: "block",
    padding: "20px 0",
    borderBottom: "1px solid var(--surface-3, #2a2a35)",
    textDecoration: "none",
    color: "inherit",
  },
  meta: {
    fontSize: 12,
    color: "var(--text-secondary, #94a3b8)",
    marginBottom: 6,
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  dot: { opacity: 0.5 },
  title: {
    fontSize: 22,
    fontWeight: 600,
    margin: 0,
    marginBottom: 4,
    color: "var(--text-primary, #e5e7eb)",
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: 15,
    margin: 0,
    marginBottom: 8,
    color: "var(--text-secondary, #94a3b8)",
    lineHeight: 1.5,
  },
  excerpt: {
    fontSize: 14,
    margin: 0,
    marginBottom: 10,
    color: "var(--text-secondary, #94a3b8)",
    opacity: 0.85,
    lineHeight: 1.6,
  },
  tags: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 12,
  },
  tag: {
    color: "var(--text-secondary, #94a3b8)",
    fontFamily: "var(--semiotic-tick-font-family, ui-monospace, SFMono-Regular, Menlo, monospace)",
    opacity: 0.7,
  },
}
