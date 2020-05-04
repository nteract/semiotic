import * as React from "react";
interface BrushProps {
    extent?: number[] | number[][];
    selectedExtent?: number[] | number[][];
    svgBrush: {
        (): any;
        move: Function;
    };
    position?: number[];
}
declare class Brush extends React.Component<BrushProps, null> {
    constructor(props: any);
    node: Element;
    componentDidMount(): void;
    componentDidUpdate(lastProps: any): void;
    createBrush(): void;
    render(): JSX.Element;
}
export default Brush;
