import React from "react";

import { Mark } from "semiotic-mark";

import {
  d as glyphD /*, project as glyphProject, mutate as glyphMutate*/
} from "d3-glyphedge";

const customEdgeHashD = {
  linearc: d => glyphD.lineArc(d),
  ribbon: d => glyphD.ribbon(d, d.width),
  arrowhead: d =>
    glyphD.arrowhead(d, d.target.nodeSize, d.width, d.width * 1.5),
  halfarrow: d =>
    glyphD.halfArrow(d, d.target.nodeSize, d.width, d.width * 1.5),
  nail: d => glyphD.nail(d, d.source.nodeSize),
  comet: d => glyphD.comet(d, d.target.nodeSize),
  taffy: d =>
    glyphD.taffy(
      d,
      d.source.nodeSize / 2,
      d.target.nodeSize / 2,
      (d.source.nodeSize + d.target.nodeSize) / 4
    )
};

const circleNodeGenerator = ({
  d,
  i,
  renderKeyFn,
  styleFn,
  classFn,
  renderMode,
  key,
  className,
  transform
}) => {
  //this is repetitious
  return (
    <Mark
      key={key}
      transform={transform}
      markType="rect"
      width={d.nodeSize * 2}
      height={d.nodeSize * 2}
      ry={d.nodeSize * 2}
      rx={d.nodeSize * 2}
      x={-d.nodeSize}
      y={-d.nodeSize}
      style={styleFn(d, i)}
      renderMode={renderMode ? renderMode(d, i) : undefined}
      className={className}
    />
  );
};

const genericLineGenerator = d =>
  `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;

export const drawNodes = ({
  data,
  renderKeyFn,
  customMark,
  styleFn,
  classFn,
  renderMode,
  canvasDrawing
}) => {
  const markGenerator = customMark || circleNodeGenerator;

  return data.map((d, i) => {
    return markGenerator({
      d,
      i,
      renderKeyFn,
      styleFn,
      classFn,
      renderMode,
      key: renderKeyFn ? renderKeyFn(d, i) : d.id || `node-${i}`,
      className: `node ${classFn(d, i)}`,
      transform: `translate(${d.x},${d.y})`
    });
  });
};

export const drawEdges = ({
  data,
  renderKeyFn,
  customMark,
  styleFn,
  classFn,
  renderMode,
  canvasDrawing,
  type
}) => {
  let dGenerator = genericLineGenerator;
  if (customMark) {
    return data.map((d, i) => {
      return customMark({
        d,
        i,
        renderKeyFn,
        styleFn,
        classFn,
        renderMode,
        key: renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`,
        className: `${classFn(d, i)} edge`,
        transform: `translate(${d.x},${d.y})`
      });
    });
  }
  if (type) {
    if (typeof type === "function") {
      dGenerator = type;
    } else if (customEdgeHashD[type]) {
      dGenerator = d => customEdgeHashD[type](d);
    }
  }

  return data.map((d, i) => {
    return (
      <Mark
        key={renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`}
        markType="path"
        renderMode={renderMode ? renderMode(d, i) : undefined}
        className={`${classFn(d)} edge`}
        d={dGenerator(d)}
        style={styleFn(d, i)}
      />
    );
  });
};
