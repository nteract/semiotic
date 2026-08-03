import React from "react"
import CodeBlock from "../../components/CodeBlock"
import ExamplePageLayout from "./ExamplePageLayout"
import "./process-river.css"

/**
 * Shared narrative shell for ProcessSankey “history river” examples.
 *
 * CSS structure lives in `process-river.css`. Theme tokens belong on a companion
 * root class (e.g. `germany-becoming`, `usa-becoming`) — never import a sibling
 * example’s BEM root. Pass section content as props so new rivers scaffold with
 * tokens + copy only.
 */
export default function ProcessRiverExampleLayout({
  pageTitle,
  themeClass,
  masthead,
  readingKey,
  river,
  findings,
  outside,
  method,
  code,
  footer,
}) {
  const rootClass = ["process-river", themeClass].filter(Boolean).join(" ")
  const findingsId = river?.idPrefix
    ? `${river.idPrefix}-findings-title`
    : "process-river-findings-title"
  const outsideId = river?.idPrefix
    ? `${river.idPrefix}-outside-title`
    : "process-river-outside-title"
  const methodId = river?.idPrefix
    ? `${river.idPrefix}-method-title`
    : "process-river-method-title"
  const codeId = river?.idPrefix
    ? `${river.idPrefix}-code-title`
    : "process-river-code-title"
  const riverTitleId = river?.idPrefix
    ? `${river.idPrefix}-river-title`
    : "process-river-title"

  return (
    <ExamplePageLayout title={pageTitle}>
      <div className={rootClass}>
        {masthead && (
          <header className="process-river__masthead">
            <div>
              {masthead.kicker && <span>{masthead.kicker}</span>}
              {masthead.title}
            </div>
            <div className="process-river__mast-copy">
              {masthead.copy}
              {masthead.tagline && <strong>{masthead.tagline}</strong>}
            </div>
          </header>
        )}

        {readingKey?.length > 0 && (
          <section
            className="process-river__reading-key"
            aria-label={readingKey.ariaLabel ?? "How to read the process river"}
          >
            {readingKey.map((item) => (
              <article key={item.title}>
                <b>{item.icon}</b>
                <span>
                  <strong>{item.title}</strong>
                  {item.body}
                </span>
              </article>
            ))}
          </section>
        )}

        {river && (
          <section className="process-river__river-section" aria-labelledby={riverTitleId}>
            <div className="process-river__river-heading">
              <div>
                {river.kicker && <span>{river.kicker}</span>}
                <h3 id={riverTitleId}>{river.title}</h3>
                {river.intro && <p>{river.intro}</p>}
              </div>
              {river.controls}
            </div>

            <div className="process-river__river-grid">
              <div className="process-river__chart-shell" ref={river.chartRef}>
                {river.chart}
              </div>
              {river.reader}
            </div>

            {river.caption && (
              <div className="process-river__chart-caption">{river.caption}</div>
            )}
          </section>
        )}

        {findings && (
          <section className="process-river__findings" aria-labelledby={findingsId}>
            <div>
              {findings.kicker && <span>{findings.kicker}</span>}
              <h3 id={findingsId}>{findings.title}</h3>
            </div>
            <div className="process-river__finding-grid">
              {findings.items.map((item) => (
                <article key={item.key ?? item.eyebrow}>
                  <small>{item.eyebrow}</small>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {outside && (
          <section className="process-river__outside" aria-labelledby={outsideId}>
            <div>
              {outside.kicker && <span>{outside.kicker}</span>}
              <h3 id={outsideId}>{outside.title}</h3>
              {outside.intro}
              {outside.note}
            </div>
            <div className="process-river__outside-list">
              {outside.items}
            </div>
          </section>
        )}

        {method && (
          <section className="process-river__method" aria-labelledby={methodId}>
            <div>
              {method.kicker && <span>{method.kicker}</span>}
              <h3 id={methodId}>{method.title}</h3>
              {method.body}
            </div>
            {method.sources?.length > 0 && (
              <div className="process-river__sources">
                {method.sources.map((source, index) => (
                  <a
                    key={source.id ?? source.href ?? index}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <small>
                      SOURCE {String(index + 1).padStart(2, "0")}
                      {source.label ? ` / ${source.label}` : ""}
                    </small>
                    <strong>{source.title}</strong>
                    {source.use && <span>{source.use}</span>}
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {code && (
          <section className="blocks-example process-river__code" aria-labelledby={codeId}>
            {code.kicker && <span>{code.kicker}</span>}
            <h3 id={codeId}>{code.title}</h3>
            {code.intro && <p>{code.intro}</p>}
            <CodeBlock
              code={code.source}
              language={code.language ?? "jsx"}
              showCopyButton
              wrap
            />
          </section>
        )}

        {footer && (
          <footer className="process-river__footer">
            {footer.kicker && <span>{footer.kicker}</span>}
            {footer.tagline && <strong>{footer.tagline}</strong>}
            {footer.stats && <p>{footer.stats}</p>}
          </footer>
        )}
      </div>
    </ExamplePageLayout>
  )
}
