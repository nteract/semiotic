import React from "react"
import { Link } from "react-router-dom"
import { formatBlogDate } from "../dateUtils.js"

/**
 * Preview card used in the index. Compact, click-target = whole
 * card. Tags rendered as pill chips matching the entry-view style.
 */
export default function BlogEntryCard({ entry }) {
  const dateLabel = formatBlogDate(entry.date)
  return (
    <Link to={`/blog/${entry.slug}`} style={styles.card}>
      <article>
        <h2 style={styles.title}>{entry.title}</h2>
        <p style={styles.subtitle}>{entry.subtitle}</p>
        <div style={styles.metaRow}>
          <div style={styles.byline}>
            <span style={styles.author}>{entry.author}</span>
            <span style={styles.dot}>·</span>
            <time dateTime={entry.date}>{dateLabel}</time>
          </div>
          {entry.tags?.length > 0 && (
            <ul style={styles.tags}>
              {entry.tags.map((t) => (
                <li key={t} style={styles.tag}>{t}</li>
              ))}
            </ul>
          )}
        </div>
        {entry.excerpt && <p style={styles.excerpt}>{entry.excerpt}</p>}
      </article>
    </Link>
  )
}

const styles = {
  card: {
    display: "block",
    padding: "24px 0",
    borderBottom: "1px solid var(--surface-3, #2a2a35)",
    textDecoration: "none",
    color: "inherit",
  },
  title: {
    fontSize: 26,
    fontWeight: 600,
    margin: 0,
    marginBottom: 6,
    color: "var(--text-primary, #e5e7eb)",
    lineHeight: 1.25,
    letterSpacing: "-0.015em",
  },
  subtitle: {
    fontSize: 16,
    margin: 0,
    marginBottom: 12,
    color: "var(--text-secondary, #94a3b8)",
    lineHeight: 1.5,
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  byline: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    fontSize: 13,
    color: "var(--text-secondary, #94a3b8)",
  },
  author: { fontWeight: 600, color: "var(--text-primary, #e5e7eb)" },
  dot: { opacity: 0.5 },
  tags: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-primary, #e5e7eb)",
    background: "var(--surface-2, #1a1a22)",
    border: "1px solid var(--surface-3, #2a2a35)",
    padding: "2px 8px",
    borderRadius: 999,
  },
  excerpt: {
    fontSize: 15,
    margin: 0,
    color: "var(--text-secondary, #94a3b8)",
    opacity: 0.85,
    lineHeight: 1.65,
    maxWidth: 760,
  },
}
