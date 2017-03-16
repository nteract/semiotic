import React from 'react';
import { Mark } from 'abacus-viz-framework';

class MarkExamples extends React.Component {
    constructor(props){
        super(props);
    }

    render () {
        const mark = <Mark
            markType="rect"
            width={100}
            height={100}
            x={25}
            y={25}
            draggable={true}
            style={{ fill: "#00a2ce", stroke: "blue", strokeWidth: "1px" }}
            />

        const circleMark = <Mark
            markType="circle"
            renderMode="forcePath"
            r={50}
            cx={205}
            cy={255}
            style={{ fill: "#00a2ce", stroke: "blue", strokeWidth: "1px" }}
            />

        const resetMark = <Mark
            markType="rect"
            width={100}
            height={100}
            x={25}
            y={135}
            draggable={true}
            resetAfter={true}
            style={{ fill: "#4d430c" }}
            />

        const verticalBarMark = <Mark
            markType="verticalbar"
            width={50}
            height={100}
            x={185}
            y={150}
            style={{ fill: "#b3331d" }}
            />

        const horizontalBarMark = <Mark
            markType="horizontalbar"
            width={50}
            height={100}
            x={185}
            y={150}
            style={{ fill: "#b6a756" }}
            />

        const sketchyMark = <Mark
            markType="rect"
            renderMode="sketchy"
            width={100}
            height={100}
            x={25}
            y={250}
            style={{ fill: "#b86117", stroke: "#b86117", strokeWidth: "4px" }}
            />

        return <svg height="365" width="500">
            {mark}
            {circleMark}
            {resetMark}
            {sketchyMark}
            {horizontalBarMark}
            {verticalBarMark}
        </svg>
    }
}

module.exports = MarkExamples
