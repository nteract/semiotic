'use strict';

// modules
import React from 'react'

import XYFrame from './XYFrame'
import ORFrame from './ORFrame'

// components

// let PropTypes = React.PropTypes;

class SmartFrame extends React.Component {
    constructor(props){
        super(props);

    }

    render() {
        if (this.props.frameType === "orFrame") {
            return <ORFrame {...this.props}
                oAccessor={this.props.xAccessor}
                rAccessor={this.props.yAccessor}
                data={this.props.pieceData}
                groupData={this.props.aggData}
                groupDataAccessor={this.props.aggDataAccessor}
                dataAccessor={this.props.pieceDataAccessor}
                groupType={this.props.customAggType}
                groupStyle={this.props.aggStyle}
                style={this.props.pieceStyle}
                type={this.props.customPieceType}
            />
        }
        return <XYFrame {...this.props}
            points={this.props.pieceData}
            lines={this.props.aggData}
            lineDataAccessor={this.props.aggDataAccessor}
            pointDataAccessor={this.props.pieceDataAccessor}
            customLineType={this.props.customAggType}
            lineStyle={this.props.aggStyle}
            pointStyle={this.props.pieceStyle}
        />
    }
}


export default SmartFrame;
