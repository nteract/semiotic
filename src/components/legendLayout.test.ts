import {
  AXIS_TICK_CHROME,
  AXIS_TITLE_CHROME,
  EMPTY_LEGEND_LABEL,
  ROTATED_AXIS_TITLE_CHROME,
  fitLegendRows,
  fitSideLegend,
  legendDisplayLabel,
  legendMoreLabel,
  legendMoreTitle,
  resolveHorizontalLegendMaxRows,
  resolveLegendPlacement,
  resolveLegendRenderBounds,
  sideLegendSlotOffset,
  truncateLegendLabel,
  resolveAxisChromeGutter,
  resolveHorizontalLegendHeight,
  resolveLegendDistance,
  resolveLegendEdgeGutter,
  reserveLegendMargin,
  resolveSideLegendMargin,
  resolveSideLegendWidth,
  resolveOrdinalAxisChrome,
  resolveXYAxisChrome,
  resolveXYFramePropsAxisChrome,
} from "./legendLayout"

describe("side legend measurement", () => {
  const styleFn = () => ({ fill: "#555" })

  it("keeps a padded minimum for short categorical labels", () => {
    const legend = {
      legendGroups: [
        {
          label: "",
          styleFn,
          items: [{ label: "A" }, { label: "B" }]
        }
      ]
    }

    expect(resolveSideLegendWidth(legend)).toBe(100)
    expect(resolveSideLegendMargin(legend)).toBe(113)
  })

  it("grows to fit categorical item and group labels", () => {
    const itemLegend = {
      legendGroups: [
        {
          label: "",
          styleFn,
          items: [{ label: "Catch-and-shoot attempts" }]
        }
      ]
    }
    const groupLegend = {
      legendGroups: [
        {
          label: "A deliberately long group heading",
          styleFn,
          items: [{ label: "A" }]
        }
      ]
    }

    expect(resolveSideLegendWidth(itemLegend)).toBeGreaterThan(100)
    expect(resolveSideLegendWidth(groupLegend)).toBeGreaterThan(
      resolveSideLegendWidth(itemLegend)
    )
  })

  it("accounts for formatted gradient endpoints and labels", () => {
    const legend = {
      gradient: {
        domain: [0, 1] as [number, number],
        colorFn: () => "#555",
        label: "Probability of conversion",
        format: (value: number) => `${value.toFixed(3)} percent`
      }
    }

    expect(resolveSideLegendWidth(legend)).toBeGreaterThan(100)
  })

  it("reserves enough width for precise default gradient labels", () => {
    const legend = {
      gradient: {
        domain: [1.000000000000001, 1.000000000000002] as [number, number],
        colorFn: () => "#555"
      }
    }
    expect(resolveSideLegendWidth(legend)).toBeGreaterThanOrEqual(19 + 17 * 7)
  })

  it("measures large categorical legends without an argument-limit overflow", () => {
    const item = { label: "A" }
    const items = Array.from({ length: 150000 }, () => item)
    items.push({ label: "An exceptionally long final label" })
    expect(resolveSideLegendWidth({ legendGroups: [{ label: "", styleFn, items }] })).toBe(253)
  })

  it("includes an overridden legend distance in automatic side reservation", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
      legendDistance: 24,
    }

    expect(resolveSideLegendMargin(legend)).toBe(127)
  })

  it("reserves plot-adjacent chrome before a side legend", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
    }

    expect(resolveSideLegendMargin(legend, { sideGutter: 70 })).toBe(183)
  })

  it("uses the same custom swatch and label metrics as the renderer", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
    }

    expect(resolveSideLegendWidth(legend, { swatchSize: 80, labelGap: 30 })).toBe(117)
    expect(resolveSideLegendMargin(
      legend,
      { swatchSize: 80, labelGap: 30 },
    )).toBe(130)
  })
})

describe("side legend edge gutter", () => {
  it("defaults to focus-ring clearance and supports an explicit flush opt-out", () => {
    expect(resolveLegendEdgeGutter()).toBe(3)
    expect(resolveLegendEdgeGutter({ edgeGutter: 0 })).toBe(0)
    expect(resolveLegendEdgeGutter({ edgeGutter: -10 })).toBe(0)
  })
})

describe("resolveLegendDistance", () => {
  const styleFn = () => ({ fill: "#555" })

  it("falls back to the default when legendDistance is not finite", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
      legendDistance: NaN,
    }

    expect(resolveLegendDistance(legend)).toBe(10)
  })

  it("still honors a valid finite legendDistance", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
      legendDistance: 24,
    }

    expect(resolveLegendDistance(legend)).toBe(24)
  })
})

