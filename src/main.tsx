import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import LoginPage from "./LoginPage";
import "./styles.css";
import "./brand-overrides.css";
import "./login.css";

const isLoginRoute = window.location.pathname === "/login";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      {isLoginRoute ? <LoginPage /> : <App />}
    </BrowserRouter>
  </React.StrictMode>
);
