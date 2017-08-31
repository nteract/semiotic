import React from "react";
import { Link } from "react-router-dom";
// import {Card, CardTitle /*, CardActions, CardHeader, CardMedia, CardText*/ } from 'material-ui/Card';
import RaisedButton from "material-ui/RaisedButton";

const ComponentCard = ({ path, title, selected }) => {
  const labelStyle = {
    textTransform: "normal"
  };

  const style = {
    margin: 10
  };
  return (
    <Link to={`/${path}`}>
      <RaisedButton
        label={title}
        labelStyle={labelStyle}
        style={style}
        primary={selected}
      />
    </Link>
  );
};

export default ComponentCard;
