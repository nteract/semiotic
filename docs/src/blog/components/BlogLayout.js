import React from "react"
import { Link } from "react-router-dom"

/**
 * BlogLayout is the chrome wrapper for /blog/ and /blog/:slug/. It's
 * deliberately minimal: a top bar with the Semiotic mark, a "Docs"
 * link back into the main site, a "Blog" link to the index, GitHub,
 * and the title of the current view; a content container; and a
 * compact footer.
 *
 * The docs' regular header/sidebar is bypassed for blog routes —
 * the blog wants a reading-first chrome, not a docs sidebar. The
 * existing PageLayout (TOC, breadcrumbs, prev/next) is for reference
 * docs and doesn't fit a magazine-style blog feed.
 */
export default function BlogLayout({ children }) {
  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <Link to="/" style={styles.brandLink}>Semiotic</Link>
            <span style={styles.brandSep}>·</span>
            <Link to="/blog" style={styles.brandBlogLink}>Blog</Link>
          </div>
          <nav style={styles.nav}>
            <Link to="/getting-started" style={styles.navLink}>Docs</Link>
            <Link to="/charts" style={styles.navLink}>Charts</Link>
            <a
              href="https://github.com/nteract/semiotic"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.navLink}
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main style={styles.main}>{children}</main>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <span>
            <Link to="/" style={styles.footerLink}>Semiotic</Link>
            {" · "}
            <Link to="/getting-started" style={styles.footerLink}>Documentation</Link>
            {" · "}
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
  },
  header: {
    borderBottom: "1px solid var(--surface-3, #2a2a35)",
    background: "var(--bg-primary, #0a0a0f)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 880,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brand: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    fontFamily: "var(--semiotic-font-family, system-ui, sans-serif)",
  },
  brandLink: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary, #e5e7eb)",
    textDecoration: "none",
  },
  brandSep: {
    color: "var(--text-secondary, #94a3b8)",
  },
  brandBlogLink: {
    fontSize: 15,
    fontWeight: 500,
    color: "var(--text-secondary, #94a3b8)",
    textDecoration: "none",
  },
  nav: {
    display: "flex",
    gap: 18,
    fontSize: 14,
  },
  navLink: {
    color: "var(--text-secondary, #94a3b8)",
    textDecoration: "none",
    fontWeight: 500,
  },
  main: {
    flex: 1,
    width: "100%",
  },
  footer: {
    borderTop: "1px solid var(--surface-3, #2a2a35)",
    padding: "24px 0",
    marginTop: 48,
    fontSize: 13,
    color: "var(--text-secondary, #94a3b8)",
  },
  footerInner: {
    maxWidth: 880,
    margin: "0 auto",
    padding: "0 24px",
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
  footerCopy: {
    opacity: 0.6,
  },
}
