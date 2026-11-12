/**
 * Circle enclosure from d3-hierarchy 3.1.3 (ISC, Mike Bostock).
 * https://github.com/d3/d3-hierarchy/blob/v3.1.3/src/pack/enclose.js
 * Includes its deterministic LCG and Fisher-Yates shuffle, with TypeScript
 * types and no changes to the enclosure algorithm. See LICENSE for the notice.
 *
 * Keep this small primitive separate: d3-hierarchy 3.1.3 ships one ESM bundle,
 * so importing packEnclose from shared annotations eagerly retains hierarchy
 * code in every chart family and defeats the lazy hierarchy-layout boundary.
 */

export interface EnclosingCircle {
  x: number
  y: number
  r: number
}

export function packEnclose(
  input: Iterable<EnclosingCircle>
): EnclosingCircle | undefined {
  let seed = 1
  const random = () =>
    (seed = (1664525 * seed + 1013904223) % 4294967296) / 4294967296
  const circles = Array.from(input)
  let remaining = circles.length
  while (remaining) {
    const index = (random() * remaining--) | 0
    const circle = circles[remaining]
    circles[remaining] = circles[index]
    circles[index] = circle
  }
  let i = 0
  const n = circles.length
  let B: EnclosingCircle[] = [],
    p: EnclosingCircle,
    e: EnclosingCircle | undefined

  while (i < n) {
    p = circles[i]
    if (e && enclosesWeak(e, p)) ++i
    else {
      B = extendBasis(B, p)
      e = encloseBasis(B)
      i = 0
    }
  }

  return e
}

function extendBasis(
  B: EnclosingCircle[],
  p: EnclosingCircle
): EnclosingCircle[] {
  let i: number, j: number

  if (enclosesWeakAll(p, B)) return [p]

  // If we get here then B must have at least one element.
  for (i = 0; i < B.length; ++i) {
    if (enclosesNot(p, B[i]) && enclosesWeakAll(encloseBasis2(B[i], p), B)) {
      return [B[i], p]
    }
  }

  // If we get here then B must have at least two elements.
  for (i = 0; i < B.length - 1; ++i) {
    for (j = i + 1; j < B.length; ++j) {
      if (
        enclosesNot(encloseBasis2(B[i], B[j]), p) &&
        enclosesNot(encloseBasis2(B[i], p), B[j]) &&
        enclosesNot(encloseBasis2(B[j], p), B[i]) &&
        enclosesWeakAll(encloseBasis3(B[i], B[j], p), B)
      ) {
        return [B[i], B[j], p]
      }
    }
  }

  // If we get here then something is very wrong.
  throw new Error()
}

function enclosesNot(a: EnclosingCircle, b: EnclosingCircle) {
  const dr = a.r - b.r,
    dx = b.x - a.x,
    dy = b.y - a.y
  return dr < 0 || dr * dr < dx * dx + dy * dy
}

function enclosesWeak(a: EnclosingCircle, b: EnclosingCircle) {
  const dr = a.r - b.r + Math.max(a.r, b.r, 1) * 1e-9,
    dx = b.x - a.x,
    dy = b.y - a.y
  return dr > 0 && dr * dr > dx * dx + dy * dy
}

function enclosesWeakAll(a: EnclosingCircle, B: EnclosingCircle[]) {
  for (let i = 0; i < B.length; ++i) {
    if (!enclosesWeak(a, B[i])) {
      return false
    }
  }
  return true
}

function encloseBasis(B: EnclosingCircle[]): EnclosingCircle {
  switch (B.length) {
    case 1:
      return encloseBasis1(B[0])
    case 2:
      return encloseBasis2(B[0], B[1])
    case 3:
      return encloseBasis3(B[0], B[1], B[2])
    default:
      throw new Error("Invalid enclosing-circle basis")
  }
}

function encloseBasis1(a: EnclosingCircle) {
  return {
    x: a.x,
    y: a.y,
    r: a.r
  }
}

function encloseBasis2(a: EnclosingCircle, b: EnclosingCircle) {
  const x1 = a.x,
    y1 = a.y,
    r1 = a.r,
    x2 = b.x,
    y2 = b.y,
    r2 = b.r,
    x21 = x2 - x1,
    y21 = y2 - y1,
    r21 = r2 - r1,
    l = Math.sqrt(x21 * x21 + y21 * y21)
  return {
    x: (x1 + x2 + (x21 / l) * r21) / 2,
    y: (y1 + y2 + (y21 / l) * r21) / 2,
    r: (l + r1 + r2) / 2
  }
}

function encloseBasis3(
  a: EnclosingCircle,
  b: EnclosingCircle,
  c: EnclosingCircle
) {
  const x1 = a.x,
    y1 = a.y,
    r1 = a.r,
    x2 = b.x,
    y2 = b.y,
    r2 = b.r,
    x3 = c.x,
    y3 = c.y,
    r3 = c.r,
    a2 = x1 - x2,
    a3 = x1 - x3,
    b2 = y1 - y2,
    b3 = y1 - y3,
    c2 = r2 - r1,
    c3 = r3 - r1,
    d1 = x1 * x1 + y1 * y1 - r1 * r1,
    d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2,
    d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3,
    ab = a3 * b2 - a2 * b3,
    xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1,
    xb = (b3 * c2 - b2 * c3) / ab,
    ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1,
    yb = (a2 * c3 - a3 * c2) / ab,
    A = xb * xb + yb * yb - 1,
    B = 2 * (r1 + xa * xb + ya * yb),
    C = xa * xa + ya * ya - r1 * r1,
    r = -(Math.abs(A) > 1e-6
      ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A)
      : C / B)
  return {
    x: x1 + xa + xb * r,
    y: y1 + ya + yb * r,
    r: r
  }
}
