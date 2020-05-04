/// <reference types="react" />
declare const _default: {
    new (props: any): {
        node: any;
        isResizing: any;
        _onResize: (width: any, height: any) => void;
        componentDidMount(): void;
        render(): JSX.Element;
        context: any;
        setState<K extends "containerHeight" | "containerWidth">(state: {
            containerHeight?: number;
            containerWidth?: number;
        } | ((prevState: Readonly<{
            containerHeight?: number;
            containerWidth?: number;
        }>, props: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }>) => {
            containerHeight?: number;
            containerWidth?: number;
        } | Pick<{
            containerHeight?: number;
            containerWidth?: number;
        }, K>) | Pick<{
            containerHeight?: number;
            containerWidth?: number;
        }, K>, callback?: () => void): void;
        forceUpdate(callback?: () => void): void;
        readonly props: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }> & Readonly<{
            children?: import("react").ReactNode;
        }>;
        state: Readonly<{
            containerHeight?: number;
            containerWidth?: number;
        }>;
        refs: {
            [key: string]: import("react").ReactInstance;
        };
        shouldComponentUpdate?(nextProps: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }>, nextState: Readonly<{
            containerHeight?: number;
            containerWidth?: number;
        }>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        componentDidCatch?(error: Error, errorInfo: import("react").ErrorInfo): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }>, prevState: Readonly<{
            containerHeight?: number;
            containerWidth?: number;
        }>): any;
        componentDidUpdate?(prevProps: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }>, prevState: Readonly<{
            containerHeight?: number;
            containerWidth?: number;
        }>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }>, nextState: Readonly<{
            containerHeight?: number;
            containerWidth?: number;
        }>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<{
            debounce: number;
            responsiveWidth?: boolean;
            responsiveHeight?: boolean;
            size?: number[];
            dataVersion?: string;
            gridDisplay?: boolean;
            elementResizeEvent?: Function;
        }>, nextState: Readonly<{
            containerHeight?: number;
            containerWidth?: number;
        }>, nextContext: any): void;
    };
    defaultProps: {
        size: number[];
        debounce: number;
    };
    displayName: string;
    contextType?: import("react").Context<any>;
};
export default _default;
