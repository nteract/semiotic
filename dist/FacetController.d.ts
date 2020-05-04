import * as React from "react";
import { OrdinalFrameProps } from "./types/ordinalTypes";
import { XYFrameProps } from "./types/xyTypes";
import { CustomHoverType } from "./types/annotationTypes";
interface FacetControllerProps {
    children: Element;
    sharedRExtent: boolean;
    sharedXExtent: boolean;
    sharedYExtent: boolean;
}
declare type Props = FacetControllerProps & OrdinalFrameProps & XYFrameProps;
interface State {
    extents: object;
    rawExtents: object;
    facetHover?: object;
    facetHoverAnnotations?: CustomHoverType;
}
declare class FacetController extends React.Component<Props, State> {
    state: {
        extents: {};
        rawExtents: {};
        facetHover: any;
    };
    /**
     * Helper for creating extent if we have a  min/max value
     * use that else use the onChange version so we can in return
     * normalize all of the facets to have the same extents
     */
    createExtent: (extentType: string, state: State, index: number) => {
        onChange: (extentValue: number[]) => number[];
        extent: any;
    } | {
        onChange: (extentValue: number[]) => number[];
        extent?: undefined;
    };
    /**
     * Whenever the extent changes, create the min/max values for each extentType
     * so this could be rExtent for OrdinalFrame or x/yExtent for the XYFrame
     */
    extentHandler: (extentType: string, extentPosition: number) => (extentValue: number[]) => number[];
    /**
     * Remove and add required annotation props for specific annotation types.
     */
    generateChildAnnotations: ({ originalAnnotations, state }: {
        originalAnnotations: Object[];
        state: State;
    }) => Object[];
    /**
     * Map hover annotations and extent to child. Initially the extent is an object with
     * an onChange handler however once each of those resolve we then create an
     * extent that matches between all of them. This logic can be found in createExtent and also
     * extentHandler
     */
    mapChildrenWithAppropriateProps: ({ child, index, originalAnnotations, props, state }: {
        child: React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)>;
        props: Props;
        index: number;
        state: State;
        originalAnnotations: Object[];
    }) => React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)>;
    /**
     * Memoize the mapping to prevent unecessary updates and not have
     * to use the lifecycle methods.
     */
    processFacetController: (props: Props, state: State) => React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)>[];
    render(): JSX.Element;
}
export default FacetController;
