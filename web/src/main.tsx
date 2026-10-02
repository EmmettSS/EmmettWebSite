
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { initMatomo } from "./lib/matomo";
  import "./styles/index.css";

  // Analytics is opt-in: with no VITE_MATOMO_URL this loads nothing and stores no cookies.
  initMatomo();

  createRoot(document.getElementById("root")!).render(<App />);
  