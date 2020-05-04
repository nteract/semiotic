import { AnnotationProps } from "../types/annotationTypes";
declare type NoteType = {
    props: AnnotationProps;
};
declare type AnnotationTypes = "marginalia" | "bump" | false;
interface Layout {
    type: AnnotationTypes;
    orient?: "nearest" | "left" | "right" | "top" | "bottom" | string[];
    characterWidth?: number;
    lineWidth?: number;
    lineHeight?: number;
    padding?: number;
    iterations?: number;
    pointSizeFunction?: Function;
    labelSizeFunction?: Function;
    marginOffset?: number;
}
export declare function bumpAnnotations(adjustableNotes: NoteType[], processor: Layout, size: number[], propsPointSizeFunction?: Function, propsLabelSizeFunction?: Function): NoteType[];
export {};
