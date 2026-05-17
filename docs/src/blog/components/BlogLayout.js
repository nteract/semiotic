import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"

const semioticLogo = new URL("../../../public/assets/img/semiotic.png", import.meta.url).href
const semioticLogoDark = new URL("../../../public/assets/img/semiotic-darkmode.png", import.meta.url).href

/**
 * BlogLayout — chrome for /blog/ and /blog/:slug/.
 *
 * Two clickable anchors in the top strip:
 *   - Semiotic logo → "/" (back to the docs landing)
 *   - "Blog" → "/blog/" (anchor for readers who jumped into an
 *     individual entry from a social link and want to see the
 *     full index)
 *
 * The logo image follows the same dark/light theme attribute the
 * docs app reads, so a user landing directly on a blog URL still
 * gets the right brand mark for their preference.
 */
export default function BlogLayout({ children }) {
  // Track the document's data-theme attribute. DocsApp owns the
  // theme toggle / localStorage write; blog routes opt out of the
  // docs chrome but still inherit the same data-theme on <html>.
  // Watching it via MutationObserver keeps the logo in step even
  // when a user navigates blog → docs → flips theme → back to blog.
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "dark"
    return document.documentElement.getAttribute("data-theme") || "dark"
  })
  useEffect(() => {
    if (typeof document === "undefined") return
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark")
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => obs.disconnect()
  }, [])

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
