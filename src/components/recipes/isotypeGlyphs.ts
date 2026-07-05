import type { GlyphDef } from "../stream/glyphDef"

export const isotypeInk = "#334155"
export const isotypePaper = "#f8fafc"
export const isotypeGhost = "#cbd5e1"

export const isotypeServerGlyph: GlyphDef = {
  viewBox: [40, 40],
  anchor: [0.5, 1],
  parts: [
    { d: "M8 3h24v34H8z", fill: "color" },
    { d: "M12 9h16v5H12zM12 18h16v5H12zM12 27h16v5H12z", fill: "accent" },
    {
      d: "M23.8 11.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M23.8 20.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M23.8 29.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0",
      fill: "color",
    },
  ],
}

export const isotypeChipGlyph: GlyphDef = {
  viewBox: [40, 40],
  anchor: [0.5, 0.5],
  parts: [
    {
      d: "M10 8h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z",
      fill: "color",
    },
    { d: "M15 15h10v10H15z", fill: "accent" },
    {
      d: "M7 2v6M14 2v6M21 2v6M28 2v6M7 32v6M14 32v6M21 32v6M28 32v6M2 7h6M2 14h6M2 21h6M2 28h6M32 7h6M32 14h6M32 21h6M32 28h6",
      fill: "none",
      stroke: "color",
      strokeWidth: 3,
    },
  ],
}

export const isotypeBoltGlyph: GlyphDef = {
  viewBox: [40, 40],
  anchor: [0.5, 0.5],
  parts: [{ d: "M23 1L7 23h10l-3 16 19-25H22z", fill: "color" }],
}

export const isotypeBusGlyph: GlyphDef = {
  viewBox: [48, 40],
  anchor: [0.5, 0.78],
  parts: [
    {
      d: "M7 12c0-4 3-7 7-7h20c4 0 7 3 7 7v15H7z",
      fill: "color",
    },
    { d: "M11 15h26v8H11z", fill: "accent", opacity: 0.9 },
    { d: "M12 27h7v4h-7zM29 27h7v4h-7z", fill: "accent", opacity: 0.95 },
    {
      d: "M12 31a4 4 0 1 0 8 0a4 4 0 1 0-8 0M28 31a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
      fill: "color",
      stroke: "accent",
      strokeWidth: 1.8,
    },
    { d: "M5 13h4v8H5zM39 13h4v8h-4z", fill: "color" },
  ],
}

export const isotypePersonPath =
  "M 9.12,3.34 C 8.28,3.29 7.44,3.40 6.64,3.69 4.17,3.63 1.97,5.37 0.91,7.51 -1.32,11.80 2.55,17.76 8.19,16.55 11.62,16.13 15.55,14.04 16.17,10.33 16.38,6.53 12.77,3.52 9.12,3.34 Z M 9.35,19.86 C 8.89,19.84 8.41,19.92 7.92,20.11 5.12,21.55 3.72,24.68 2.79,27.54 2.32,29.86 0.87,32.04 1.36,34.49 1.63,37.60 8.04,38.95 8.04,38.95 8.04,38.95 14.67,39.65 16.50,36.33 17.16,31.95 16.34,27.23 14.01,23.42 13.07,21.69 11.36,19.92 9.35,19.86 Z"

export const isotypePersonGlyph: GlyphDef = {
  viewBox: [18, 40],
  anchor: [0.5, 1],
  parts: [
    {
      d: isotypePersonPath,
      fill: "color",
      stroke: "color",
      strokeWidth: 1.4,
    },
  ],
}

export const isotypeNetworkGlyphs = {
  server: isotypeServerGlyph,
  chip: isotypeChipGlyph,
  bolt: isotypeBoltGlyph,
  bus: isotypeBusGlyph,
  person: isotypePersonGlyph,
} as const
