import * as React from "react";
import { AxisProps } from "./types/annotationTypes";
interface AxisState {
    hoverAnnotation: number;
    calculatedLabelPosition?: number;
}
declare class Axis extends React.Component<AxisProps, AxisState> {
    constructor(props: any);
    axisRef?: {
        querySelectorAll: Function;
    };
    boundingBoxMax: () => number;
    componentDidUpdate(): void;
    componentDidMount(): void;
    render(): JSX.Element;
}
export default Axis;
