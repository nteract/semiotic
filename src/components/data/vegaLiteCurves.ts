const CURVE_TO_INTERPOLATE: Record<string, string> = {
  linear: "linear",
  monotoneX: "monotone-x",
  monotoneY: "monotone-y",
  step: "step",
  stepAfter: "step-after",
  stepBefore: "step-before",
  basis: "basis",
  cardinal: "cardinal",
  catmullRom: "catmull-rom",
}

export function toVegaInterpolation(curve: unknown): string | undefined {
  return typeof curve === "string" && Object.hasOwn(CURVE_TO_INTERPOLATE, curve)
    ? CURVE_TO_INTERPOLATE[curve] : undefined
}

export function fromVegaInterpolation(interpolation: unknown): string | undefined {
  if (interpolation === "monotone") return "monotoneX"
  return fromPortableInterpolation(interpolation)
}

export function fromPortableInterpolation(interpolation: unknown): string | undefined {
  return Object.keys(CURVE_TO_INTERPOLATE).find(curve => CURVE_TO_INTERPOLATE[curve] === interpolation)
}
