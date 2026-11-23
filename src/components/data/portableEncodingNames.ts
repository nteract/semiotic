const sharedSchemes = new Set([
  "category10", "accent", "dark2", "paired", "pastel1", "pastel2", "set1", "set2", "set3"
])
const vegaTwenty = new Set(["category20", "category20b", "category20c", "tableau20"])

export function portableScheme(name: string | undefined, format: "plot" | "vega") {
  if (!name || sharedSchemes.has(name)) return name || undefined
  if (name === "tableau10" || (format === "plot" && name === "observable10")) return "category10"
  if (format === "vega" && vegaTwenty.has(name)) return "category20"
}
