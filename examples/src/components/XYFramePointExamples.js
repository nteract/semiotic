import React from 'react'
import { XYFrame, Mark } from 'semiotic';

const colors = [
    "#00a2ce",
    "#4d430c",
    "#b3331d",
    "#b6a756"
]
const testData = []
for (let x=1;x<500;x++) {
    testData.push({ x: Math.random() * 100, y: Math.random() * 100, r: Math.random() * 10, color: colors[x%4] })
}

class XYFramePointExamples extends React.Component {
    constructor(props){
        super(props);
    }

    render() {

        const frameHeight = 300

        return <div>
            <XYFrame
            title="Points"
            size={[ 500,frameHeight ]}
            points={testData}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            canvasPoints={(d,i) => i%3 === 0}
            pointStyle={d => ({ fill: d.color, stroke: "black", strokeWidth: 1 })}
            customPointMark={(d,i) => i%2 ? <Mark markType="circle" r="5" /> : <Mark markType="rect" x={-4} y={-4} width={8} height={8} />}
            margin={10}
            />
            </div>
    }
}

module.exports = XYFramePointExamples;
