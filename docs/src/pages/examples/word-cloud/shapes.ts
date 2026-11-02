import type { WordCloudMask } from "semiotic/wordcloud"

/** Authored silhouettes, in a shared 200 × 200 viewBox. */
export const shapes = {
  heart: {
    label: "A heart",
    path: "M100 182 C77 158 16 119 16 65 C16 12 78 9 100 49 C122 9 184 12 184 65 C184 119 123 158 100 182Z",
  },
  teacup: {
    label: "A teacup",
    path: "M22 54 H148 V74 H160 C198 74 198 127 150 127 H140 C127 167 48 174 29 126Z M149 89 V111 C177 111 177 89 149 89Z M15 176 H163 V184 H15Z",
    fillRule: "evenodd" as const,
  },
  ring: {
    label: "A ring · with a hole",
    path: "M100 8 A92 92 0 1 1 99.99 8Z M100 64 A36 36 0 1 0 100.01 64Z",
    fillRule: "evenodd" as const,
  },
  crescent: {
    label: "A crescent · concave",
    path: "M149 17 A92 92 0 1 0 149 183 A87 87 0 0 1 149 17Z",
  },
  islands: { label: "Two islands", path: "M8 35 H88 V165 H8Z M112 35 H192 V165 H112Z" },
  portrait: {
    label: "A silhouette",
    path: "M38 190 L42 151 Q45 125 70 119 L70 102 Q52 87 57 58 Q57 18 95 13 Q135 10 143 49 L146 65 L166 86 L147 93 Q151 113 127 117 L126 136 Q165 142 170 190Z",
  },
  corridor: {
    label: "A narrow corridor",
    path: "M10 10 H76 V90 H124 V10 H190 V190 H124 V110 H76 V190 H10Z",
  },
  none: { label: "An open page", path: "" },
}
export type ShapeName = keyof typeof shapes
export function cloudMask(shape: ShapeName, mode: "inside" | "outside"): WordCloudMask | undefined {
  const definition = shapes[shape]
  return shape === "none"
    ? undefined
    : {
        type: "svgPath",
        path: definition.path,
        viewBox: [0, 0, 200, 200],
        mode,
        fillRule: "fillRule" in definition ? definition.fillRule : "nonzero",
      }
}
