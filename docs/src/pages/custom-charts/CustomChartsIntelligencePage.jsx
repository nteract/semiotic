import React from "react"
import { Link } from "react-router-dom"
import { IntentMark } from "../../../../src/components/ai/IntentMark"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { waffleRecipeManifest } from "./waffleRecipeManifest"

const recipeCode = `import {
  defineChartRecipe,
  registerChartRecipe,
  describeChart,
  buildNavigationTree,
  auditObservedScene,
} from "semiotic/ai"

export const waffle = defineChartRecipe({
  id: "semiotic.recipe.waffle.v0",
  name: "Waffle chart",
  frameFamily: "XYCustomChart",
  portability: "portable",
  layout: { id: "semiotic.layout.waffle" },
  layoutConfigSchema: { type: "object", properties: { columns: { type: "number" } } },
  dataRoles: [
    { role: "category", accessor: "categoryAccessor", semanticType: "nominal", required: true },
    { role: "value", accessor: "valueAccessor", semanticType: "quantitative", required: true },
  ],
  intents: [{ id: "part-to-whole", score: 5 }],
  designContract: {
    whyCustom: "Repeated units make composition concrete.",
    whyNotDefault: "A bar is more precise but less compositionally memorable.",
  },
  accessibility: { accessibleTable: "required", navigationGranularity: "category" },
})

registerChartRecipe(waffle)`

const intentManifest = {
  ididVersion: "0.1",
  chartId: "custom-intelligence-waffle",
  title: "Waffle chart",
  intent: {
    primary: "part-to-whole",
    secondary: ["explanation"],
    communicativeAct: "Make composition memorable and concrete.",
  },
  audience: {
    primary: "general-technical",
    familiarityAssumptions: { waffleChart: "medium", partToWhole: "high" },
  },
  reception: waffleRecipeManifest.reception,
  designContract: {
    chartFamily: waffleRecipeManifest.frameFamily,
    whyThisForm: waffleRecipeManifest.designContract.whyCustom,
    whyNotDefault: waffleRecipeManifest.designContract.whyNotDefault,
    risks: waffleRecipeManifest.reception.risks,
    misuse: waffleRecipeManifest.designContract.misuse,
  },
  accessibility: {
    description: "Generated from the recipe's roles, encodings, and intent.",
    navigation: true,
    dataFallback: true,
    manualChecks: ["screen-reader behavior", "metaphor comprehension", "animation distraction"],
  },
}

export default function CustomChartsIntelligencePage() {
  return (
    <PageLayout
      title="Custom Charts as Reception Strategies"
      subtitle="The frame supplies runtime affordances; the recipe supplies inspectable meaning"
      breadcrumbs={[
        { label: "Custom Charts", path: "/custom-charts/overview" },
        { label: "Intelligence", path: "/custom-charts/intelligence" },
      ]}
      prevPage={{ title: "Overview", path: "/custom-charts/overview" }}
      nextPage={{ title: "Custom Layouts", path: "/custom-charts/custom-layouts" }}
    >
      <section>
        <h2>Why custom charts are different</h2>
        <p>
          A custom chart is justified when its reception strengths—memorability, situated reading,
          interaction, or a useful visual idiom—outweigh its interpretive risks and the recipe
          supplies the scaffolds needed to cross that gap. Geometry alone cannot state that contract.
        </p>
      </section>

      <section>
        <h2>Why Semiotic understands recipes, not frames</h2>
        <p>
          Raw custom frames remain absent from suggestions because they require unknown layout code.
          Registered recipe IDs are named candidates with data roles, intent scores, audience fit,
          reception channels, caveats, and an explicit reason to leave the built-in catalog.
        </p>
        <CodeBlock code={recipeCode} language="jsx" />
      </section>

      <section>
        <h2>Portable vs local recipes</h2>
        <table className="recipe-customization-table">
          <thead>
            <tr><th>Tier</th><th>Contract</th><th>Available surfaces</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Portable</td>
              <td>Registered layout ID, JSON-safe config, serializable schema</td>
              <td>Suggestions, SSR, serialization, CLI/MCP, docs</td>
            </tr>
            <tr>
              <td>Local</td>
              <td>May contain callbacks, closures, renderers, or browser-only dependencies</td>
              <td>Browser suggestions, runtime audit, description, navigation, local repair</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Data roles and visual semantics</h2>
        <p>
          Roles say what the input means; encodings say what emitted marks mean. Together they let
          the same capability machinery test data compatibility, generate description layers, and
          detect when an accessible table or scene loses semantic fields.
        </p>
      </section>

      <section>
        <h2>Description and navigation</h2>
        <p>
          Recipe-aware description produces L1 encoding, L2 statistics, L3 pattern, and L4
          communicative intent. Navigation uses an authored strategy when present and otherwise
          groups by the primary categorical role with leaves for reachable data marks.
        </p>
      </section>

      <section>
        <h2>Observed-scene audit</h2>
        <p>
          <code>getCustomLayout()</code> exposes what the recipe actually emitted. The audit keeps
          declared semantics, observed evidence, and manual assistive-technology checks separate so
          Semiotic does not claim to measure comprehension or real screen-reader behavior.
        </p>
      </section>

      <section>
        <h2>Intent Mark</h2>
        <p>
          The visible mark packages the IDID contract for review, copying, agent inspection, and
          later export without hiding it inside component props.
        </p>
        <IntentMark manifest={intentManifest} />
      </section>

      <section>
        <h2>Full examples</h2>
        <p>
          Start with the <Link to="/custom-charts/custom-layouts#waffle-chart">portable waffle recipe</Link>{" "}
          for the clean intelligence proof, then inspect the{" "}
          <Link to="/examples/urine-wheel">local Urine Wheel recipe</Link> for a situated historical
          idiom whose reception contract explains why it is not a bar chart wearing a hat.
        </p>
        <p>
          The complete candidate → explanation → Intent Mark → description → navigation → scene
          audit flow is live in <Link to="/examples/what-the-machine-sees">What the Machine Sees</Link>.
        </p>
      </section>
    </PageLayout>
  )
}
