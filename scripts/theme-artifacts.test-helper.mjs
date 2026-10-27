export function verifyNestedTheme(
  themes,
  charts,
  React,
  renderToStaticMarkup,
  assert
) {
  let observed
  function Probe() {
    observed = themes.useTheme()
    return React.createElement(charts.Scatterplot, {
      data: [{ x: 5, y: 5, group: "A" }],
      colorBy: "group",
      showLegend: false,
      width: 400,
      height: 300,
      pointRadius: 10,
      title: "Nested themed point"
    })
  }
  for (const parent of ["dark", "high-contrast"]) {
    const svg = renderToStaticMarkup(
      React.createElement(
        themes.ThemeProvider,
        { theme: parent },
        React.createElement(
          themes.ThemeProvider,
          {
            theme: {
              colors: { primary: "#123456", categorical: ["#123456"] },
              tooltip: { fontSize: "20px" }
            }
          },
          React.createElement(Probe)
        )
      )
    )
    assert.equal(observed.mode, parent === "dark" ? "dark" : "light")
    assert.equal(
      observed.colors.background,
      parent === "dark" ? "#1a1a2e" : "#ffffff"
    )
    assert.equal(observed.colors.primary, "#123456")
    assert.equal(observed.tooltip.fontSize, "20px")
    if (parent === "high-contrast")
      assert.equal(observed.tooltip.background, "#000000")
    // This checks the chart family shares the provider's store, not just its CSS.
    assert.match(svg, /<circle\b[^>]*fill="#123456"/)
    assert.doesNotMatch(svg, /NaN|Infinity/)
  }
}
