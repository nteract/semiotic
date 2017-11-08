import React from "react";

import { select } from "d3-selection";
import { arc } from "d3-shape";
import { Mark } from "semiotic-mark";

const twoPI = Math.PI * 2;

export const drawAreaConnector = ({
  x1,
  x2,
  y1,
  y2,
  sizeX1,
  sizeY1,
  sizeX2,
  sizeY2
}) => {
  return `M${x1},${y1}L${x2},${y2}L${x2 + sizeX2},${y2 + sizeY2}L${x1 +
    sizeX1},${y1 + sizeY1}Z`;
};

export const wrap = (text, width) => {
  text.each(function() {
    const textNode = select(this),
      words = textNode
        .text()
        .split(/\s+/)
        .reverse(),
      lineHeight = 1.1, // ems
      y = textNode.attr("y"),
      dy = parseFloat(textNode.attr("dy"));

    let word,
      line = [],
      lineNumber = 0,
      tspan = textNode
        .text(null)
        .append("tspan")
        .attr("x", 0)
        .attr("y", y)
        .attr("dy", `${dy}em`);

    while (words.length > 0) {
      word = words.pop();
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];

        tspan = text
          .append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", `${++lineNumber * lineHeight + dy}em`)
          .text(word);
      }
    }
  });
};

export const hexToRgb = hex => {
  if (hex.substr(0, 1).toLowerCase() === "r") {
    return hex
      .split("(")[1]
      .split(")")[0]
      .split(",");
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0];
};

export const groupBarMark = ({
  bins,
  binMax,
  columnWidth,
  projection,
  adjustedSize,
  chartSize,
  summaryI,
  data,
  summary,
  renderValue,
  summaryStyle,
  type,
  margin
}) => {
  let xProp = -columnWidth / 2;

  const mappedBins = [];
  const mappedPoints = [];

  bins.forEach((d, i) => {
    const opacity = d.value / binMax;
    const finalStyle =
      type.type === "heatmap"
        ? { opacity: opacity, fill: summaryStyle.fill }
        : summaryStyle;
    const finalColumnWidth =
      type.type === "heatmap" ? columnWidth : columnWidth * opacity;
    let yProp = d.y;
    let height = d.y1;
    let width = finalColumnWidth;
    let xOffset =
      type.type === "heatmap" ? finalColumnWidth / 2 : finalColumnWidth;
    let yOffset = d.y1 / 2;

    if (projection === "horizontal") {
      yProp =
        type.type === "heatmap"
          ? -columnWidth / 2
          : columnWidth / 2 - finalColumnWidth;
      xProp = d.y - d.y1;
      height = finalColumnWidth;
      width = d.y1;
      yOffset =
        type.type === "heatmap" ? finalColumnWidth / 2 : finalColumnWidth;
      xOffset = d.y1 / 2;
    } else if (projection === "radial") {
      const arcGenerator = arc()
        .innerRadius((d.y - margin.left) / 2)
        .outerRadius((d.y + d.y1 - margin.left) / 2);

      const angle = summary.pct - summary.pct_padding;
      let startAngle = summary.pct_middle - summary.pct_padding;

      let endAngle =
        type.type === "heatmap"
          ? startAngle + angle
          : startAngle + angle * opacity;
      startAngle *= twoPI;
      endAngle *= twoPI;

      const arcAdjustX = adjustedSize[0] / 2;
      const arcAdjustY = adjustedSize[1] / 2;

      const arcTranslate = `translate(${arcAdjustX},${arcAdjustY})`;
      const arcCenter = arcGenerator.centroid({ startAngle, endAngle });
      mappedPoints.push({
        key: summary.name,
        value: d.value,
        pieces: d.pieces.map(d => d.piece),
        label: "Heatmap",
        x: arcCenter[0] + arcAdjustX,
        y: arcCenter[1] + arcAdjustY
      });
      mappedBins.push(
        <Mark
          markType="path"
          transform={arcTranslate}
          renderMode={renderValue}
          key={`groupIcon-${summaryI}-${i}`}
          d={arcGenerator({ startAngle, endAngle })}
          style={finalStyle}
        />
      );
    }
    if (projection !== "radial") {
      mappedPoints.push({
        key: summary.name,
        value: d.value,
        pieces: d.pieces.map(d => d.piece),
        label: "Heatmap",
        x: xProp + xOffset,
        y: yProp + yOffset
      });

      mappedBins.push(
        <Mark
          markType="rect"
          renderMode={renderValue}
          key={`groupIcon-${summaryI}-${i}`}
          x={xProp}
          y={yProp}
          height={height}
          width={width}
          style={finalStyle}
        />
      );
    }
  });

  return { marks: mappedBins, points: mappedPoints };
};
