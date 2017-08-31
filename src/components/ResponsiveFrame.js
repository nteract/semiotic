import React from "react";
import Dimensions from "react-dimensions";
import XYFrame from "./XYFrame";
import ORFrame from "./ORFrame";
import NetworkFrame from "./NetworkFrame";
import SmartFrame from "./SmartFrame";
import MinimapXYFrame from "./MinimapXYFrame";

const createResponsiveFrame = Frame => {
  return Dimensions()(
    class ResponsiveFrame extends React.Component {
      render() {
        const {
          responsiveWidth,
          responsiveHeight,
          size,
          containerHeight,
          containerWidth,
          dataVersion
        } = this.props;

        if (responsiveWidth) {
          size[0] = containerWidth;
        }

        if (responsiveHeight) {
          size[1] = containerHeight;
        }

        let dataVersionWithSize = dataVersion + size.toString();

        return (
          <Frame
            {...this.props}
            size={size}
            dataVersion={dataVersion ? dataVersionWithSize : undefined}
          />
        );
      }
    }
  );
};

export const ResponsiveXYFrame = createResponsiveFrame(XYFrame);
export const ResponsiveORFrame = createResponsiveFrame(ORFrame);
export const ResponsiveNetworkFrame = createResponsiveFrame(NetworkFrame);
export const ResponsiveSmartFrame = createResponsiveFrame(SmartFrame);
export const ResponsiveMinimapXYFrame = createResponsiveFrame(MinimapXYFrame);
