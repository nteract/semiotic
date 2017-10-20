import React from "react";
import ReactResizeDetector from "react-resize-detector";
import PropTypes from "prop-types";
import XYFrame from "./XYFrame";
import ORFrame from "./ORFrame";
import NetworkFrame from "./NetworkFrame";
import SmartFrame from "./SmartFrame";
import MinimapXYFrame from "./MinimapXYFrame";

const createResponsiveFrame = Frame =>
  class ResponsiveFrame extends React.Component {
    static propTypes = {
      size : PropTypes.array
    };

    static defaultProps = {
      size : [500, 500]
    };
    
    constructor(props) {
      super(props);

      this.state = {
        containerHeight: props.size[1],
        containerWidth: props.size[0]
      };

      this.oAccessor = null;
      this.rAccessor = null;
      this.oScale = null;
      this.rScale = null;
    }

    _onResize = (width, height) => {
      this.setState({ containerHeight: height, containerWidth: width });
    }

    render() {
      const {
        responsiveWidth,
        responsiveHeight,
        size,
        dataVersion
      } = this.props;

      const { containerHeight, containerWidth } = this.state;

      if (responsiveWidth) {
        size[0] = containerWidth;
      }

      if (responsiveHeight) {
        size[1] = containerHeight;
      }

      const dataVersionWithSize = dataVersion + size.toString();

      return (
        <div className="responsive-container">
          <Frame
            {...this.props}
            size={size}
            dataVersion={dataVersion ? dataVersionWithSize : undefined}
          />
          <ReactResizeDetector
            handleWidth={responsiveWidth}
            handleHeight={responsiveHeight}
            onResize={this._onResize}
          />
        </div>
      );
    }
  };

export const ResponsiveXYFrame = createResponsiveFrame(XYFrame);
export const ResponsiveORFrame = createResponsiveFrame(ORFrame);
export const ResponsiveNetworkFrame = createResponsiveFrame(NetworkFrame);
export const ResponsiveSmartFrame = createResponsiveFrame(SmartFrame);
export const ResponsiveMinimapXYFrame = createResponsiveFrame(MinimapXYFrame);
