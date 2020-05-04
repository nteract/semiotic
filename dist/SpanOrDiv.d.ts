import * as React from "react";
declare type Props = {
    style?: object;
    className?: string;
    children: React.ReactNode | React.ReactNode[];
    span: boolean;
};
declare class SpanOrDiv extends React.PureComponent<Props> {
    render(): JSX.Element;
}
export declare const HOCSpanOrDiv: (span: any) => (props: any) => JSX.Element;
export default SpanOrDiv;