describe("resolveHorizontalLegendHeight", () => {
  const styleFn = () => ({ fill: "#555" })

  it("reserves extra height for the multi-group separator overflow", () => {
    const singleGroup = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
    }
    const multiGroup = {
      legendGroups: [
        { label: "", styleFn, items: [{ label: "A" }] },
        { label: "", styleFn, items: [{ label: "B" }] },
      ],
    }

    expect(resolveHorizontalLegendHeight(multiGroup, 500)).toBe(
      resolveHorizontalLegendHeight(singleGroup, 500) + 16
    )
  })

  it("includes the labeled gradient header without changing unlabeled legends", () => {
    const gradient = {
      gradient: {
        domain: [0, 1] as [number, number],
        colorFn: () => "#555",
      }
    }

    expect(resolveHorizontalLegendHeight(gradient, 500)).toBe(26)
    expect(resolveHorizontalLegendHeight({
      gradient: { ...gradient.gradient, label: "Probability" }
    }, 500)).toBe(46)
  })
})

describe("resolveAxisChromeGutter", () => {
  it("reserves nothing when the chart draws no axis on that side", () => {
    expect(resolveAxisChromeGutter(undefined)).toBe(0)
    expect(resolveAxisChromeGutter({ hasAxis: false })).toBe(0)
    // Pie/donut pass hasAxis:false, so their legends keep the old placement.
    expect(resolveAxisChromeGutter({ hasAxis: false, hasAxisLabel: true })).toBe(0)
  })

  it("reserves the tick band, and the title band when a title is present", () => {
    expect(resolveAxisChromeGutter({ hasAxis: true })).toBe(AXIS_TICK_CHROME)
    expect(resolveAxisChromeGutter({ hasAxis: true, hasAxisLabel: true })).toBe(AXIS_TITLE_CHROME)
  })

  it("widens for rotated ticks, which push the axis title further out", () => {
    // autoRotate moves the title baseline from +40 to +58; without this the
    // gutter caps at the un-rotated band and a bottom legend still overlaps.
    expect(
      resolveAxisChromeGutter({ hasAxis: true, hasAxisLabel: true, rotatedTicks: true })
    ).toBe(ROTATED_AXIS_TITLE_CHROME)
    expect(ROTATED_AXIS_TITLE_CHROME).toBeGreaterThan(AXIS_TITLE_CHROME)
  })

  it("lets an explicit axisGutter override the measurement, including 0", () => {
    const chrome = { hasAxis: true, hasAxisLabel: true }
    expect(resolveAxisChromeGutter(chrome, { axisGutter: 12 })).toBe(12)
    // 0 opts out entirely and restores plot-edge anchoring.
    expect(resolveAxisChromeGutter(chrome, { axisGutter: 0 })).toBe(0)
    // The override applies even with no measured chrome to start from.
    expect(resolveAxisChromeGutter(undefined, { axisGutter: 30 })).toBe(30)
    expect(resolveAxisChromeGutter(chrome, { axisGutter: -5 })).toBe(0)
  })
})

describe("axis chrome source precedence", () => {
  it("uses an explicit top axis and its label instead of inventing a bottom axis", () => {
    const chrome = resolveXYFramePropsAxisChrome(
      { axes: [{ orient: "top", label: "Top label" }] },
      { showAxes: true, xLabel: "Bottom label", yLabel: "Revenue" },
    )

    expect(chrome.hasAxis).toBe(false)
    expect(chrome.topAxis).toMatchObject({ hasAxis: true, hasAxisLabel: true })
    expect(chrome.leftAxis).toMatchObject({ hasAxis: true, hasAxisLabel: true })
  })

  it("reserves a side-title gutter for both XY and ordinal left legends", () => {
    const xy = resolveXYAxisChrome({ yLabel: "Revenue" })
    const ordinal = resolveOrdinalAxisChrome({
      projection: "vertical",
      hasCategoryLabel: false,
      hasValueLabel: true,
    })

    expect(resolveSideLegendMargin({ legendGroups: [] }, undefined, xy.leftAxis)).toBe(183)
    expect(resolveSideLegendMargin({ legendGroups: [] }, undefined, ordinal.leftAxis)).toBe(183)
  })

  it("conservatively measures an auto-rotating axis as rotated before render", () => {
    const chrome = resolveXYAxisChrome({
      axes: [{ orient: "bottom", label: "Time", autoRotate: true }],
    })

    expect(resolveAxisChromeGutter(chrome)).toBe(ROTATED_AXIS_TITLE_CHROME)
  })
})

