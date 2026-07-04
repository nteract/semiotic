import React from "react"
import { formatBlogDate } from "../dateUtils.js"

/**
 * Single-entry rendering. Layout:
 *
 *   Title (full content-width, large)
 *   Subtitle (one or two lines, slightly muted)
 *   ── thin separator ──
 *   Author · Date  Tags as pill chips (right-aligned on one row)
 *   Body
 *
 * The container is wider than a reference-doc reading column (max
 * 960 px instead of 720) because the blog has no sidebar; the
 * extra width gives charts and tables more room without crowding
 * the text. Body paragraphs still cap at a readable measure via
 * the `bodyText` style.
 */
export default function BlogEntryView({ entry }) {
  const Body = entry.component
  const dateLabel = formatBlogDate(entry.date)
  return (
    <article style={styles.article}>
      {/* `div` instead of semantic `<header>` because the docs'
          global stylesheet pins every `header` to `display: flex`
          (it owns the docs top bar). That collapsed the entry's
          title onto a 235-px column inside the flex header. */}
      <div style={styles.header}>
        {entry.draft && (
          <div style={styles.draftBanner}>
            <span style={styles.draftBadge}>DRAFT</span>
            <span style={styles.draftNote}>
              Unlisted — not in the blog index, RSS, or search engines. Flip{" "}
              <code>draft: true</code> off in the entry's registry to publish.
            </span>
          </div>
        )}
        <h1 style={styles.title}>{entry.title}</h1>
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
      </div>
      <div style={styles.body}>
        <Body />
      </div>
    </article>
  )
}

const styles = {
  article: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "48px 32px 24px",
  },
  header: {
    marginBottom: 36,
    paddingBottom: 24,
    borderBottom: "1px solid var(--surface-3, #2a2a35)",
  },
  // Title scales with the wider container — bigger than a doc h1
  // because the blog header is the chart of the page.
  title: {
    fontSize: 44,
    fontWeight: 700,
    lineHeight: 1.15,
    margin: 0,
    marginBottom: 14,
    color: "var(--text-primary, #e5e7eb)",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 20,
    color: "var(--text-secondary, #94a3b8)",
    lineHeight: 1.5,
    margin: 0,
    marginBottom: 20,
    fontWeight: 400,
    maxWidth: 860,
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  byline: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 14,
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
  // Bean / pill tag. Pinned to the carbon-blue token so the chips
  // stand out without dominating the byline. Lowercase content, no
  // hash prefix — the chip shape carries the "this is a tag"
  // signal.
  tag: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text-primary, #e5e7eb)",
    background: "var(--surface-2, #1a1a22)",
    border: "1px solid var(--surface-3, #2a2a35)",
    padding: "3px 10px",
    borderRadius: 999,
    fontFamily: "var(--semiotic-font-family, system-ui, sans-serif)",
    letterSpacing: 0,
  },
  body: {
    fontSize: 17,
    lineHeight: 1.7,
    color: "var(--text-primary, #e5e7eb)",
    maxWidth: 860,
  },
  draftBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(251, 191, 36, 0.12)",
    border: "1px solid rgba(251, 191, 36, 0.35)",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 24,
    fontSize: 13,
    color: "var(--text-secondary, #94a3b8)",
  },
  draftBadge: {
    background: "rgb(217, 119, 6)",
    color: "white",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "3px 8px",
    borderRadius: 4,
    flexShrink: 0,
  },
  draftNote: {
    lineHeight: 1.5,
  },
}
