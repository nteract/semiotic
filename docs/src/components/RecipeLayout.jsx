import React from "react"
import PageLayout from "./PageLayout"
import CodeBlock from "./CodeBlock"

export default function RecipeLayout({
  title,
  breadcrumbs,
  prevPage,
  nextPage,
  fullSourceCode,
  dependencies,
  children,
}) {
  return (
    <PageLayout
      title={title}
      breadcrumbs={breadcrumbs}
      prevPage={prevPage}
      nextPage={nextPage}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <span className="recipe-badge">Recipe</span>
        {dependencies && dependencies.length > 0 && (
          <div className="recipe-deps">
            {dependencies.map((dep) => (
              <span key={dep} className="recipe-dep-tag">{dep}</span>
            ))}
          </div>
        )}
      </div>

      {children}

      <div className="recipe-source" style={{ marginTop: "48px" }}>
        <h2 id="full-source-code">Source Code</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Abbreviated for readability — data arrays and steps are truncated. See the full runnable
          source in <code>docs/src/examples/recipes/</code>.
        </p>
        <CodeBlock
          code={fullSourceCode}
          language="jsx"
          showLineNumbers={true}
          showCopyButton={true}
        />
      </div>
    </PageLayout>
  )
}
