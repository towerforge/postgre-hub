// Punto de entrada: monta la aplicación en #root dentro de StrictMode y carga
// los estilos globales.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
