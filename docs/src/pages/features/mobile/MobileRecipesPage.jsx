import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ChartContainer,
  LineChart,
  Scatterplot,
  MobileStandardControls,
  useMobileRangeControls,
} from "semiotic"
import {
  mobileChartFamilyRecipe,
  mobileLineChartRecipe,
  mobileScatterplotRecipe,
} from "semiotic/recipes"
import PageLayout from "../../../components/PageLayout"
import CodeBlock from "../../../components/CodeBlock"

const trendData = [
  {
    id: "Checkout",
    coordinates: [
      { week: 1, value: 3.2 },
      { week: 2, value: 3.6 },
      { week: 3, value: 3.4 },
      { week: 4, value: 3.9 },
      { week: 5, value: 4.3 },
      { week: 6, value: 4.5 },
      { week: 7, value: 4.8 },
      { week: 8, value: 5.1 },
    ],
  },
]

const acquisitionData = [
  { channel: "Search", sessions: 88, conversion: 3.6, spend: 48 },
  { channel: "Email", sessions: 38, conversion: 5.4, spend: 12 },
  { channel: "Social", sessions: 72, conversion: 2.8, spend: 34 },
  { channel: "Retargeting", sessions: 44, conversion: 4.9, spend: 28 },
  { channel: "Display", sessions: 95, conversion: 1.7, spend: 42 },
  { channel: "SMS", sessions: 18, conversion: 6.1, spend: 7 },
]

const recipeCode = `const lineMobile = mobileLineChartRecipe({
  density: "compact",
  transformProfile: "inspect",
  standardControls: ["brush", "legend"],
})

<LineChart
  {...lineMobile.props}
  responsiveRules={lineMobile.responsiveRules}
  data={trendData}
  lineBy="id"
  xAccessor="week"
  yAccessor="value"
/>

// lineMobile.mobileInteraction and lineMobile.mobileSemantics are also
// returned for ChartContainer, audits, portable specs, and agents. The
// responsive rule applies them to the chart at the configured breakpoint.`

function pretty(value) {
  return JSON.stringify(value, null, 2)
}

export default function MobileRecipesPage() {
  const [profile, setProfile] = useState("overview")
  const [density, setDensity] = useState("comfortable")
  const rangeControls = useMobileRangeControls({
    domain: [1, 8],
    initialValue: [1, 8],
    step: 1,
    minSpan: 1,
    label: "Weeks shown",
  })

  const lineRecipe = useMemo(
    () =>
      mobileLineChartRecipe({
        density,
        transformProfile: profile,
        standardControls: ["brush", "legend"],
        summary: "Phone view preserves trend, endpoint, direct labels, and touch detail.",
      }),
    [density, profile]
  )
  const scatterRecipe = useMemo(
    () =>
      mobileScatterplotRecipe({
        density,
        transformProfile: profile,
        standardControls: "legend",
        maxAnnotations: 1,
      }),
    [density, profile]
  )
  const genericNetworkRecipe = useMemo(
    () => mobileChartFamilyRecipe("network", { density, transformProfile: profile }),
    [density, profile]
  )

  return (
    <PageLayout
      title="Mobile Chart-Family Recipes"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Mobile", path: "/features/mobile-visualization" },
        { label: "Recipes", path: "/features/mobile/recipes" },
      ]}
      prevPage={{ title: "Mobile Standard Controls", path: "/features/mobile/controls" }}
      nextPage={{ title: "Streaming System Model", path: "/features/streaming-system-model" }}
    >
      <p>
        Mobile recipes are not just smaller dimensions. They return desktop-safe
        chart props, breakpoint-scoped responsive rules, mobile interaction
        policy, and mobile semantics for a family of charts. The profile and
        density options tune the transform without deleting author intent.
      </p>

      <div style={styles.toolbar}>
        <label>
          Profile{" "}
          <select value={profile} onChange={(event) => setProfile(event.target.value)}>
            <option value="overview">overview</option>
            <option value="compare">compare</option>
            <option value="inspect">inspect</option>
          </select>
        </label>
        <label>
          Density{" "}
          <select value={density} onChange={(event) => setDensity(event.target.value)}>
            <option value="comfortable">comfortable</option>
            <option value="compact">compact</option>
            <option value="dense">dense</option>
          </select>
        </label>
      </div>

      <div style={styles.grid}>
        <ChartContainer
          title="Line recipe"
          subtitle="Responsive rule sets exact axes, mobile margin, labels, and annotation budget."
          mobile={{
            breakpoint: 9999,
            chartMode: "mobile",
            standardControls: {
              controls: ["brush"],
              brush: {
                ...rangeControls.brush,
              },
            },
            summary: lineRecipe.mobileSemantics.summary,
          }}
          height={340}
        >
          <LineChart
            {...lineRecipe.props}
            data={trendData}
            lineBy="id"
            lineDataAccessor="coordinates"
            xAccessor="week"
            yAccessor="value"
            xExtent={rangeControls.xExtent}
            responsiveRules={lineRecipe.responsiveRules}
            width={390}
            height={300}
          />
        </ChartContainer>

        <ChartContainer
          title="Scatterplot recipe"
          subtitle="Point radius, opacity, hit radius, exact axes, and annotation budget respond to density."
          mobile={{
            breakpoint: 9999,
            chartMode: "mobile",
            standardControls: "legend",
            summary: scatterRecipe.mobileSemantics.summary,
          }}
          height={340}
        >
          <Scatterplot
            {...scatterRecipe.props}
            data={acquisitionData}
            xAccessor="sessions"
            yAccessor="conversion"
            pointIdAccessor="channel"
            responsiveRules={scatterRecipe.responsiveRules}
            width={390}
            height={300}
          />
        </ChartContainer>
      </div>

      <h2>Recipe output</h2>
      <p>
        The <code>props</code> object is safe to spread into a desktop chart.
        Mobile-only behavior lives in <code>responsiveRules</code>, while the
        separate <code>mobileInteraction</code> and <code>mobileSemantics</code>{" "}
        fields expose the same contract to containers, audits, agents, and
        custom renderers.
      </p>
      <div style={styles.outputGrid}>
        <CodeBlock code={recipeCode} language="jsx" />
        <CodeBlock
          code={pretty({
            props: lineRecipe.props,
            responsiveRules: lineRecipe.responsiveRules,
            mobileInteraction: lineRecipe.mobileInteraction,
            mobileSemantics: lineRecipe.mobileSemantics,
            networkRecipeExample: genericNetworkRecipe.props,
          })}
          language="json"
        />
      </div>

      <h2>Where recipes stop</h2>
      <p>
        Recipes provide safe mobile defaults and semantics. Data-aware rollups,
        domain-specific aggregation, and custom brush or zoom state still belong
        in your application or a chart-specific adapter. Pair recipes with{" "}
        <Link to="/features/mobile/controls">Mobile Standard Controls</Link> when
        a gesture needs a visible touch alternative.
      </p>
      <MobileStandardControls
        controls={["brush", "legend"]}
        brush={rangeControls.brush}
        legend={{ items: [{ id: "example", label: "Example", active: true }] }}
        compact={false}
      />
    </PageLayout>
  )
}

const styles = {
  toolbar: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "center",
    padding: 12,
    margin: "16px 0",
    border: "1px solid var(--border, #d8dee4)",
    borderRadius: 12,
    background: "var(--surface-2, #f6f8fa)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
  },
  outputGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 18,
  },
}
