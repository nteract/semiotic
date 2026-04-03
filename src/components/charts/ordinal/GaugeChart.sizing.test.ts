/**
 * TDD: Verify gauge sizing — the arc should fill the available space,
 * not be tiny in the center.
 *
 * pieScene computes: outerRadius = min(layoutW, layoutH) / 2 - 4
 * where layoutW = width - margin.left - margin.right
 * and layoutH = height - margin.top - margin.bottom
 *
 * So the gauge radius is determined by the LAYOUT area (size minus margins).
 * To maximize the gauge, we want min(layoutW, layoutH) to be as large as possible.
 */
import { describe, it, expect } from "vitest"

// Replicate the bounding box computation from GaugeChart
function computeArcBounds(sweepDeg: number) {
  const gapDeg = 360 - sweepDeg
  const startAngleDeg = 180 + gapDeg / 2
  const sweepRad = (sweepDeg * Math.PI) / 180
  const offsetRad = -Math.PI / 2 + (startAngleDeg * Math.PI) / 180

  const points: [number, number][] = [
    [Math.cos(offsetRad), Math.sin(offsetRad)],
    [Math.cos(offsetRad + sweepRad), Math.sin(offsetRad + sweepRad)],
  ]
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
    const norm = ((a - offsetRad) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
    if (norm <= sweepRad + 0.001) points.push([Math.cos(a), Math.sin(a)])
  }
  points.push([0, 0]) // center

  return {
    minX: Math.min(...points.map(p => p[0])),
    maxX: Math.max(...points.map(p => p[0])),
    minY: Math.min(...points.map(p => p[1])),
    maxY: Math.max(...points.map(p => p[1])),
  }
}

// Compute what GaugeChart should produce for margins
function computeGaugeMargins(width: number, height: number, sweepDeg: number) {
  const bounds = computeArcBounds(sweepDeg)
  const arcW = bounds.maxX - bounds.minX
  const arcH = bounds.maxY - bounds.minY
  const arcCenterX = (bounds.minX + bounds.maxX) / 2
  const arcCenterY = (bounds.minY + bounds.maxY) / 2

  const PAD = 10

  // The frame's layout area determines the radius:
  //   radius = min(layoutW, layoutH) / 2 - 4
  // The arc's bounding box on a unit circle has dimensions arcW × arcH.
  // The arc needs radius * arcW horizontal space and radius * arcH vertical space.
  // So: layoutW >= radius * arcW and layoutH >= radius * arcH
  // But also: radius = min(layoutW, layoutH) / 2 - 4
  //
  // To maximize radius: make layoutW / arcW = layoutH / arcH (balanced scaling)
  // Then radius ≈ min(layoutW, layoutH) / 2

  // Target: the layout area should be sized so that the arc fills it.
  // layoutW = 2 * radius (the frame uses full diameter as layout)
  // But the arc only uses arcW * radius of that width.
  // Unused horizontal = layoutW - arcW * radius = 2*radius - arcW*radius = radius*(2-arcW)
  // This unused space should become extra margin.

  // Best approach: set layout to be a square of side 2*radius,
  // then use margins to shift the center so the arc bbox is centered in the widget.
  // Maximize radius = min((width - 2*PAD) / arcW, (height - 2*PAD) / arcH) / 2 ... no.

  // Actually the frame sets radius = min(layoutW, layoutH) / 2 - 4.
  // We want this radius to be maximized.
  // The arc occupies arcW * radius width and arcH * radius height.
  // These must fit in (width - 2*PAD) and (height - 2*PAD):
  //   arcW * radius <= width - 2*PAD  → radius <= (width - 2*PAD) / arcW
  //   arcH * radius <= height - 2*PAD → radius <= (height - 2*PAD) / arcH
  // So max radius = min((width-2*PAD)/arcW, (height-2*PAD)/arcH)
  //
  // The frame needs: layoutW = layoutH = 2 * (radius + 4) for the frame to produce this radius.
  // But we want asymmetric layout to fill space. Actually, we need:
  //   min(layoutW, layoutH) / 2 - 4 >= radius
  //   layoutW >= 2 * (radius + 4) AND layoutH >= 2 * (radius + 4)
  //
  // margins: marginLeft + marginRight = width - layoutW, etc.

  // The frame computes: radius = min(layoutW, layoutH) / 2 - 4
  // The arc needs: arcW * radius width, arcH * radius height.
  // To maximize radius: we want the CONSTRAINING dimension to be as large as possible.
  // layoutW = 2 * radius (frame expects diameter), but only arcW * radius is visible.
  // So we need: layoutW >= 2 * radius AND layoutH >= 2 * radius
  // AND: arcW * radius <= width - 2*PAD, arcH * radius <= height - 2*PAD
  //
  // Max radius = min((width-2*PAD)/arcW, (height-2*PAD)/arcH)
  // Then: layoutW = layoutH = 2 * radius (so min(lW,lH)/2 - 4 ≈ radius - 4)
  // But we can be smarter: set layoutW = max(2*radius, arcW*radius + slack) etc.
  //
  // Actually: the frame uses min(layoutW, layoutH) / 2 - 4 as radius.
  // So we want min(layoutW, layoutH) = 2 * (maxRadius + 4).
  // Margins absorb the rest: marginLeft/Right center the arc horizontally.

  // Frame sets radius = min(layoutW, layoutH) / 2 - 4.
  // For a square layout of side S, radius = S/2 - 4.
  // The arc center in the frame is at (0,0) (layout center).
  // The arc bbox extends: left = minX*R, right = maxX*R, top = minY*R, bottom = maxY*R
  // from the layout center.
  //
  // Total space needed from widget center to each edge:
  //   left:   S/2 - minX*R  (layout half + arc overhang left of center)
  //   right:  S/2 + maxX*R  ... wait, no.
  //
  // The layout center is offset from widget center by margin shifts.
  // The arc needs: from layout center, minX*R left and maxX*R right (may be asymmetric).
  // The layout extends S/2 in each direction from its center.
  // But we only need the arc to fit, not the full layout.
  //
  // From the widget center, the arc bbox needs:
  //   left: |minX| * R pixels
  //   right: maxX * R pixels
  //   top: |minY| * R pixels
  //   bottom: maxY * R pixels
  //
  // Plus the layout center = arc center, so:
  //   marginLeft >= PAD, marginLeft + |minX|*R >= PAD → auto
  //   width - marginRight >= marginLeft + layout → just needs to fit
  //
  // Simplify: find R such that the full layout square S=2*(R+4) PLUS the center offset fits.
  // Center offset: the layout center is at (width/2 - arcCenterX*R, height/2 - arcCenterY*R)
  // marginLeft = layoutCenter_x - S/2
  // marginTop = layoutCenter_y - S/2
  // marginRight = width - marginLeft - S
  // marginBottom = height - marginTop - S
  // All margins >= PAD.
  //
  // marginLeft >= PAD: width/2 - arcCenterX*R - S/2 >= PAD
  //   → width/2 - arcCenterX*R - (R+4) >= PAD
  //   → R*(1 + arcCenterX) <= width/2 - PAD - 4   (if arcCenterX > 0)
  //   → R <= (width/2 - PAD - 4) / (1 + arcCenterX)
  // Similarly for all 4 edges:

  // R must satisfy BOTH arc-fit and layout-fit constraints.
  // Arc-fit: R <= (width-2*PAD)/arcW, R <= (height-2*PAD)/arcH
  // Layout-fit: the square layout S=2*(R+4) shifted by arcCenter*R must fit.
  //   layoutCenter = widget_center - arcCenter*R
  //   Top:    R*(1+arcCenterY) <= height/2 - 4
  //   Bottom: R*(1-arcCenterY) <= height/2 - 4
  //   Left:   R*(1+arcCenterX) <= width/2 - 4
  //   Right:  R*(1-arcCenterX) <= width/2 - 4
  const constraints = [
    (width - 2 * PAD) / arcW,
    (height - 2 * PAD) / arcH,
  ]
  if (1 + arcCenterY !== 0) constraints.push((height / 2 - 4) / Math.abs(1 + arcCenterY))
  if (1 - arcCenterY !== 0) constraints.push((height / 2 - 4) / Math.abs(1 - arcCenterY))
  if (1 + arcCenterX !== 0) constraints.push((width / 2 - 4) / Math.abs(1 + arcCenterX))
  if (1 - arcCenterX !== 0) constraints.push((width / 2 - 4) / Math.abs(1 - arcCenterX))

  const R = Math.min(...constraints)
  const S = 2 * (R + 4)

  const finalCenterX = width / 2 - arcCenterX * R
  const finalCenterY = height / 2 - arcCenterY * R

  const marginLeft = Math.max(0, finalCenterX - S / 2)
  const marginTop = Math.max(0, finalCenterY - S / 2)
  const marginRight = Math.max(0, width - finalCenterX - S / 2)
  const marginBottom = Math.max(0, height - finalCenterY - S / 2)

  const actualLayoutW = width - marginLeft - marginRight
  const actualLayoutH = height - marginTop - marginBottom
  const frameRadius = Math.min(actualLayoutW, actualLayoutH) / 2 - 4

  return { marginLeft, marginTop, marginRight, marginBottom, layoutW: actualLayoutW, layoutH: actualLayoutH, frameRadius, maxRadius: R }
}

