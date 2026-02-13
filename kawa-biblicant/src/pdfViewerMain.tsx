import React from "react";
import ReactDOM from "react-dom/client";
import PdfTranslatorApp from "./pdf/PdfTranslatorApp";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("viewer-root")!).render(
  <React.StrictMode>
    <PdfTranslatorApp />
  </React.StrictMode>
);
