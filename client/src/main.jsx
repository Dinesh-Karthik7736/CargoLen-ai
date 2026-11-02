import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <main>
      <p>CargoLens AI</p>
      <h1>Freight paperwork, clearly in hand.</h1>
      <p>
        A workspace for extracting, checking, and approving shipment documents
        with a person in control of every decision.
      </p>
      <p>Day 1 foundation is ready. Shipment review arrives in the next build steps.</p>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