describe("top legend minimum", () => {
  it("shares the direct-frame top inset when no title or axis requires more", () => {
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }
    reserveLegendMargin(margin, {
      legend: { legendGroups: [{ label: "", styleFn: () => ({ fill: "#555" }), items: [{ label: "A" }] }] },
      position: "top",
      size: [500, 300],
      axisChrome: { hasAxis: false },
    })

    expect(margin.top).toBe(34)
  })
})

describe("side legend fitting", () => {
  const styleFn = () => ({ fill: "#555" })
  const group = (labels: string[], label = "") => ({
    label,
    styleFn,
    items: labels.map((item) => ({ label: item })),
  })
  // Forty-two streaming categories: mostly short keys, a handful of long
  // descriptive names, plus a literal "null" key and an empty-string key.
  const regionLabels = [
    ...Array.from({ length: 40 }, (_, i) => i % 7 === 0
      ? `region-${String(i).padStart(2, "0")}-with-a-rather-long-descriptive-name`
      : `r${String(i).padStart(2, "0")}`),
    "null",
    "",
  ]
  const brands = [
    "Soylent", "Cyberdyne", "Vandelay", "Tyrell", "Acme", "Wayne",
    "Globex", "Hooli", "Stark", "Umbrella", "Wonka", "Initech",
  ]

  /** Every drawn slot (items plus "+N more") must sit inside the box. */
  function expectSlotsInside(
    fit: ReturnType<typeof fitSideLegend>,
    maxWidth: number,
    maxHeight: number,
  ) {
    expect(fit.width).toBeLessThanOrEqual(maxWidth)
    expect(fit.height).toBeLessThanOrEqual(maxHeight)
    for (const groupFit of fit.groups) {
      const slots = groupFit.visibleCount + (groupFit.hiddenCount > 0 ? 1 : 0)
      for (let slot = 0; slot < slots; slot++) {
        const { x, y } = sideLegendSlotOffset(fit, groupFit, slot)
        expect(x + fit.columnWidth).toBeLessThanOrEqual(fit.width)
        expect(groupFit.itemsY + y + fit.rowHeight).toBeLessThanOrEqual(maxHeight)
      }
    }
  }

  it("keeps the historic single column when unbounded", () => {
    const fit = fitSideLegend([group(brands)])
    expect(fit).toMatchObject({ width: 100, columns: 1, height: 37 + 12 * 22 + 8 })
    expect(fit.groups[0]).toMatchObject({ rows: 12, visibleCount: 12, hiddenCount: 0 })
  })

  it("wraps into columns instead of running past the available height", () => {
    const fit = fitSideLegend([group(brands)], undefined, { maxWidth: 249, maxHeight: 220 })
    expect(fit.columns).toBe(2)
    expect(fit.groups[0]).toMatchObject({ rows: 6, visibleCount: 12, hiddenCount: 0 })
    // Column-major: the seventh brand starts the second column.
    expect(sideLegendSlotOffset(fit, fit.groups[0], 6)).toEqual({ x: fit.columnStep, y: 0 })
    expectSlotsInside(fit, 249, 220)
  })

  it("summarizes what still cannot fit as a final +N more slot", () => {
    const fit = fitSideLegend([group(regionLabels)], undefined, { maxWidth: 249, maxHeight: 230 })
    const [groupFit] = fit.groups
    expect(groupFit.hiddenCount).toBeGreaterThan(0)
    expect(groupFit.visibleCount + groupFit.hiddenCount).toBe(regionLabels.length)
    expect(groupFit.visibleCount + 1).toBe(groupFit.rows * fit.columns)
    expect(fit.columnWidth).toBeGreaterThanOrEqual(
      Math.ceil(legendMoreLabel(groupFit.hiddenCount).length * 7),
    )
    expectSlotsInside(fit, 249, 230)
  })

  it("truncates labels to the column instead of widening past maxWidth", () => {
    const fit = fitSideLegend(
      [group(["a-category-name-that-is-much-wider-than-the-legend"])],
      undefined,
      { maxWidth: 160, maxHeight: 400 },
    )
    expect(fit.width).toBe(160)
    const truncated = truncateLegendLabel(
      "a-category-name-that-is-much-wider-than-the-legend",
      fit.labelWidth,
    )
    expect(truncated.endsWith("…")).toBe(true)
    expect(truncated.length * 7).toBeLessThanOrEqual(fit.labelWidth)
  })

  it("bounds every group of a multi-group legend", () => {
    const fit = fitSideLegend(
      [group(brands, "Brand"), group(regionLabels.slice(0, 20), "Region")],
      undefined,
      { maxWidth: 260, maxHeight: 300 },
    )
    expectSlotsInside(fit, 260, 300)
    expect(fit.groups.every((groupFit) => groupFit.rows >= 1)).toBe(true)
  })

  it("is stable when re-fit into the width it chose", () => {
    for (const [labels, bounds] of [
      [brands, { maxWidth: 249, maxHeight: 220 }],
      [regionLabels, { maxWidth: 249, maxHeight: 230 }],
      [regionLabels, { maxWidth: 180, maxHeight: 380 }],
      [regionLabels.filter((label) => label.length < 5), { maxWidth: 249, maxHeight: 120 }],
    ] as const) {
      const first = fitSideLegend([group([...labels])], undefined, bounds)
      const second = fitSideLegend([group([...labels])], undefined, {
        maxWidth: first.width,
        maxHeight: bounds.maxHeight,
      })
      expect(second).toEqual(first)
    }
  })

  it("fits very large bounded legends without an argument-limit overflow", () => {
    const fit = fitSideLegend(
      [group(Array.from({ length: 150000 }, (_, i) => `c${i}`))],
      undefined,
      { maxWidth: 240, maxHeight: 300 },
    )
    expect(fit.groups[0].visibleCount + fit.groups[0].hiddenCount).toBe(150000)
    expectSlotsInside(fit, 240, 300)
  })

  it("draws a readable placeholder for empty category labels", () => {
    expect(legendDisplayLabel("")).toBe(EMPTY_LEGEND_LABEL)
    expect(legendDisplayLabel("   ")).toBe(EMPTY_LEGEND_LABEL)
    expect(legendDisplayLabel("null")).toBe("null")
    expect(legendMoreTitle([{ label: "A" }, { label: "" }, { label: "C" }], 1)).toBe(
      `${EMPTY_LEGEND_LABEL}, C`,
    )
  })
})

