import { resolve } from "node:path"

export interface Options {
  previous: string
  current: string
  outDir: string
  registry: string
  fixtures?: string[]
  precision?: number
}

export function parseOptions(args: string[]): Options {
  const values = new Map<string, string>()
  const allowed = [
    "--previous",
    "--current",
    "--out-dir",
    "--registry",
    "--fixtures",
    "--precision"
  ]
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]
    const value = args[index + 1]
    if (
      !allowed.includes(name) ||
      !value ||
      value.startsWith("--") ||
      values.has(name)
    )
      throw new Error(
        `Invalid or repeated option ${name}; expected ${allowed.join(", ")}`
      )
    values.set(name, value)
  }
  if (!values.has("--previous"))
    throw new Error(
      "--previous requires an exact published version or a local .tgz artifact"
    )
  const precision = values.has("--precision")
    ? Number(values.get("--precision"))
    : undefined
  if (
    precision !== undefined &&
    (!Number.isInteger(precision) || precision < 0 || precision > 8)
  )
    throw new Error(
      "--precision must be an integer from 0 to 8; omitted means exact geometry"
    )
  const registry =
    values.get("--registry") ||
    process.env.SEMIOTIC_NPM_REGISTRY ||
    "https://registry.npmjs.org"
  const url = new URL(registry)
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Registry must be an HTTP(S) URL without credentials")
  return {
    previous: values.get("--previous")!,
    current: values.get("--current") || ".",
    outDir: resolve(values.get("--out-dir") || "test-results/ssr-comparison"),
    registry,
    fixtures: values.get("--fixtures")?.split(","),
    precision
  }
}
