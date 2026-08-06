import React from "react"

export function chartRecipeDisclosure(recipe) {
  const primaryIntent = recipe?.intents?.find(
    (intent) => typeof intent === "object" && intent?.strength === "primary",
  ) ?? recipe?.intents?.find((intent) => typeof intent === "object")
  return {
    primary:
      (typeof primaryIntent === "object" ? primaryIntent?.rationale : undefined) ??
      recipe?.description ??
      "Explain the chart’s intended analytical work.",
    whyThisForm: recipe?.designContract?.whyThisForm ?? recipe?.designContract?.whyCustom,
    whyNotDefault: recipe?.designContract?.whyNotDefault,
    strengths: recipe?.reception?.strengths ?? [],
    risks: recipe?.reception?.risks ?? recipe?.caveats ?? [],
  }
}

/**
 * Shared editorial disclosure used by examples to state both what a chart can
 * support and where its evidence stops. It can render a compact “shows / does
 * not show” sentence or a full ChartRecipe-backed inspection panel.
 */
export default function ChartMethodDisclosure({
  recipe,
  shows,
  doesNotShow,
  className = "chart-method-disclosure",
  summary = "Why this chart form?",
  labels = {},
  inline = false,
}) {
  if (inline) {
    return (
      <p className={className}>
        <span>{labels.shows ?? "Shows"}</span> {shows}.{" "}
        <span>{labels.doesNotShow ?? "Does not show"}</span> {doesNotShow}.
      </p>
    )
  }

  if (!recipe) return null
  const disclosure = chartRecipeDisclosure(recipe)
  const bodyClass = `${className}__body`
  const columnsClass = `${className}__columns`
  return (
    <details className={className}>
      <summary>
        <span aria-hidden="true">⌁</span>
        {summary}
      </summary>
      <div className={bodyClass}>
        <dl>
          <div>
            <dt>{labels.primary ?? "What it is doing"}</dt>
            <dd>{disclosure.primary}</dd>
          </div>
          <div>
            <dt>{labels.whyThisForm ?? "Why this form"}</dt>
            <dd>{disclosure.whyThisForm}</dd>
          </div>
          <div>
            <dt>{labels.whyNotDefault ?? "What we considered instead"}</dt>
            <dd>{disclosure.whyNotDefault}</dd>
          </div>
        </dl>
        <div className={columnsClass}>
          <div>
            <strong>{labels.strengths ?? "Good at"}</strong>
            <ul>{disclosure.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <strong>{labels.risks ?? "Weak at"}</strong>
            <ul>{disclosure.risks.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </div>
    </details>
  )
}
