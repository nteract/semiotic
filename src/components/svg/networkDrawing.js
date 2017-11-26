import React from "react";

import { Mark } from "semiotic-mark";

import {
  d as glyphD /*, project as glyphProject, mutate as glyphMutate*/
} from "d3-glyphedge";

const customEdgeHashD = {
  linearc: d => glyphD.lineArc(d),
  ribbon: d => glyphD.ribbon(d, d.width),
  arrowhead: d =>
    glyphD.arrowHead(d, d.target.nodeSize, d.width, d.width * 1.5),
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
  canvasDrawing,
  canvasRenderFn
}) => {
  const markGenerator = customMark || circleNodeGenerator;
  const renderedData = [];

  if (customMark && canvasRenderFn) {
    console.error(
      "canvas rendering currently only supports generic circle nodes based on nodeSize"
    );
  }

  data.forEach((d, i) => {
    if (canvasRenderFn && canvasRenderFn(d, i) === true) {
      const canvasNode = {
        baseClass: "frame-piece",
        tx: d.x,
        ty: d.y,
        d,
        i,
        markProps: { markType: "circle", r: d.nodeSize },
        styleFn,
        renderFn: renderMode,
        classFn
      };
      canvasDrawing.push(canvasNode);
    } else {
      renderedData.push(
        markGenerator({
          d,
          i,
          renderKeyFn,
          styleFn,
          classFn,
          renderMode,
          key: renderKeyFn ? renderKeyFn(d, i) : d.id || `node-${i}`,
          className: `node ${classFn(d, i)}`,
          transform: `translate(${d.x},${d.y})`
        })
      );
    }
  });
  return renderedData;
};

export const drawEdges = ({
  data,
  renderKeyFn,
  customMark,
  styleFn,
  classFn,
  renderMode,
  canvasRenderFn,
  canvasDrawing,
  type
}) => {
  let dGenerator = genericLineGenerator;
  const renderedData = [];
  if (customMark) {
    data.forEach((d, i) => {
      renderedData.push(
        customMark({
          d,
          i,
          renderKeyFn,
          styleFn,
          classFn,
          renderMode,
          key: renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`,
          className: `${classFn(d, i)} edge`,
          transform: `translate(${d.x},${d.y})`
        })
      );
    });
  } else {
    if (type) {
      if (typeof type === "function") {
        dGenerator = type;
      } else if (customEdgeHashD[type]) {
        dGenerator = d => customEdgeHashD[type](d);
      }
    }
    data.forEach((d, i) => {
      if (canvasRenderFn && canvasRenderFn(d, i) === true) {
        const canvasNode = {
          baseClass: "frame-piece",
          tx: d.x,
          ty: d.y,
          d,
          i,
          markProps: { markType: "path", d: dGenerator(d) },
          styleFn,
          renderFn: renderMode,
          classFn
        };
        canvasDrawing.push(canvasNode);
      } else {
        renderedData.push(
          <Mark
            key={renderKeyFn ? renderKeyFn(d, i) : `edge-${i}`}
            markType="path"
            renderMode={renderMode ? renderMode(d, i) : undefined}
            className={`${classFn(d)} edge`}
            d={dGenerator(d)}
            style={styleFn(d, i)}
          />
        );
      }
    });
  }

  return renderedData;
};
