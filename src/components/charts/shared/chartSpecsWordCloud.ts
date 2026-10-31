import type { ChartSpec } from "./chartSpecCore"

export const WORDCLOUD_CHART_SPECS: Record<string, ChartSpec> = {
  WordCloud: {
    name: "WordCloud",
    category: "wordcloud",
    importPath: "semiotic/wordcloud",
    docsRoute: "/charts/word-cloud",
    description:
      "Shaped word cloud of aggregated positive term weights. Uses deterministic native text placements with omission reporting. Static/MCP rendering requires layout from prepareWordCloudLayout; no server-side raster engine is assumed. Use a ranked chart or table for exact comparisons.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["textAccessor", "valueAccessor", "idAccessor"],
    propBags: [],
    ownProps: {
      data: {
        type: "array",
        description:
          "Aggregated term rows. Invalid rows, duplicate IDs and nonpositive/nonfinite weights are reported as omissions. No implicit tokenization."
      },
      layout: {
        type: "object",
        description:
          "Version-1 portable placements returned by prepareWordCloudLayout. Required for synchronous server/MCP rendering; must match data, dimensions, seed, mask and font options."
      },
      width: {
        type: "number",
        default: 640,
        schema: { minimum: 1, maximum: 2040 }
      },
      height: {
        type: "number",
        default: 400,
        schema: { minimum: 1, maximum: 2040 }
      },
      textAccessor: { type: ["string", "function"], default: "text" },
      valueAccessor: { type: ["string", "function"], default: "value" },
      idAccessor: {
        type: ["string", "function"],
        description:
          "Stable term identity; defaults to normalized text. Duplicate IDs keep the first valid row."
      },
      fontFamily: {
        type: "string",
        default: "sans-serif",
        description:
          "Load this font before placement; use the same font for SVG/PNG rendering on other hosts."
      },
      fontWeight: { type: ["string", "number"], default: "normal" },
      fontStyle: {
        type: "string",
        enum: ["normal", "italic", "oblique"],
        default: "normal"
      },
      fontSizeRange: {
        type: "array",
        default: [12, 64],
        schema: {
          minItems: 2,
          maxItems: 2,
          items: { type: "number", minimum: 1, maximum: 1024 }
        }
      },
      fontSizeScale: {
        type: "string",
        enum: ["sqrt", "linear", "log"],
        default: "sqrt"
      },
      rotate: {
        type: ["string", "array"],
        default: "horizontal",
        description:
          "horizontal, orthogonal, or explicit angles in degrees. Seed controls angle choice and placement."
      },
      padding: {
        type: "number",
        default: 1,
        schema: { minimum: 0, maximum: 64 }
      },
      seed: {
        type: "number",
        default: 42,
        description:
          "Safe integer seed; repeatability also requires identical fonts and raster environment."
      },
      strategy: {
        type: "string",
        enum: ["archimedean", "rectangular"],
        default: "archimedean"
      },
      maxWords: {
        type: "number",
        default: 250,
        schema: { minimum: 0, maximum: 10000 }
      },
      mask: {
        type: "object",
        description:
          "SVG path or image-alpha silhouette. Inside mode allows occupied shape pixels; outside mode forbids them. Image URLs must permit CORS.",
        schema: {
          oneOf: [
            {
              type: "object",
              required: ["type", "path", "viewBox"],
              additionalProperties: false,
              properties: {
                type: { const: "svgPath" },
                path: { type: "string" },
                viewBox: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: { type: "number" }
                },
                fillRule: { enum: ["nonzero", "evenodd"] },
                mode: { enum: ["inside", "outside"] }
              }
            },
            {
              type: "object",
              required: ["type", "src"],
              additionalProperties: false,
              properties: {
                type: { const: "image" },
                src: { type: "string" },
                mode: { enum: ["inside", "outside"] }
              }
            }
          ]
        }
      },
      maskFit: {
        type: "string",
        enum: ["contain", "cover"],
        default: "contain"
      },
      maskThreshold: {
        type: "number",
        default: 128,
        schema: { minimum: 1, maximum: 255 }
      },
      margin: {
        type: ["object", "number"],
        default: 0,
        description:
          "Explicit outer padding only. Layout dimensions describe the inner rectangle. No axis margins."
      },
      colorBy: { type: ["string", "function"] },
      colorScheme: { type: ["string", "array", "object"] },
      title: {
        type: "string",
        description: "Accessible title; does not reserve visible title space."
      },
      description: { type: "string" },
      summary: { type: "string" },
      accessibleTable: { type: ["boolean", "object"], default: true },
      annotations: {
        type: "array",
        description:
          "Term anchors: { id, label, dx?, dy? }. IDs refer to placed terms."
      },
      renderAs: { type: "string", enum: ["canvas", "svg"], default: "canvas" },
      enableHover: { type: "boolean", default: true },
      responsiveWidth: { type: "boolean" },
      responsiveHeight: { type: "boolean" },
      tooltip: {
        type: ["function", "object", "boolean"],
        omitFromSchema: true
      },
      selection: { type: "object", omitFromSchema: true },
      linkedHover: {
        type: ["boolean", "string", "object"],
        omitFromSchema: true
      },
      onLayout: { type: "function", omitFromSchema: true },
      onLayoutError: { type: "function", omitFromSchema: true },
      onClick: { type: "function", omitFromSchema: true },
      onObservation: { type: "function", omitFromSchema: true },
      canvasEnvironment: { type: "object", omitFromSchema: true },
      chartId: { type: "string" },
      className: { type: "string" },
      maxDevicePixelRatio: { type: "number" }
    },
    capabilities: {
      renderModes: ["hybrid"],
      supportsLegend: false,
      supportsSelection: true,
      supportsLinkedHover: true,
      supportsPush: false,
      supportsSSR: true,
      colorModel: "categorical",
      layoutMode: "plugin",
      specialFeatures: [
        "native-text",
        "native-keyboard-navigation",
        "seeded-placement",
        "silhouette-mask",
        "prepared-layout-ssr",
        "omission-reporting",
        "controlled-prop-repacking"
      ]
    }
  }
}
