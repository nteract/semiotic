import * as React from "react";
declare type Props = {
    tooltipContent: Function;
    tooltipContentArgs?: object;
};
declare type State = {
    collision: object;
    tooltipContainerInitialDimensions: object;
    tooltipContentArgsCurrent: object;
};
declare class TooltipPositioner extends React.Component<Props, State> {
    private containerRef;
    state: {
        collision: any;
        tooltipContainerInitialDimensions: any;
        tooltipContentArgsCurrent: any;
    };
    checkPosition: () => void;
    componentDidMount(): void;
    componentDidUpdate(pp: any): void;
    render(): JSX.Element;
}
export default TooltipPositioner;
