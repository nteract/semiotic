import { insertSvgRootContent } from "../src/components/shared/svgRoot"
import { assertSafeThemeCSS } from "../src/components/store/safeThemeCSS"

/** Apply the MCP CSS-variable theme without corrupting XML or expanding $ tokens. */
export function applySvgTheme(
  svg: string,
  theme: Record<string, unknown>
): string {
  const variables = Object.entries(theme)
    .filter(([key, value]) => {
      if (!/^--semiotic-[\w-]+$/.test(key) || typeof value !== "string")
        return false
      try {
        assertSafeThemeCSS(value, key)
        return true
      } catch {
        return false
      }
    })
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ")
  if (!variables) return svg
  return insertSvgRootContent(
    svg,
    `<style xmlns="http://www.w3.org/2000/svg">:root { ${variables.replace(/&/g, "&amp;").replace(/\]\]>/g, "]]&gt;")} }</style>`
  )
}