describe("side legend reservation bounds", () => {
  const styleFn = () => ({ fill: "#555" })
  const longLegend = {
    legendGroups: [{
      label: "",
      styleFn,
      items: Array.from({ length: 42 }, (_, i) => ({
        label: `region-${i}-with-a-rather-long-descriptive-name`,
      })),
    }],
  }

  it("caps a right legend at 30% of the chart width and its height at the chart", () => {
    const margin = { top: 20, right: 40, bottom: 50, left: 70 }
    reserveLegendMargin(margin, {
      legend: longLegend,
      position: "right",
      size: [830, 250],
      axisChrome: { hasAxis: true },
    })
    // 30% of 830 is 249, plus the 10px distance and 3px edge gutter; the
    // unbounded single column would have needed 342 + 13.
    expect(margin.right).toBeLessThanOrEqual(249 + 13)
    expect(margin.right).toBeGreaterThan(200)

    const input = { totalWidth: 830, totalHeight: 250, margin, position: "right" as const }
    const placement = resolveLegendPlacement(longLegend, input)
    const bounds = resolveLegendRenderBounds(longLegend, input)
    expect(placement.x + placement.width).toBeLessThanOrEqual(830)
    const fit = fitSideLegend(longLegend.legendGroups, undefined, {
      maxWidth: placement.width,
      maxHeight: bounds.maxHeight,
    })
    expect(margin.top + fit.height).toBeLessThanOrEqual(250)
  })

  it("lets legendLayout.maxWidth replace the side-legend cap", () => {
    const margin = { top: 20, right: 40, bottom: 50, left: 70 }
    reserveLegendMargin(margin, {
      legend: longLegend,
      position: "left",
      size: [830, 250],
      legendLayout: { maxWidth: 140, sideGutter: 0 },
    })
    expect(margin.left).toBe(153)
  })

  it("never draws wider than the margin reserved for it", () => {
    // Reserved for a 600px-wide chart, then rendered in a wider frame (for
    // example a responsive container): the legend keeps to its margin.
    const margin = { top: 20, right: 40, bottom: 50, left: 70 }
    reserveLegendMargin(margin, { legend: longLegend, position: "right", size: [600, 400] })
    const placement = resolveLegendPlacement(longLegend, {
      totalWidth: 1200,
      totalHeight: 300,
      margin,
      position: "right",
    })
    expect(placement.width).toBe(margin.right - 13)
    expect(placement.x).toBe(1200 - margin.right + 10)
  })
})

