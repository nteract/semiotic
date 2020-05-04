import * as React from "react";
declare type InteractionCanvasProps = {
    height: number;
    width: number;
    overlayRegions: any;
    margin: any;
    voronoiHover: Function;
};
declare type InteractionCanvasState = {
    ref: any;
    interactionContext: any;
};
declare class InteractionCanvas extends React.Component<InteractionCanvasProps, InteractionCanvasState> {
    constructor(props: InteractionCanvasProps);
    canvasMap: Map<string, number>;
    componentDidMount(): void;
    componentDidUpdate(prevProps: InteractionCanvasProps, prevState: InteractionCanvasState): void;
    canvasRendering: () => void;
    render(): JSX.Element;
}
export default InteractionCanvas;
