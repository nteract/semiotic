export const styleTransitionWhitelist = [
  "strokeOpacity",
  "fillOpacity",
  "strokeWidth",
  "fill",
  "stroke",
  "opacity",
  "strokeDasharray"
];

export const redrawSketchyList = [
  "fill",
  "stroke",
  "cx",
  "cy",
  "x",
  "y",
  "d",
  "height",
  "width",
  "x1",
  "x2",
  "y1",
  "y2",
  "rx",
  "ry",
  "r",
  "transform"
];

export const attributeTransitionWhitelist = [
  "transform",
  ...redrawSketchyList,
  ...styleTransitionWhitelist
];

//TODO find React Everything to everything translater
export const reactCSSNameStyleHash = {
  strokeWidth: "stroke-width",
  fillOpacity: "fill-opacity",
  strokeOpacity: "stroke-opacity",
  strokeDasharray: "stroke-dasharray"
};

export const differentD = (d, newD) => {
  if (!d || !newD) {
    return true;
  }
  const lowerD = d.toLowerCase();
  const lowerNewD = newD.toLowerCase();

  if (
    (lowerD.match(/m/g) || []).length !== (lowerNewD.match(/m/g) || []).length
  ) {
    return true;
  }

  if (
    (lowerD.match(/l/g) || []).length !== (lowerNewD.match(/l/g) || []).length
  ) {
    return true;
  }

  if (
    (lowerD.match(/c/g) || []).length !== (lowerNewD.match(/c/g) || []).length
  ) {
    return true;
  }

  if (
    (lowerD.match(/a/g) || []).length !== (lowerNewD.match(/a/g) || []).length
  ) {
    return true;
  }

  return false;
};
