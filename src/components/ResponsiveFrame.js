import React from "react";
import PropTypes from "prop-types";
import XYFrame from "./XYFrame";
import ORFrame from "./ORFrame";
import NetworkFrame from "./NetworkFrame";
import SmartFrame from "./SmartFrame";
import MinimapXYFrame from "./MinimapXYFrame";
import elementResizeEvent from "element-resize-event";

const createResponsiveFrame = Frame =>
  class ResponsiveFrame extends React.Component {
    static propTypes = {
      size: PropTypes.array
    };

    static defaultProps = {
      size: [500, 500]
    };

    constructor(props) {
      super(props);

      this.state = {
        containerHeight: props.size[1],
        containerWidth: props.size[0]
      };
    }

    _onResize = (width, height) => {
      this.setState({ containerHeight: height, containerWidth: width });
    };
    componentDidMount() {
      const element = this.node;
      elementResizeEvent(element, () => {
        this.setState({
          containerHeight: element.offsetHeight,
          containerWidth: element.offsetWidth
        });
      });
      this.setState({
        containerHeight: element.offsetHeight,
        containerWidth: element.offsetWidth
      });
    }

    render() {
      const {
        responsiveWidth,
        responsiveHeight,
        size,
        dataVersion
      } = this.props;

      const { containerHeight, containerWidth } = this.state;

      const actualSize = [...size];

      if (responsiveWidth) {
        actualSize[0] = containerWidth;
      }

      if (responsiveHeight) {
        actualSize[1] = containerHeight;
      }

      const dataVersionWithSize = dataVersion + actualSize.toString();

      return (
        <div className="responsive-container" ref={node => (this.node = node)}>
          <Frame
            {...this.props}
            size={actualSize}
            dataVersion={dataVersion ? dataVersionWithSize : undefined}
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
