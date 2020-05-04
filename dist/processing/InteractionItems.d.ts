import { CustomHoverType } from "../types/annotationTypes";
import { InteractionLayerProps } from "../types/interactionTypes";
export declare const changeVoronoi: (voronoiHover: Function, d?: {
    type?: string;
    data?: object[];
}, customHoverTypes?: CustomHoverType, customHoverBehavior?: Function, points?: Object[]) => void;
export declare const clickVoronoi: (d: Object, customClickBehavior: Function, points: Object[]) => void;
export declare const doubleclickVoronoi: (d: Object, customDoubleClickBehavior: Function, points: Object[]) => void;
export declare const brushStart: (e?: number[] | number[][], columnName?: string, data?: object, columnData?: object, interaction?: any) => void;
export declare const brushing: (e?: number[] | number[][], columnName?: string, data?: object, columnData?: object, interaction?: any) => void;
export declare const brushEnd: (e?: number[] | number[][], columnName?: string, data?: object, columnData?: object, interaction?: any) => void;
export declare const calculateOverlay: (props: InteractionLayerProps) => any[];
