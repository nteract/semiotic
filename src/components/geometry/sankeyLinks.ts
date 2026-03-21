// @ts-nocheck
import { interpolateNumber } from "d3-interpolate"
import { line, curveLinearClosed, curveLinear } from "d3-shape"

const dedupeRibbonPoints =
  (weight = 1) =>
  (p, c) => {
    const l = p[p.length - 1]
    if (
      !l ||
      Math.round(l.x / weight) !== Math.round(c.x / weight) ||
      Math.round(l.y / weight) !== Math.round(c.y / weight)
    ) {
      p.push(c)
    }
    return p
  }

function linearRibbon() {
  const _lineConstructor = line()
  let _xAccessor = function (d) {
    return d.x
  }
  let _yAccessor = function (d) {
    return d.y
  }
  let _rAccessor = function (d) {
    return d.r
  }
  let _interpolator = curveLinearClosed

  function _ribbon(pathData) {
    if (pathData.multiple) {
      const original_r = _rAccessor
      const parallelTotal = pathData.multiple.reduce((p, c) => p + c.weight, 0)

      _rAccessor = () => parallelTotal

      const totalPoints = buildRibbon(pathData.points)

      let currentPoints = totalPoints
        .filter((d) => d.direction === "forward")
        .reduce(dedupeRibbonPoints(), [])

      const allRibbons = []

      pathData.multiple.forEach((siblingPath, siblingI) => {
        _rAccessor = () => siblingPath.weight
        const currentRibbon = buildRibbon(currentPoints)
        allRibbons.push(currentRibbon)
        const nextSibling = pathData.multiple[siblingI + 1]

        if (nextSibling) {
          const currentLeftSide = currentRibbon
            .reverse()
            .filter((d) => d.direction === "back")
            .reduce(dedupeRibbonPoints(), [])

          _rAccessor = () => nextSibling.weight

          const leftHandInflatedRibbon = buildRibbon(currentLeftSide)
          currentPoints = leftHandInflatedRibbon
            .reverse()
            .filter((d) => d.direction === "back")
            .reduce(dedupeRibbonPoints(), [])
        }
      })

      _rAccessor = original_r
      return allRibbons.map((d) =>
        _lineConstructor.x(_xAccessor).y(_yAccessor).curve(_interpolator)(d)
      )
    }
    const bothPoints = buildRibbon(pathData).reduce(dedupeRibbonPoints(), [])

    return _lineConstructor.x(_xAccessor).y(_yAccessor).curve(_interpolator)(
      bothPoints
    )
  }

  _ribbon.x = function (_value) {
    if (!arguments.length) return _xAccessor

    _xAccessor = _value
    return _ribbon
  }

  _ribbon.y = function (_value) {
    if (!arguments.length) return _yAccessor

    _yAccessor = _value
    return _ribbon
  }

  _ribbon.r = function (_value) {
    if (!arguments.length) return _rAccessor

    _rAccessor = _value
    return _ribbon
  }

  _ribbon.interpolate = function (_value) {
    if (!arguments.length) return _interpolator

    _interpolator = _value
    return _ribbon
  }

  return _ribbon

  function offsetEdge(d) {
    const diffX = _yAccessor(d.target) - _yAccessor(d.source)
    const diffY = _xAccessor(d.target) - _xAccessor(d.source)

    const angle0 = Math.atan2(diffY, diffX) + Math.PI / 2
    const angle1 = angle0 + Math.PI * 0.5
    const angle2 = angle0 + Math.PI * 0.5

    const x1 = _xAccessor(d.source) + _rAccessor(d.source) * Math.cos(angle1)
    const y1 = _yAccessor(d.source) - _rAccessor(d.source) * Math.sin(angle1)
    const x2 = _xAccessor(d.target) + _rAccessor(d.target) * Math.cos(angle2)
    const y2 = _yAccessor(d.target) - _rAccessor(d.target) * Math.sin(angle2)

    return { x1: x1, y1: y1, x2: x2, y2: y2 }
  }

  function buildRibbon(points) {
    const bothCode = []
    let x = 0
    let transformedPoints = { x1: 0, y1: 0, x2: 0, y2: 0 }

    while (x < points.length) {
      if (x !== points.length - 1) {
        transformedPoints = offsetEdge({
          source: points[x],
          target: points[x + 1]
        })
        const p1 = {
          x: transformedPoints.x1,
          y: transformedPoints.y1,
          direction: "forward"
        }
        const p2 = {
          x: transformedPoints.x2,
          y: transformedPoints.y2,
          direction: "forward"
        }
        bothCode.push(p1, p2)
        if (bothCode.length > 3) {
          const l = bothCode.length - 1
          const lineA = { a: bothCode[l - 3], b: bothCode[l - 2] }
          const lineB = { a: bothCode[l - 1], b: bothCode[l] }
          const intersect = findIntersect(
            lineA.a.x,
            lineA.a.y,
            lineA.b.x,
            lineA.b.y,
            lineB.a.x,
            lineB.a.y,
            lineB.b.x,
            lineB.b.y
          )
          if (intersect.found === true) {
            lineA.b.x = intersect.x
            lineA.b.y = intersect.y
            lineB.a.x = intersect.x
            lineB.a.y = intersect.y
          }
        }
      }

      x++
    }
    x--
    //Back
    while (x >= 0) {
      if (x !== 0) {
        transformedPoints = offsetEdge({
          source: points[x],
          target: points[x - 1]
        })
        const p1 = {
          x: transformedPoints.x1,
          y: transformedPoints.y1,
          direction: "back"
        }
        const p2 = {
          x: transformedPoints.x2,
          y: transformedPoints.y2,
          direction: "back"
        }
        bothCode.push(p1, p2)
        if (bothCode.length > 3) {
          const l = bothCode.length - 1
          const lineA = { a: bothCode[l - 3], b: bothCode[l - 2] }
          const lineB = { a: bothCode[l - 1], b: bothCode[l] }
          const intersect = findIntersect(
            lineA.a.x,
            lineA.a.y,
            lineA.b.x,
            lineA.b.y,
            lineB.a.x,
            lineB.a.y,
            lineB.b.x,
            lineB.b.y
          )
          if (intersect.found === true) {
            lineA.b.x = intersect.x
            lineA.b.y = intersect.y
            lineB.a.x = intersect.x
            lineB.a.y = intersect.y
          }
        }
      }

      x--
    }

    return bothCode
  }

  function findIntersect(l1x1, l1y1, l1x2, l1y2, l2x1, l2y1, l2x2, l2y2) {
    let a, b

    const result = {
      x: null,
      y: null,
      found: false
    }

    const d = (l2y2 - l2y1) * (l1x2 - l1x1) - (l2x2 - l2x1) * (l1y2 - l1y1)
    if (d === 0) {
      return result
    }
    a = l1y1 - l2y1
    b = l1x1 - l2x1
    const n1 = (l2x2 - l2x1) * a - (l2y2 - l2y1) * b
    const n2 = (l1x2 - l1x1) * a - (l1y2 - l1y1) * b
    a = n1 / d
    b = n2 / d

    result.x = l1x1 + a * (l1x2 - l1x1)
    result.y = l1y1 + a * (l1y2 - l1y1)

    if (a > 0 && a < 1 && b > 0 && b < 1) {
      result.found = true
    }

    return result
  }
}

