import { Route, Routes } from "react-router-dom";
import "./App.css";
import Projects from "./components/projects/Projects";
import NoPath from "./components/common/NoPath";
import LandingPage from "./components/landing/LandingPage";

function App() {
  return (
    <Routes>
      <Route path="*" element={<NoPath />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/nopath" element={<NoPath />} />
      <Route path="/projects" element={<Projects />} />
    </Routes>
  );
}

export default App;
