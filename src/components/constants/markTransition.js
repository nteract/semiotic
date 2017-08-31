export const attributeTransitionWhitelist = [
  "d",
  "height",
  "width",
  "transform",
  "x",
  "y",
  "cx",
  "cy",
  "x1",
  "x2",
  "y1",
  "y2",
  "rx",
  "ry",
  "r"
];

export const styleTransitionWhitelist = [
  "strokeOpacity",
  "fillOpacity",
  "strokeWidth",
  "fill",
  "stroke",
  "opacity",
  "strokeDasharray"
];

//TODO find React Everything to everything translater
export const reactCSSNameStyleHash = {
  strokeWidth: "stroke-width",
  fillOpacity: "fill-opacity",
  strokeOpacity: "stroke-opacity",
  strokeDasharray: "stroke-dasharray"
};
