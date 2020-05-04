/// <reference types="react" />
declare const _default: {
    new (props: any): {
        node: any;
        _onResize: (width: any, height: any) => void;
        componentDidMount(): void;
        render(): JSX.Element;
        context: any;
        setState<K extends "containerHeight" | "containerWidth">(state: {
            containerHeight: number;
            containerWidth: number;
        } | ((prevState: Readonly<{
            containerHeight: number;
            containerWidth: number;
        }>, props: Readonly<{
            size?: number[];
            style: object;
        }>) => {
            containerHeight: number;
            containerWidth: number;
        } | Pick<{
            containerHeight: number;
            containerWidth: number;
        }, K>) | Pick<{
            containerHeight: number;
            containerWidth: number;
        }, K>, callback?: () => void): void;
        forceUpdate(callback?: () => void): void;
        readonly props: Readonly<{
            size?: number[];
            style: object;
        }> & Readonly<{
            children?: import("react").ReactNode;
        }>;
        state: Readonly<{
            containerHeight: number;
            containerWidth: number;
        }>;
        refs: {
            [key: string]: import("react").ReactInstance;
        };
        shouldComponentUpdate?(nextProps: Readonly<{
            size?: number[];
            style: object;
        }>, nextState: Readonly<{
            containerHeight: number;
            containerWidth: number;
        }>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        componentDidCatch?(error: Error, errorInfo: import("react").ErrorInfo): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<{
            size?: number[];
            style: object;
        }>, prevState: Readonly<{
            containerHeight: number;
            containerWidth: number;
        }>): any;
        componentDidUpdate?(prevProps: Readonly<{
            size?: number[];
            style: object;
        }>, prevState: Readonly<{
            containerHeight: number;
            containerWidth: number;
        }>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<{
            size?: number[];
            style: object;
        }>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{
            size?: number[];
            style: object;
        }>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<{
            size?: number[];
            style: object;
        }>, nextState: Readonly<{
            containerHeight: number;
            containerWidth: number;
        }>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<{
            size?: number[];
            style: object;
        }>, nextState: Readonly<{
            containerHeight: number;
            containerWidth: number;
        }>, nextContext: any): void;
    };
    displayName: any;
    defaultProps: {
        size: any[];
    };
    contextType?: import("react").Context<any>;
};
export default _default;
