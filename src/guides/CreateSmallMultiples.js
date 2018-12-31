import React from "react";
import MarkdownText from "../MarkdownText";

export default () => {
  return (
    <div>
      <MarkdownText
        text={`
      
Faceting is accomplshed using the FacetController, which is a wrapper that uses composition to decorate any child frames (whether ORFrame, NetworkFrame or XYFrame in any mix) with the valid attributes from FacetController while implementing two features to help with faceting:

pieceHoverAnnotation or hoverAnnotation set to true will create tooltips across the frames. You still need to set lineIDAccessor and/or pieceIDAccessor to appropriate values for this to work relatively. If your pieces in ORFrame have matching data structures with points in XYFrame then you will also see tooltips across frames. Currently the hover annotation settings in FacetController only accept true but in the future will respect the model in the rest of Semiotic where you can send an array of annotation types or functions returning annotation types which will be propagated across frames.

sharedXExtent, sharedYExtent and sharedRExtent will set the respective extents of child frames to match the min/max of the smallest and largest values of any siblings. Currently this only supports true but will also be updated to support the existing extent model in frames where you can send partial extents.      
      
      `}
      />
    </div>
  );
};
