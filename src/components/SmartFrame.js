import React from "react"

import XYFrame from "./XYFrame"
import OrdinalFrame from "./OrdinalFrame"

export default props => {
  if (props.frameType === "orFrame") {
    return (
      <OrdinalFrame
        {...props}
        oAccessor={props.xAccessor}
        rAccessor={props.yAccessor}
        data={props.pieceData}
        groupData={props.aggData}
        groupDataAccessor={props.aggDataAccessor}
        dataAccessor={props.pieceDataAccessor}
        groupType={props.customAggType}
        groupStyle={props.aggStyle}
        style={props.pieceStyle}
        type={props.customPieceType}
      />
    )
  }
  return (
    <XYFrame
      {...props}
      points={props.pieceData}
      lines={props.aggData}
      lineDataAccessor={props.aggDataAccessor}
      pointDataAccessor={props.pieceDataAccessor}
      lineType={props.customAggType}
      lineStyle={props.aggStyle}
      pointStyle={props.pieceStyle}
    />
  )
}
