import * as React from "react";
import { Interactivity, InteractionLayerProps, InteractionLayerState } from "./types/interactionTypes";
declare class InteractionLayer extends React.PureComponent<InteractionLayerProps, InteractionLayerState> {
    constructor(props: InteractionLayerProps);
    static defaultProps: {
        svgSize: number[];
    };
    createBrush: (interaction: Interactivity) => JSX.Element;
    static getDerivedStateFromProps(nextProps: InteractionLayerProps, prevState: InteractionLayerState): {
        overlayRegions: any;
        props: InteractionLayerProps;
        interactionCanvas: any;
    };
    createColumnsBrush: (interaction: Interactivity) => React.ReactNode[];
    render(): JSX.Element;
}
export default InteractionLayer;
