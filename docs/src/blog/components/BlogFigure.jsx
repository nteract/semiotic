import React from "react"

/**
 * Inline image figure for blog posts. Wraps a captioned image in
 * the same surface-1 / surface-3 framing the chart callouts use, so
 * static images and live charts share the same visual rhythm down
 * the page.
 *
 * Authoring:
 *
 *   Drop the image file under `docs/src/blog/images/` and resolve it
 *   with `new URL("../images/<file>", import.meta.url).href` — that's
 *   the same pattern the chart-index thumbnails use (see
 *   `docs/src/IndexPages.js`). Vite processes the URL, hashes the
 *   file, copies it into the build, and rewrites the reference to
 *   the bundled URL. A plain `<img src="/blog/images/foo.jpg">` will
 *   NOT work — files under `docs/public/` are not auto-served as
 *   static by the docs dev server in this project; only assets that
 *   appear in the module graph (via `new URL(...)` or `import`) make
 *   it into the build.
 *
 *   const playfair = new URL("../images/playfair-difference.jpg", import.meta.url).href
 *
 *   <BlogFigure
 *     src={playfair}
 *     alt="William Playfair, Imports and Exports of England, 1786"
 *     caption="A two-line chart with the difference shaded — the technique is older than the modern catalog."
 *     credit="William Playfair, The Commercial and Political Atlas, 1786 (public domain)."
 *   />
 *
 * Props:
 *
 *   src     — bundled URL string, typically from
 *             `new URL("../images/<file>", import.meta.url).href`
 *   alt     — required for accessibility; describe the image content
 *   caption — optional reader-facing caption, displayed beneath
 *   credit  — optional attribution line, italic + muted, follows the
 *             caption on the same figcaption block
 *   width   — optional max width override (CSS value). Default lets
 *             the image fill the body's reading column.
 */
export default function BlogFigure({ src, alt, caption, credit, width }) {
  const figureStyle = {
    margin: "24px 0",
    padding: 0,
    ...(width ? { maxWidth: typeof width === "number" ? `${width}px` : width } : {}),
  }
  return (
    <figure style={figureStyle}>
      <div
        style={{
          background: "var(--surface-1, #111118)",
          border: "1px solid var(--surface-3, #2a2a35)",
          borderRadius: 8,
          padding: 8,
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            borderRadius: 4,
          }}
        />
      </div>
      {(caption || credit) && (
        <figcaption
          style={{
            marginTop: 10,
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text-secondary, #94a3b8)",
          }}
        >
          {caption}
          {credit && (
            <>
              {caption ? " " : null}
              <span style={{ opacity: 0.75, fontStyle: "italic" }}>{credit}</span>
            </>
          )}
        </figcaption>
      )}
    </figure>
  )
}
