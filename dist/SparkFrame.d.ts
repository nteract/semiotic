import * as React from "react";
declare type SparkFrameProps = {
    size?: number[];
    style: object;
};
declare type SparkFrameState = {
    containerHeight: number;
    containerWidth: number;
};
declare const createSparkFrame: (Frame: any, defaults: any, frameName: any) => {
    new (props: any): {
        node: any;
        _onResize: (width: any, height: any) => void;
        componentDidMount(): void;
        render(): JSX.Element;
        context: any;
        setState<K extends "containerHeight" | "containerWidth">(state: SparkFrameState | ((prevState: Readonly<SparkFrameState>, props: Readonly<SparkFrameProps>) => SparkFrameState | Pick<SparkFrameState, K>) | Pick<SparkFrameState, K>, callback?: () => void): void;
        forceUpdate(callback?: () => void): void;
        readonly props: Readonly<SparkFrameProps> & Readonly<{
            children?: React.ReactNode;
        }>;
        state: Readonly<SparkFrameState>;
        refs: {
            [key: string]: React.ReactInstance;
        };
        shouldComponentUpdate?(nextProps: Readonly<SparkFrameProps>, nextState: Readonly<SparkFrameState>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<SparkFrameProps>, prevState: Readonly<SparkFrameState>): any;
        componentDidUpdate?(prevProps: Readonly<SparkFrameProps>, prevState: Readonly<SparkFrameState>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<SparkFrameProps>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<SparkFrameProps>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<SparkFrameProps>, nextState: Readonly<SparkFrameState>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<SparkFrameProps>, nextState: Readonly<SparkFrameState>, nextContext: any): void;
    };
    displayName: any;
    defaultProps: {
        size: any[];
    };
    contextType?: React.Context<any>;
};
export declare const axisDefaults: {
    tickFormat: () => string;
    baseline: boolean;
};
export declare const xyFrameDefaults: (props: any) => any;
export declare const ordinalFrameDefaults: (props: any) => any;
export declare const networkFrameDefaults: (props: any) => any;
export default createSparkFrame;
