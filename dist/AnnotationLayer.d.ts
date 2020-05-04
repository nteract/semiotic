import * as React from "react";
import { AnnotationHandling, AnnotationTypes } from "./types/annotationTypes";
import { LegendProps } from "./types/legendTypes";
export interface AnnotationLayerProps {
    useSpans: boolean;
    legendSettings?: LegendProps;
    margin: {
        top?: number;
        left?: number;
        right?: number;
        bottom?: number;
    };
    size: number[];
    axes?: React.ReactNode[];
    annotationHandling?: AnnotationHandling | AnnotationTypes;
    annotations: Object[];
    pointSizeFunction?: Function;
    labelSizeFunction?: Function;
    svgAnnotationRule: Function;
    htmlAnnotationRule: Function;
    voronoiHover: Function;
    position?: number[];
}
interface AnnotationLayerState {
    svgAnnotations: Object[];
    htmlAnnotations: Object[];
    adjustedAnnotationsKey?: string;
    adjustedAnnotationsDataVersion?: string;
    adjustedAnnotations: Object[];
    SpanOrDiv: Function;
}
declare class AnnotationLayer extends React.Component<AnnotationLayerProps, AnnotationLayerState> {
    constructor(props: AnnotationLayerProps);
    static getDerivedStateFromProps(nextProps: AnnotationLayerProps, prevState: AnnotationLayerState): {
        svgAnnotations: Object[];
        htmlAnnotations: any[];
        adjustedAnnotations: Object[];
        adjustedAnnotationsKey: string;
        adjustedAnnotationsDataVersion: string;
    };
    render(): JSX.Element;
}
export default AnnotationLayer;
