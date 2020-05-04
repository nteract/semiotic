import * as React from "react";
import { MarginType, RenderPipelineType, VizLayerTypes, RoughType } from "./types/generalTypes";
declare type Props = {
    axes?: Array<React.ReactNode>;
    frameKey?: string;
    xScale: Function;
    yScale: Function;
    dataVersion?: string;
    canvasContext?: {
        getContext: Function;
    } | null;
    width: number;
    height: number;
    margin: MarginType;
    canvasPostProcess?: Function;
    title?: {
        props?: any;
    } | string;
    ariaTitle?: string;
    matte?: React.ReactNode;
    matteClip?: boolean;
    voronoiHover: Function;
    renderPipeline: RenderPipelineType;
    baseMarkProps?: object;
    projectedCoordinateNames: object;
    position: Array<number>;
    disableContext?: boolean;
    renderOrder: ReadonlyArray<VizLayerTypes>;
    sketchyRenderingEngine?: RoughType;
    axesTickLines?: React.ReactNode;
    frameRenderOrder: Array<string>;
    additionalVizElements: object;
};
declare type State = {
    canvasDrawing: Array<{
        tx: number;
        ty: number;
        i: number;
        d: {
            data: object;
        };
        styleFn: Function;
        markProps: {
            renderMode?: object;
            markType: string;
            width: number;
            height: number;
            x: number;
            y: number;
            r: number;
            rx: number;
            d: string;
        };
        renderFn?: Function;
    }>;
    dataVersion?: string;
    renderedElements: Array<React.ReactNode>;
    focusedPieceIndex: number | null;
    focusedVisualizationGroup?: any;
    piecesGroup: object;
    props: Props;
    handleKeyDown: Function;
};
declare class VisualizationLayer extends React.PureComponent<Props, State> {
    static defaultProps: {
        position: number[];
        margin: {
            left: number;
            top: number;
            right: number;
            bottom: number;
        };
    };
    constructor(props: Props);
    componentDidUpdate(lp: object): void;
    static getDerivedStateFromProps(nextProps: Props, prevState: State): {
        props: Props;
        renderedElements: any[];
        dataVersion: string;
        canvasDrawing: any[];
        piecesGroup: {};
    };
    handleKeyDown: (e: {
        keyCode: any;
    }, vizgroup: string) => void;
    render(): JSX.Element;
}
export default VisualizationLayer;
