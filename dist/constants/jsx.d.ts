import * as React from "react";
declare type FilterDefTypes = {
    matte?: Element;
    key: string;
    additionalDefs?: React.ReactNode;
};
export declare const filterDefs: ({ matte, key, additionalDefs }: FilterDefTypes) => JSX.Element;
export declare const generateFinalDefs: ({ matte, size, margin, frameKey, additionalDefs, name }: {
    matte: any;
    size: any;
    margin: any;
    frameKey: any;
    additionalDefs: any;
    name: any;
}) => {
    defs: JSX.Element;
    matte: any;
};
export {};
