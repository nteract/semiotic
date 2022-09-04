import React from 'react';

export interface AxisTitleProps { 
  className: string,
  translation: Array<number>,
  position: Array<number>,
  rotation: number | string,
  labelName: any,
  anchorMod: string
}

export default function AxisTitle(props: AxisTitleProps) { 
  const { className, translation, position, rotation, labelName, anchorMod } = props;
  return (
      <g
        className={`axis-title ${className}`}
        transform={`translate(${[
          translation[0] + position[0],
          translation[1] + position[1]
        ]}) rotate(${rotation})`}
      >
        {React.isValidElement(labelName) ? (
          labelName
        ) : (
          <text textAnchor={anchorMod}>{labelName}</text>
        )}
      </g>
    )
}