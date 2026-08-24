import "@fontsource/archivo/latin-700.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PairingGate } from "./PairingGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PairingGate />
  </StrictMode>,
);
