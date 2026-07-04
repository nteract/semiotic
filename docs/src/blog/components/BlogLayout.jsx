import React from "react"
import { Link } from "react-router-dom"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import ThemeToggle from "../../components/ThemeToggle"

const semioticLogo = new URL("../../../public/assets/img/semiotic.png", import.meta.url).href
const semioticLogoDark = new URL("../../../public/assets/img/semiotic-darkmode.png", import.meta.url).href

/**
 * BlogLayout — chrome for /blog/ and /blog/:slug/.
 *
 * Top strip layout:
 *   - Left:  Semiotic logo (→ "/") + "Blog" link (→ "/blog/")
 *   - Right: theme toggle + GitHub link, mirroring the docs header
 *
 * Theme state is shared with the docs app via `useDocsTheme` so
 * toggling here updates `<html data-theme="…">` + localStorage and
 * the change is reflected when the user navigates back into the docs.
 */
export default function BlogLayout({ children }) {
  const [theme, toggleTheme] = useDocsTheme()

  return (
    <div style={styles.shell}>
      <div style={styles.topBar}>
        <Link to="/" style={styles.logoLink} aria-label="Semiotic home">
          <img
            src={theme === "dark" ? semioticLogoDark : semioticLogo}
            alt="Semiotic"
            style={styles.logoImg}
          />
        </Link>
        <Link to="/blog" style={styles.blogLink}>Blog</Link>
        <div style={styles.topBarRight}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <a
            href="/blog/feed.xml"
            style={styles.githubLink}
            aria-label="Subscribe to the Semiotic Blog feed"
            title="Atom feed"
          >
            RSS
          </a>
          <a
            href="https://github.com/nteract/semiotic"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.githubLink}
          >
            GitHub
          </a>
        </div>
      </div>

      <main style={styles.main}>{children}</main>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <span>
            <Link to="/" style={styles.footerLink}>← Semiotic home</Link>
            <span style={styles.footerSep}>·</span>
            <Link to="/getting-started" style={styles.footerLink}>Documentation</Link>
            <span style={styles.footerSep}>·</span>
            <a href="/blog/feed.xml" style={styles.footerLink}>RSS</a>
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
    // `--bg-primary` isn't defined in docs/index.css — only `--surface-0`
    // through `--surface-3` and the `--text-*` family. The old name fell
    // through to its hardcoded dark fallback in every theme, so the blog
    // shell ignored `[data-theme="light"]` entirely. Use the existing
    // body-background token instead.
    background: "var(--surface-0)",
    color: "var(--text-primary)",
    letterSpacing: "-0.005em",
  },
  topBar: {
    maxWidth: 1100,
    width: "100%",
    margin: "0 auto",
    padding: "22px 32px 0",
    display: "flex",
    alignItems: "center",
    gap: 18,
  },
  logoLink: {
    display: "inline-flex",
    alignItems: "center",
    textDecoration: "none",
  },
  logoImg: {
    height: 40,
    width: "auto",
    display: "block",
  },
  blogLink: {
    fontSize: 18,
    fontWeight: 500,
    fontStyle: "italic",
    color: "var(--text-secondary, #94a3b8)",
    textDecoration: "none",
  },
  topBarRight: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  githubLink: {
    fontSize: 14,
    color: "var(--text-primary)",
    textDecoration: "none",
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
