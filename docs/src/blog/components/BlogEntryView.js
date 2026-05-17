import React from "react"

/**
 * Full-page rendering of one entry. Header is the title + subtitle +
 * byline + date + tags. The body is whatever JSX the entry's
 * `component` returns. Container width is reading-friendly (~720 px)
 * — wider charts can opt to overflow via their own wrappers.
 */
export default function BlogEntryView({ entry }) {
  const Body = entry.component
  const dateLabel = new Date(entry.date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
  return (
    <article style={styles.article}>
      <header style={styles.header}>
        <h1 style={styles.title}>{entry.title}</h1>
        <p style={styles.subtitle}>{entry.subtitle}</p>
        <div style={styles.meta}>
          <span style={styles.author}>{entry.author}</span>
          <span style={styles.dot}>·</span>
          <time dateTime={entry.date}>{dateLabel}</time>
        </div>
        {entry.tags?.length > 0 && (
          <ul style={styles.tags}>
            {entry.tags.map((t) => (
              <li key={t} style={styles.tag}>#{t}</li>
            ))}
          </ul>
        )}
      </header>
      <div style={styles.body}>
        <Body />
      </div>
    </article>
  )
}

const styles = {
  article: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "40px 24px",
  },
  header: {
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: "1px solid var(--surface-3, #2a2a35)",
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.2,
    margin: 0,
    marginBottom: 12,
    color: "var(--text-primary, #e5e7eb)",
  },
  subtitle: {
    fontSize: 18,
    color: "var(--text-secondary, #94a3b8)",
    lineHeight: 1.5,
    margin: 0,
    marginBottom: 16,
    fontWeight: 400,
  },
  meta: {
    fontSize: 13,
    color: "var(--text-secondary, #94a3b8)",
    display: "flex",
    gap: 6,
    alignItems: "center",
    marginBottom: 12,
  },
  author: { fontWeight: 500 },
  dot: { opacity: 0.5 },
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
  body: {
    fontSize: 16,
    lineHeight: 1.7,
    color: "var(--text-primary, #e5e7eb)",
  },
}