describe("top and bottom legend fitting", () => {
  const styleFn = () => ({ fill: "#555" })
  const manyLegend = {
    legendGroups: [{
      label: "",
      styleFn,
      items: Array.from({ length: 40 }, (_, i) => ({ label: `Category ${i}` })),
    }],
  }

  it("wraps rows and summarizes rows past maxRows as a final +N more slot", () => {
    const widths = Array.from({ length: 12 }, () => 80)
    const fit = fitLegendRows(widths, { itemGap: 10, labelOffset: 22, maxWidth: 200, maxRows: 2 })
    expect(fit.rows).toHaveLength(2)
    expect(fit.visibleCount + fit.hiddenCount).toBe(12)
    expect(fit.hiddenCount).toBeGreaterThan(0)
    const last = fit.rows[1]
    expect(fit.moreX).toBe(last.end > last.start ? (last.end - last.start) * 90 : 0)
    expect(last.width).toBeLessThanOrEqual(200)
    expect(fit.moreX + legendMoreLabel(fit.hiddenCount).length * 7).toBeLessThanOrEqual(200)

    const unbounded = fitLegendRows(widths, { itemGap: 10, labelOffset: 22, maxWidth: 200 })
    expect(unbounded).toMatchObject({ visibleCount: 12, hiddenCount: 0, moreX: -1 })
    expect(unbounded.rows).toHaveLength(6)
  })

  it("caps an item wider than the row so its label truncates", () => {
    const fit = fitLegendRows([22 + 7 * 60, 40], { itemGap: 10, labelOffset: 22, maxWidth: 200 })
    expect(fit.widths).toEqual([200, 40])
    expect(fit.rows.map((row) => [row.start, row.end])).toEqual([[0, 1], [1, 2]])
    expect(fit.width).toBe(200)
    // Never narrower than one character plus the ellipsis.
    expect(fitLegendRows([400], { itemGap: 10, labelOffset: 22, maxWidth: 5 }).widths).toEqual([36])
  })

  it("caps a bottom legend at 40% of the chart height", () => {
    const margin = { top: 20, right: 20, bottom: 20, left: 60 }
    reserveLegendMargin(margin, {
      legend: manyLegend,
      position: "bottom",
      size: [420, 300],
      axisChrome: { hasAxis: true, hasAxisLabel: true },
    })
    // Five 22px rows fit in 40% of 300; the unbounded legend needed 14.
    expect(margin.bottom).toBe(5 * 22 + 10 + 46)
    const input = { totalWidth: 420, totalHeight: 300, margin, position: "bottom" as const, axisChrome: { hasAxis: true, hasAxisLabel: true } }
    expect(resolveHorizontalLegendMaxRows(manyLegend, input)).toBe(5)
    const placement = resolveLegendPlacement(manyLegend, input)
    expect(placement.y).toBe(300 - margin.bottom + 46 + 10)
    expect(placement.y + placement.height).toBeLessThanOrEqual(300)
  })

  it("keeps a squeezed bottom legend inside the chart instead of drawing every row", () => {
    // A caller margin smaller than the legend needs (or a compact frame whose
    // reservation was clamped) leaves room for only two rows.
    const input = {
      totalWidth: 420,
      totalHeight: 200,
      margin: { top: 20, right: 20, bottom: 46 + 10 + 44, left: 60 },
      position: "bottom" as const,
      axisChrome: { hasAxis: true, hasAxisLabel: true },
    }
    expect(resolveHorizontalLegendMaxRows(manyLegend, input)).toBe(2)
    const placement = resolveLegendPlacement(manyLegend, input)
    expect(placement.height).toBe(44)
    expect(placement.y + placement.height).toBeLessThanOrEqual(200)
  })

  it("keeps a top legend below the title band", () => {
    const margin = { top: 20, right: 20, bottom: 40, left: 60 }
    reserveLegendMargin(margin, {
      legend: manyLegend,
      position: "top",
      size: [420, 300],
      hasTitle: true,
    })
    const input = { totalWidth: 420, totalHeight: 300, margin, position: "top" as const, hasTitle: true }
    const bounds = resolveLegendRenderBounds(manyLegend, input)
    expect(bounds.maxHeight).toBe(margin.top - 24 - 10)
    const placement = resolveLegendPlacement(manyLegend, input)
    expect(placement.y).toBeGreaterThanOrEqual(24)
  })
})
