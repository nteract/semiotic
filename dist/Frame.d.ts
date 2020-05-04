import * as React from "react";
import { MarginType, RoughType } from "./types/generalTypes";
import { AnnotationHandling } from "./types/annotationTypes";
import { LegendProps } from "./types/legendTypes";
import { ScaleLinear } from "d3-scale";
import { AdvancedInteractionSettings } from "./types/interactionTypes";
declare type VizDataLayerKeys = "pieces" | "summaries" | "connectors" | "edges" | "nodes" | "lines" | "points";
declare type Props = {
    name?: string;
    title: object;
    margin: MarginType;
    size: Array<number>;
    annotationSettings: AnnotationHandling;
    annotations?: Array<object>;
    customHoverBehavior?: Function;
    customClickBehavior?: Function;
    customDoubleClickBehavior?: Function;
    htmlAnnotationRules?: Function;
    tooltipContent?: Function;
    className?: string;
    interaction?: object;
    renderFn?: string | Function;
    hoverAnnotation?: boolean | object | Array<object | Function> | Function;
    backgroundGraphics?: React.ReactNode | Function;
    foregroundGraphics?: React.ReactNode | Function;
    interactionOverflow?: object;
    disableContext?: boolean;
    canvasRendering?: boolean;
    useSpans: boolean;
    baseMarkProps?: object;
    canvasPostProcess?: Function;
    projection?: string;
    rScale?: ScaleLinear<number, number>;
    columns?: object;
    overlay?: Array<object>;
    legendSettings?: LegendProps;
    adjustedPosition: Array<number>;
    defaultHTMLRule: Function;
    defaultSVGRule: Function;
    beforeElements?: React.ReactNode;
    afterElements?: React.ReactNode;
    points?: Array<object>;
    projectedYMiddle?: string;
    dataVersion?: string;
    frameKey?: string;
    additionalDefs?: React.ReactNode;
    xScale: ScaleLinear<number, number>;
    yScale: ScaleLinear<number, number>;
    adjustedSize?: Array<number>;
    renderPipeline: {
        [key in VizDataLayerKeys]?: object;
    };
    projectedCoordinateNames: {
        x: string;
        y: string;
    };
    matte?: boolean | object | Element | Function;
    axes?: Array<React.ReactNode>;
    axesTickLines?: React.ReactNode;
    disableCanvasInteraction?: boolean;
    showLinePoints?: string;
    renderOrder: ReadonlyArray<VizDataLayerKeys>;
    sketchyRenderingEngine: RoughType;
    frameRenderOrder: Array<string>;
    additionalVizElements?: object;
    interactionSettings?: AdvancedInteractionSettings;
};
declare type State = {
    canvasContext?: {
        getContext: Function;
    };
    voronoiHover?: object;
    finalDefs: object;
    props: Props;
    matte: React.ReactNode;
    SpanOrDiv: Function;
};
declare class Frame extends React.Component<Props, State> {
    static defaultProps: {
        annotationSettings: {};
        adjustedPosition: number[];
        projectedCoordinateNames: {
            x: string;
            y: string;
        };
        renderOrder: any[];
        frameRenderOrder: string[];
        additionalVizElements: {};
    };
    constructor(props: Props);
    canvasContext: any;
    componentDidMount(): void;
    componentDidUpdate(): void;
    static getDerivedStateFromProps(nextProps: Props, prevState: State): {
        finalDefs: JSX.Element;
        matte: any;
        props: Props;
    };
    setVoronoi: (d: Object) => void;
    render(): JSX.Element;
}
export default Frame;
