import React from "react";
import { Link } from "react-router-dom";
import logo from "../../images/main-logo.png";
import "./css/NoPath.css";

const NoPath = () => {
  return (
    <div className="landing-page col-12">
      <main className="main-content col-12">
        <section className="hero col-12">
          <div className="logo-home-div d-flex align-items-center justify-content-evenly col-12">
            <img
              crossOrigin="anonymous"
              src={`${logo}`}
              alt="logo"
              className="logo-home"
            />
          </div>

          <div className="content-home">
            <h1>404 Not Found</h1>
            <h3> Did not find the specified path. </h3>
          </div>
          <Link to={"/"}>
            <button type="button" class="btn btn-primary btn-started col-10">
              Go home
            </button>
          </Link>
        </section>
      </main>
    </div>
  );
};

export default NoPath;
