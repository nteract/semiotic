import type { QuadrantsConfig } from "./QuadrantChart"

export const DEFAULT_QUADRANTS: QuadrantsConfig = {
  topLeft: { label: "Low / High", color: "#E9C46A", opacity: 0.08 },
  topRight: { label: "High / High", color: "#2A9D8F", opacity: 0.08 },
  bottomLeft: { label: "Low / Low", color: "#E76F51", opacity: 0.08 },
  bottomRight: { label: "High / Low", color: "#86BBD8", opacity: 0.08 },
}
