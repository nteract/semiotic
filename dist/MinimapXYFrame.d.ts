import * as React from "react";
import { XYFrameProps } from "./types/xyTypes";
interface MinimapXYFrameProps extends XYFrameProps {
    renderBefore?: boolean;
    minimap: {
        summaries: object[];
    };
}
declare class MinimapXYFrame extends React.Component<MinimapXYFrameProps> {
    constructor(props: any);
    static displayName: string;
    generateMinimap(): JSX.Element;
    render(): JSX.Element;
}
export default MinimapXYFrame;
