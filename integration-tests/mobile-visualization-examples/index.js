import * as Semiotic from "../../dist/semiotic.module.min.js"
import * as Recipes from "../../dist/semiotic-recipes.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  ChartContainer,
  LineChart,
  MobileAnnotationCalloutList,
  MobileChartContainer,
  Scatterplot,
  SmallMultipleChart,
  ThemeProvider,
} = Semiotic

const { mobileAnnotationStrategy } = Recipes

const viewportSlot = Math.max(244, Math.min(window.innerWidth - 56, 520))
const panelChartWidth = Math.max(232, Math.min(window.innerWidth - 74, 470))

const trendData = [
  { series: "conversion", week: 1, value: 3.2 },
  { series: "conversion", week: 2, value: 3.4 },
  { series: "conversion", week: 3, value: 3.5 },
  { series: "conversion", week: 4, value: 3.7 },
  { series: "conversion", week: 5, value: 4.0 },
  { series: "conversion", week: 6, value: 4.4 },
  { series: "conversion", week: 7, value: 4.5 },
  { series: "conversion", week: 8, value: 4.7 },
]

const campaignData = [
  { id: "search", channel: "Search", sessions: 420, conversion: 4.6 },
  { id: "email", channel: "Email", sessions: 260, conversion: 4.1 },
  { id: "sms", channel: "SMS", sessions: 95, conversion: 5.2 },
  { id: "display", channel: "Display", sessions: 510, conversion: 2.8 },
  { id: "social", channel: "Social", sessions: 340, conversion: 3.4 },
]

const campaignAnnotations = [
  {
    type: "callout",
    pointId: "sms",
    label: "SMS converts best, but the sample is small.",
    mobileText: "Best rate, small sample",
    shortText: "Best rate",
    emphasis: "primary",
    priority: 4,
  },
  {
    type: "label",
    pointId: "display",
    label: "Display has the largest audience and weakest conversion.",
    mobileText: "Weak conversion",
    emphasis: "secondary",
    priority: 2,
  },
  {
    type: "label",
    pointId: "email",
    label: "Email remains a stable mobile baseline.",
    mobileText: "Stable baseline",
    emphasis: "secondary",
    priority: 1,
  },
  {
    type: "callout",
    pointId: "search",
    label: "Search combines scale with strong conversion.",
    mobileText: "Scale plus strength",
    emphasis: "secondary",
    priority: 3,
  },
]

const regionalTrends = ["North", "South", "East"].map((region, regionIndex) => ({
  id: region,
  label: region,
  data: Array.from({ length: 6 }, (_, week) => ({
    week: week + 1,
    value: 3 + regionIndex * 0.4 + Math.sin((week + regionIndex) / 1.7) * 0.5 + week * 0.16,
  })),
}))

const mobileSemantics = {
  strategy: "mobile-harness",
  summary: "Phone layouts keep the trend, a small note budget, and stacked panels visible.",
  risks: ["overflow", "hover-only-detail", "dense-annotation-copy"],
  interaction: {
    primary: "tap",
    hoverFallback: "tap-to-lock",
    targetSize: 44,
  },
}

const annotationSplit = mobileAnnotationStrategy(campaignAnnotations, {
  width: panelChartWidth,
  strategy: "callout-list",
  maxPlotAnnotations: 1,
  maxCalloutItems: 4,
  preferShortText: true,
})

function TestCase({ title, testId, description, children }) {
  return React.createElement(
    "section",
    {
      className: "test-case",
      "data-mobile-chart": testId,
      "data-testid": testId,
    },
    React.createElement("h2", null, title),
    description ? React.createElement("p", null, description) : null,
    children
  )
}

