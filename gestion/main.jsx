import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Guarda el aviso de instalación de Chrome para el botón "Instalar app".
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__promptInstalar = e;
  window.dispatchEvent(new Event("promptinstalar"));
});

// Necesario para que el celu y la compu la ofrezcan como app instalable.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/gestion-sw.js", { scope: "/gestion" }).catch(() => {}));
}

createRoot(document.getElementById("root")).render(<App />);