const curvature = 0.5

const ribbonLink = (d) => {
  const diff =
    d.direction === "down"
      ? Math.abs(d.target.y - d.source.y)
      : Math.abs(d.source.x - d.target.x)
  // const halfWidth = d.width / 2
  const testCoordinates =
    d.direction === "down"
      ? [
          {
            x: d.y0,
            y: d.source.y
          },
          {
            x: d.y0,
            y: d.source.y + diff / 3
          },
          {
            x: d.y1,
            y: d.target.y - diff / 3
          },
          {
            x: d.y1,
            y: d.target.y
          }
        ]
      : [
          {
            x: d.source.x0,
            y: d.y0
          },
          {
            x: d.source.x0 + diff / 3,
            y: d.y0
          },
          {
            x: d.target.x0 - diff / 3,
            y: d.y1
          },
          {
            x: d.target.x0,
            y: d.y1
          }
        ]

  const linkGenerator = linearRibbon()

  linkGenerator.x((d) => d.x)
  linkGenerator.y((d) => d.y)
  linkGenerator.r(() => d.sankeyWidth / 2)

  return linkGenerator(testCoordinates)
}

export const areaLink = (d) => {
  let x0, x1, x2, x3, y0, y1, xi, y2, y3

  if (d.direction === "down") {
    x0 = d.y0 - d.sankeyWidth / 2
    x1 = d.y1 - d.sankeyWidth / 2
    x2 = d.y1 + d.sankeyWidth / 2
    x3 = d.y0 + d.sankeyWidth / 2
    y0 = d.source.y1
    y1 = d.target.y0
    xi = interpolateNumber(y0, y1)
    y2 = xi(curvature)
    y3 = xi(1 - curvature)

    return `M${x0},${y0}C${x0},${y2} ${x1},${y3} ${x1},${y1}L${x2},${y1}C${x2},${y3} ${x3},${y2} ${x3},${y0}Z`
  }
  (x0 = d.source.x1), // eslint-disable-line no-sequences
    (x1 = d.target.x0),
    (xi = interpolateNumber(x0, x1)),
    (x2 = xi(curvature)),
    (x3 = xi(1 - curvature)),
    (y0 = d.y0 - d.sankeyWidth / 2),
    (y1 = d.y1 - d.sankeyWidth / 2),
    (y2 = d.y1 + d.sankeyWidth / 2),
    (y3 = d.y0 + d.sankeyWidth / 2)

  return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}L${x1},${y2}C${x3},${y2} ${x2},${y3} ${x0},${y3}Z`
}

export function circularAreaLink(link) {
  const fullHW = link.sankeyWidth / 2
  const compactHW = (link._circularWidth ?? link.sankeyWidth) / 2
  const cpd = link.circularPathData
  if (!cpd) return null

  if (link.direction === "down") return null

  // Stub mode: for non-top-4 circular links, return just outbound + inbound stubs
  if (link._circularStub) {
    const sx = cpd.sourceX
    const sy = cpd.sourceY
    const tx = cpd.targetX
    const ty = cpd.targetY
    const sourceNode = typeof link.source === "object" ? link.source : null
    const targetNode = typeof link.target === "object" ? link.target : null
    if (!sourceNode || !targetNode) return null

    // Stub length: 1/3 of the gap between source right edge and next column
    // (or a fixed reasonable length)
    const stubLen = Math.max(15, Math.min(40, (cpd.rightFullExtent - sx) * 0.33))
    const stubLenT = Math.max(15, Math.min(40, (tx - cpd.leftFullExtent) * 0.33))

    // Outbound stub (source side) — rectangle fading out
    const outbound =
      `M${sx},${sy - fullHW}` +
      `L${sx + stubLen},${sy - fullHW}` +
      `L${sx + stubLen},${sy + fullHW}` +
      `L${sx},${sy + fullHW}Z`

    // Inbound stub (target side) — rectangle fading in
    const inbound =
      `M${tx},${ty - fullHW}` +
      `L${tx - stubLenT},${ty - fullHW}` +
      `L${tx - stubLenT},${ty + fullHW}` +
      `L${tx},${ty + fullHW}Z`

    // Return both paths separated by M (two separate filled shapes)
    return outbound + inbound
  }

  // Full circular ribbon for top cycles:

  const sx = cpd.sourceX
  const sy = cpd.sourceY
  const tx = cpd.targetX
  const ty = cpd.targetY
  const rf = cpd.rightFullExtent
  const lf = cpd.leftFullExtent
  const vf = cpd.verticalFullExtent

  const isBottom = link.circularLinkType === "bottom"
  const s = isBottom ? 1 : -1

  // Chamfer size — proportional to compact width, clamped
  const ch = Math.max(4, Math.min(compactHW, 15))

  return (
    // OUTER edge (source → around → target)
    // Starts at full width, chamfered corners taper to compact on return route
    `M${sx},${sy - s * fullHW}` +
    `L${rf},${sy - s * fullHW}` +
    `L${rf + compactHW},${sy - s * fullHW + s * ch}` +
    `L${rf + compactHW},${vf + s * compactHW - s * ch}` +
    `L${rf + compactHW - ch},${vf + s * compactHW}` +
    `L${lf - compactHW + ch},${vf + s * compactHW}` +
    `L${lf - compactHW},${vf + s * compactHW - s * ch}` +
    `L${lf - compactHW},${ty - s * fullHW + s * ch}` +
    `L${lf - compactHW + ch},${ty - s * fullHW}` +
    `L${tx},${ty - s * fullHW}` +
    // INNER edge (target → around → source, reversed)
    // Offset inward by compactHW so vertical thickness matches bottom horizontal
    `L${tx},${ty + s * fullHW}` +
    `L${lf + compactHW},${ty + s * fullHW}` +
    `L${lf + compactHW},${vf - s * compactHW}` +
    `L${rf - compactHW},${vf - s * compactHW}` +
    `L${rf - compactHW},${sy + s * fullHW}` +
    `L${sx},${sy + s * fullHW}` +
    `Z`
  )
}
