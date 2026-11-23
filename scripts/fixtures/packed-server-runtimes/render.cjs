function check(condition, message) {
  if (!condition) throw new Error(message)
}

function bars(svg) {
  return Array.from(
    svg.matchAll(/<g\b[^>]*\bid="[^"]+-data-area"[^>]*>([\s\S]*?)<\/g>/g),
    ([, marks]) =>
      Array.from(marks.matchAll(/<rect\b[^>]*\bheight="([^"]+)"/g), (match) =>
        Number(match[1])
      )
  )
}

module.exports = function verifyRender({
  renderChartWithEvidence,
  renderDashboard
}) {
  const props = {
    chartId: "runtime-sales",
    title: "Runtime sales",
    width: 280,
    height: 160,
    data: [
      { label: "A", value: 4 },
      { label: "B", value: 7 }
    ],
    categoryAccessor: "label",
    valueAccessor: "value"
  }
  const { svg, evidence } = renderChartWithEvidence("BarChart", props)
  const [heights] = bars(svg)
  check(
    evidence.status === "ok" &&
      evidence.markCount === 2 &&
      evidence.markCountByType.rect === 2,
    "Expected two rectangle marks in the chart evidence"
  )
  check(
    evidence.ariaLabel === props.title &&
      svg.includes('aria-label="Runtime sales"') &&
      heights?.length === 2 &&
      heights[0] > 0 &&
      heights[1] > heights[0],
    "The chart SVG must name the chart and draw the larger datum taller"
  )

  const dashboard = renderDashboard(
    [
      { component: "BarChart", props },
      {
        component: "BarChart",
        props: {
          ...props,
          title: "Runtime detail",
          data: props.data.slice(0, 1)
        }
      }
    ],
    { width: 600, layout: { columns: 2 } }
  )
  const panels = bars(dashboard)
  check(
    dashboard.includes('aria-label="Runtime sales"') &&
      dashboard.includes('aria-label="Runtime detail"') &&
      panels.length === 2 &&
      panels[0].length === 2 &&
      panels[1].length === 1 &&
      panels[1][0] > 0,
    "Expected two named dashboard panels with two bars and one bar, respectively"
  )
}
