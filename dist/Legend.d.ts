import * as React from "react";
import { LegendGroup, LegendProps } from "./types/legendTypes";
declare class Legend extends React.Component<LegendProps, null> {
    renderLegendGroup(legendGroup: LegendGroup): any[];
    renderLegendGroupHorizontal(legendGroup: LegendGroup): {
        items: any[];
        offset: number;
    };
    renderGroup({ legendGroups, width }: {
        legendGroups: LegendGroup[];
        width: number;
    }): any[];
    renderHorizontalGroup({ legendGroups, title, height }: {
        legendGroups: LegendGroup[];
        title: string | boolean;
        height: number;
    }): JSX.Element;
    render(): JSX.Element;
}
export default Legend;
