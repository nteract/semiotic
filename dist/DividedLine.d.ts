import * as React from "react";
import { ProjectedLine } from "./types/generalTypes";
interface DividedLineProps {
    parameters: Function;
    className: string;
    customAccessors: {
        x: Function;
        y: Function;
    };
    lineDataAccessor: Function;
    data: ProjectedLine[];
    interpolate?: Function;
    searchIterations?: number;
}
declare class DividedLine extends React.Component<DividedLineProps, {}> {
    constructor(props: any);
    createLineSegments(): JSX.Element[];
    render(): JSX.Element;
}
export default DividedLine;
