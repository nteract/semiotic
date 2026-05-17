import React from "react"
import { Link } from "react-router-dom"

/**
 * BlogLayout is the chrome wrapper for /blog/ and /blog/:slug/.
 *
 * Design intent: the blog is its own corner of the site, distinct
 * from the reference docs. No top nav bar, no sidebar — the page
 * starts at the article. A small "Semiotic Blog" wordmark sits in
 * the top-left corner as the only persistent chrome above the
 * content. The footer carries the only "back to docs" jump.
 */
export default function BlogLayout({ children }) {
  return (
    <div style={styles.shell}>
      <div style={styles.wordmark}>
        <Link to="/blog" style={styles.wordmarkLink}>
          <span style={styles.wordmarkBrand}>Semiotic</span>
          <span style={styles.wordmarkSep}>—</span>
          <span style={styles.wordmarkSection}>Blog</span>
        </Link>
      </div>

      <main style={styles.main}>{children}</main>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <span>
            <Link to="/" style={styles.footerLink}>← Semiotic home</Link>
            <span style={styles.footerSep}>·</span>
            <Link to="/getting-started" style={styles.footerLink}>Documentation</Link>
            <span style={styles.footerSep}>·</span>
            <a
              href="https://github.com/nteract/semiotic"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.footerLink}
            >
              GitHub
            </a>
          </span>
          <span style={styles.footerCopy}>nteract / Semiotic</span>
        </div>
      </footer>
    </div>
  )
}

const styles = {
  shell: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "var(--bg-primary, #0a0a0f)",
    color: "var(--text-primary, #e5e7eb)",
    // Slightly tighter letter-spacing on the body gives the blog a
    // bookier feel than the docs without changing fonts.
    letterSpacing: "-0.005em",
  },
  // Wordmark — small, top-left, no banner background. Just a piece
  // of typography. The serif-mono mix evokes editorial mastheads
  // without committing to a real serif (the docs site doesn't ship
  // one).
  wordmark: {
    maxWidth: 1100,
    width: "100%",
    margin: "0 auto",
    padding: "28px 32px 0",
  },
  wordmarkLink: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: 10,
    textDecoration: "none",
    color: "var(--text-primary, #e5e7eb)",
  },
  wordmarkBrand: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  wordmarkSep: {
    color: "var(--text-secondary, #94a3b8)",
    opacity: 0.6,
    fontSize: 16,
  },
  wordmarkSection: {
    fontSize: 18,
    fontWeight: 400,
    color: "var(--text-secondary, #94a3b8)",
    fontStyle: "italic",
  },
  main: {
    flex: 1,
    width: "100%",
  },
  footer: {
    borderTop: "1px solid var(--surface-3, #2a2a35)",
    padding: "24px 0",
    marginTop: 64,
    fontSize: 13,
    color: "var(--text-secondary, #94a3b8)",
  },
  footerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  footerLink: {
    color: "var(--text-secondary, #94a3b8)",
    textDecoration: "none",
  },
  footerSep: {
    margin: "0 10px",
    opacity: 0.5,
  },
  footerCopy: {
    opacity: 0.6,
  },
}