function App() {
  return React.createElement(
    ThemeProvider,
    { theme: "light" },
    React.createElement(
      "main",
      { className: "mobile-harness", "data-testid": "mobile-harness" },
      React.createElement(
        "header",
        { className: "mobile-harness__intro" },
        React.createElement("h1", null, "Mobile visualization CI harness"),
        React.createElement(
          "p",
          null,
          "This page exercises Semiotic mobile contracts at scripted phone and tablet widths."
        ),
        React.createElement(
          "div",
          { className: "touch-strip", "data-testid": "mobile-touch-strip" },
          React.createElement("button", { type: "button", "data-mobile-touch-target": "summary" }, "Summary"),
          React.createElement("button", { type: "button", "data-mobile-touch-target": "notes" }, "Notes")
        )
      ),
      React.createElement(
        TestCase,
        {
          title: "ChartContainer mobile contract",
          testId: "mobile-chart-container-contract",
          description: "ChartContainer injects mobile mode, semantics, and a tap-sized interaction policy.",
        },
        React.createElement(
          ChartContainer,
          {
            title: "Checkout conversion",
            subtitle: "Container chrome and chart mode adapt together.",
            actions: { dataSummary: true },
            mobile: {
              breakpoint: 480,
              chartMode: "mobile",
              summary: "Conversion rose from 3.2% to 4.7% across eight weeks.",
              semantics: mobileSemantics,
              mobileInteraction: {
                tapToLockTooltip: true,
                targetSize: 44,
              },
            },
            height: 280,
          },
          React.createElement(LineChart, {
            data: trendData,
            lineBy: "series",
            xAccessor: "week",
            yAccessor: "value",
            width: panelChartWidth,
            height: 240,
            mode: "mobile",
            xLabel: "Week",
            yLabel: "Conversion",
            colorScheme: ["#1f7a6d"],
          })
        )
      ),
      React.createElement(
        TestCase,
        {
          title: "Mobile annotations with callout list",
          testId: "mobile-annotation-contract",
          description: "Only the highest-priority note stays in the plot; secondary notes move below it.",
        },
        React.createElement(
          MobileChartContainer,
          {
            title: "Campaign conversion",
            subtitle: "Annotation density is reduced for phone plots.",
            actions: { dataSummary: true },
            mobileSummary: "SMS performs best, while Display underperforms at high volume.",
            detailTitle: "Moved annotations",
            detailMode: "inline",
            detail: React.createElement(MobileAnnotationCalloutList, {
              items: annotationSplit.calloutList,
            }),
            mobileSemantics,
          },
          React.createElement(Scatterplot, {
            data: campaignData,
            xAccessor: "sessions",
            yAccessor: "conversion",
            pointIdAccessor: "id",
            annotations: annotationSplit.visible,
            autoPlaceAnnotations: {
              mobile: {
                breakpoint: 480,
                strategy: "callout-list",
                maxAnnotations: 1,
                maxCalloutItems: 4,
                progressiveDisclosure: true,
                preferShortText: true,
              },
            },
            width: viewportSlot,
            height: 270,
            mode: "mobile",
            xLabel: "Sessions",
            yLabel: "Conversion",
            colorBy: "channel",
            pointRadius: 6,
            mobileInteraction: {
              tapToLockTooltip: true,
              targetSize: 44,
            },
          })
        ),
        React.createElement(
          "div",
          { className: "callout-fixture", "data-testid": "mobile-callouts" },
          React.createElement(MobileAnnotationCalloutList, {
            title: "Notes moved out of the plot",
            items: annotationSplit.calloutList,
          })
        )
      ),
      React.createElement(
        TestCase,
        {
          title: "Small multiples mobile stack",
          testId: "mobile-small-multiples-contract",
          description: "SmallMultipleChart uses one column at phone widths and shared extents across panels.",
        },
        React.createElement(
          SmallMultipleChart,
          {
            items: regionalTrends,
            valueAccessor: "value",
            sharedExtent: true,
            linkedBy: ["week"],
            mobileColumns: 1,
            tabletColumns: 2,
            columns: 3,
            chartHeight: 150,
            mobileSemantics,
          },
          (region, { chartProps }) =>
            React.createElement(LineChart, {
              ...chartProps,
              data: region.data,
              xAccessor: "week",
              yAccessor: "value",
              xLabel: "Week",
              yLabel: "Conversion",
              mode: "mobile",
              colorScheme: ["#1f7a6d"],
            })
        )
      )
    )
  )
}

createRoot(document.getElementById("root")).render(React.createElement(App))
