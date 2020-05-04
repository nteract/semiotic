import * as React from "react";
declare type ResponsiveFrameProps = {
    debounce: number;
    responsiveWidth?: boolean;
    responsiveHeight?: boolean;
    size?: number[];
    dataVersion?: string;
    gridDisplay?: boolean;
    elementResizeEvent?: Function;
};
declare type ResponsiveFrameState = {
    containerHeight?: number;
    containerWidth?: number;
};
declare const createResponsiveFrame: (ParticularFrame: any) => {
    new (props: any): {
        node: any;
        isResizing: any;
        _onResize: (width: any, height: any) => void;
        componentDidMount(): void;
        render(): JSX.Element;
        context: any;
        setState<K extends "containerHeight" | "containerWidth">(state: ResponsiveFrameState | ((prevState: Readonly<ResponsiveFrameState>, props: Readonly<ResponsiveFrameProps>) => ResponsiveFrameState | Pick<ResponsiveFrameState, K>) | Pick<ResponsiveFrameState, K>, callback?: () => void): void;
        forceUpdate(callback?: () => void): void;
        readonly props: Readonly<ResponsiveFrameProps> & Readonly<{
            children?: React.ReactNode;
        }>;
        state: Readonly<ResponsiveFrameState>;
        refs: {
            [key: string]: React.ReactInstance;
        };
        shouldComponentUpdate?(nextProps: Readonly<ResponsiveFrameProps>, nextState: Readonly<ResponsiveFrameState>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<ResponsiveFrameProps>, prevState: Readonly<ResponsiveFrameState>): any;
        componentDidUpdate?(prevProps: Readonly<ResponsiveFrameProps>, prevState: Readonly<ResponsiveFrameState>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<ResponsiveFrameProps>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<ResponsiveFrameProps>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<ResponsiveFrameProps>, nextState: Readonly<ResponsiveFrameState>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<ResponsiveFrameProps>, nextState: Readonly<ResponsiveFrameState>, nextContext: any): void;
    };
    defaultProps: {
        size: number[];
        debounce: number;
    };
    displayName: string;
    contextType?: React.Context<any>;
};
export default createResponsiveFrame;
