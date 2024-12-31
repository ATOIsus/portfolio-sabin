import React from "react";
import { Link } from "react-router-dom";
import "./css/LandingPage.css";

const LandingPage = () => {
  return (
    <div className="landing-page">
      <main className="main-content">
        <section className="hero">
          <div className="content-home">
            <h1>Hello</h1>
            <h2>- Sabin</h2>
          </div>

          <Link to={"/projects"}>
            <button type="button" className="btn btn-primary">
              See my Projects
            </button>
          </Link>
        </section>
      </main>
    </div>
  );
};


export default LandingPage;
