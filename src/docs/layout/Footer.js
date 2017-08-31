import React from "react";

const Footer = ({ gh }) => {
  const [user, repo] = gh.split("/");
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-xs-8 col-xs-offset-2">
          <footer className="box-row center">
            <hr />
            <p className="social">
              <iframe
                src={`https://ghbtns.com/github-btn.html?user=${user}&repo=${repo}&type=star&count=true`}
                frameBorder="0"
                scrolling="0"
                width="100"
                height="20px"
              />
              <iframe
                src={`https://ghbtns.com/github-btn.html?user=${user}&repo=${repo}&type=fork&count=true`}
                frameBorder="0"
                scrolling="0"
                width="100"
                height="20px"
              />
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Footer;
