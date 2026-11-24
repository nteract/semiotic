const portableNames = [
  "linear", "monotone-x", "monotone-y", "step", "step-after", "step-before",
  "basis", "cardinal", "catmull-rom"
]
const nativeNames = /* @__PURE__ */ portableNames.map(name => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()))

export function toVegaInterpolation(curve: unknown): string | undefined {
  if (curve === "monotoneX") return "monotone"
  if (curve === "monotoneY") return
  return portableNames[nativeNames.indexOf(curve as string)]
}

export function fromVegaInterpolation(interpolation: unknown): string | undefined {
  if (interpolation === "monotone") return "monotoneX"
  return fromPortableInterpolation(interpolation)
}

export function fromPortableInterpolation(interpolation: unknown): string | undefined {
  return nativeNames[portableNames.indexOf(interpolation as string)]
}
