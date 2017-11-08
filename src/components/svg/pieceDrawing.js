import React from "react";
import { Mark } from "semiotic-mark";

export function pointOnArcAtAngle(center, angle, distance) {
  const radians = Math.PI * (angle + 0.75) * 2;

  const xPosition = center[0] + distance * Math.cos(radians);
  const yPosition = center[1] + distance * Math.sin(radians);

  return [xPosition, yPosition];
}

export const renderLaidOutPieces = ({ data, shouldRender }) =>
  !shouldRender
    ? null
    : data.map(
        (d, i) =>
          React.isValidElement(d.renderElement || d) ? (
            d.renderElement || d
          ) : (
            <Mark
              key={d.renderKey || `piece-render-${i}`}
              {...d.renderElement || d}
            />
          )
      );
