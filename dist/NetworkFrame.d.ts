import * as React from "react";
import { AnnotationType } from "./types/annotationTypes";
import { GenericObject } from "./types/generalTypes";
import { NodeType, NetworkFrameProps, NetworkFrameState } from "./types/networkTypes";
import { AnnotationLayerProps } from "./AnnotationLayer";
declare class NetworkFrame extends React.Component<NetworkFrameProps, NetworkFrameState> {
    static defaultProps: {
        annotations: any[];
        foregroundGraphics: any[];
        annotationSettings: {};
        size: number[];
        className: string;
        name: string;
        networkType: {
            type: string;
            iterations: number;
        };
        filterRenderedNodes: (d: NodeType) => boolean;
    };
    static displayName: string;
    constructor(props: NetworkFrameProps);
    componentWillUnmount(): void;
    static getDerivedStateFromProps(nextProps: NetworkFrameProps, prevState: NetworkFrameState): {
        props: NetworkFrameProps;
        adjustedPosition: number[];
        adjustedSize: number[];
        backgroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
        foregroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
        title: import("./svg/frameFunctions").TitleType;
        renderNumber: number;
        projectedNodes: NodeType[];
        projectedEdges: import("./types/networkTypes").EdgeType[];
        projectedXYPoints: any;
        overlay: any[];
        nodeIDAccessor: (d?: GenericObject, i?: number) => string;
        sourceAccessor: (d?: GenericObject, i?: number) => string | GenericObject;
        targetAccessor: (d?: GenericObject, i?: number) => string | GenericObject;
        nodeSizeAccessor: (args?: GenericObject) => number;
        edgeWidthAccessor: (d?: GenericObject, i?: number) => number;
        margin: import("./types/generalTypes").MarginType;
        legendSettings: any;
        networkFrameRender: {
            edges: {
                accessibleTransform: (data: any, i: any) => any;
                data: import("./types/networkTypes").EdgeType[];
                styleFn: (d?: GenericObject, i?: number) => GenericObject;
                classFn: (d?: GenericObject, i?: number) => string;
                renderMode: (d?: GenericObject, i?: number) => string | GenericObject;
                canvasRenderFn: (d?: GenericObject, i?: number) => boolean;
                renderKeyFn: (d: any) => any;
                behavior: ({ data: baseData, renderKeyFn, customMark, styleFn, classFn, renderMode, canvasRenderFn, canvasDrawing, type, baseMarkProps, networkSettings, projection }: {
                    data: any;
                    renderKeyFn: any;
                    customMark: any;
                    styleFn: any;
                    classFn: any;
                    renderMode: any;
                    canvasRenderFn: any;
                    canvasDrawing: any;
                    type: any;
                    baseMarkProps: any;
                    networkSettings: any;
                    projection: any;
                }) => any[];
                projection: "horizontal" | "vertical" | "radial";
                type: TimerHandler;
                customMark: any;
                networkSettings: import("./types/networkTypes").NetworkSettingsType;
            };
            nodes: {
                accessibleTransform: (data: any, i: any) => any;
                data: NodeType[];
                styleFn: (d?: GenericObject, i?: number) => GenericObject;
                classFn: (d?: GenericObject, i?: number) => string;
                renderMode: (d?: GenericObject, i?: number) => string | GenericObject;
                canvasRenderFn: (d?: GenericObject, i?: number) => boolean;
                customMark: any;
                behavior: ({ data, renderKeyFn, customMark, styleFn, classFn, renderMode, canvasDrawing, canvasRenderFn, baseMarkProps }: {
                    data: any;
                    renderKeyFn: any;
                    customMark: any;
                    styleFn: any;
                    classFn: any;
                    renderMode: any;
                    canvasDrawing: any;
                    canvasRenderFn: any;
                    baseMarkProps: any;
                }) => any[];
                renderKeyFn: (args: GenericObject) => string;
            };
        };
        nodeLabelAnnotations: any[];
        graphSettings: {
            type: string | (({ edges, nodes }: {
                edges: import("./types/networkTypes").EdgeType[];
                nodes: NodeType[];
            }) => void);
            hierarchyChildren?: Function;
            hierarchySum?: Function;
            layout?: Function;
            nodeSize?: Function;
            nodes: object[] | NodeType[];
            edges: object | object[] | import("./types/networkTypes").EdgeType[];
            iterations?: number;
            width?: number;
            height?: number;
            projection?: "horizontal" | "vertical" | "radial";
            customSankey?: Function;
            groupWidth?: number;
            padAngle?: number;
            padding?: number;
            orient?: string;
            nodePadding?: number;
            nodePaddingRatio?: number;
            nodeWidth?: number;
            direction?: string;
            fontSize?: number;
            rotate?: Function;
            fontWeight?: number;
            textAccessor?: Function;
            edgeStrength?: number;
            distanceMax?: number;
            edgeDistance?: number;
            forceManyBody?: number | Function;
            hierarchicalNetwork: boolean;
            graphSettings: import("./types/networkTypes").GraphSettingsType;
            sortGroups?: Function;
            simulation?: Function;
            sort?: (a: GenericObject, b: GenericObject) => number;
            zoom?: boolean | "stretch" | ((nodes: NodeType[], size: number[]) => void);
            fixExistingNodes?: boolean | Function;
            nodeHash: Map<any, NodeType>;
            edgeHash: Map<any, import("./types/networkTypes").EdgeType>;
        };
    } | {
        props: NetworkFrameProps;
    };
    onNodeClick(d: Object, i: number): void;
    onNodeEnter(d: Object, i: number): void;
    onNodeOut(d: Object, i: number): void;
    defaultNetworkSVGRule: ({ d: baseD, i, annotationLayer }: {
        d: AnnotationType;
        i: number;
        annotationLayer: AnnotationLayerProps;
    }) => any;
    defaultNetworkHTMLRule: ({ d: baseD, i, annotationLayer }: {
        d: AnnotationType;
        i: number;
        annotationLayer: AnnotationLayerProps;
    }) => any;
    render(): JSX.Element;
}
export default NetworkFrame;