describe("Gauge sizing", () => {
  it("240° gauge in 300x250 should have radius close to optimal", () => {
    const result = computeGaugeMargins(300, 250, 240)
    // Frame radius should be very close to the computed optimal R (within 4px for the pieScene padding)
    expect(result.frameRadius).toBeGreaterThan(result.maxRadius * 0.9)
  })

  it("180° sunrise in 300x200 should have radius close to optimal", () => {
    const result = computeGaugeMargins(300, 200, 180)
    expect(result.frameRadius).toBeGreaterThan(result.maxRadius * 0.9)
  })

  it("360° full circle should behave like normal pie", () => {
    const result = computeGaugeMargins(300, 300, 360)
    // Full circle: arc spans [-1,1] in both axes, so arcW=arcH=2
    // optimal = (300-20)/2 = 140
    expect(result.frameRadius).toBeGreaterThan(100)
  })

  it("arc bounding box for 180° is correct (top half)", () => {
    const b = computeArcBounds(180)
    // 180° sunrise: arc from 9 o'clock to 3 o'clock (top half)
    expect(b.minX).toBeCloseTo(-1, 1)  // 9 o'clock
    expect(b.maxX).toBeCloseTo(1, 1)   // 3 o'clock
    expect(b.minY).toBeCloseTo(-1, 1)  // 12 o'clock (top)
    expect(b.maxY).toBeCloseTo(0, 1)   // center (bottom of arc, NOT 6 o'clock)
  })

  it("arc bounding box for 240° extends slightly below center", () => {
    const b = computeArcBounds(240)
    expect(b.minX).toBeCloseTo(-1, 1)
    expect(b.maxX).toBeCloseTo(1, 1)
    expect(b.minY).toBeCloseTo(-1, 1)
    // maxY: the arc endpoints are at ~7:30 and ~4:30, which are sin(5π/6)=0.5 and sin(π/6)=0.5
    // But center (0,0) is also included, so maxY should be >= 0.5
    expect(b.maxY).toBeGreaterThan(0.4)
    expect(b.maxY).toBeLessThan(1) // doesn't reach bottom of circle
  })
})
