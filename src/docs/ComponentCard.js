import React from "react";
import { Link } from "react-router-dom";
// import {Card, CardTitle /*, CardActions, CardHeader, CardMedia, CardText*/ } from 'material-ui/Card';
import Button from "material-ui/Button";

const ComponentCard = ({ path, title, selected }) => {
  const labelStyle = {
    textTransform: "normal"
  };

  const style = {
    margin: 10
  };
  return (
    <Link to={`/${path}`}>
      <Button
        raised
        label={title}
        labelStyle={labelStyle}
        style={style}
        primary={selected}
      />
    </Link>
  );
};

export default ComponentCard;
