import { insertSvgRootContent } from "../src/components/shared/svgRoot"

/** Apply the MCP CSS-variable theme without corrupting XML or expanding $ tokens. */
export function applySvgTheme(
  svg: string,
  theme: Record<string, unknown>
): string {
  const variables = Object.entries(theme)
    .filter(
      ([key, value]) =>
        /^--semiotic-[\w-]+$/.test(key) &&
        typeof value === "string" &&
        !/<|>|{|}|@|;|expression\(|javascript:|url\(|\/\*|\*\//i.test(value)
    )
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ")
  if (!variables) return svg
  return insertSvgRootContent(
    svg,
    `<style xmlns="http://www.w3.org/2000/svg">:root { ${variables.replace(/&/g, "&amp;")} }</style>`
  )
}
