import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Self-hosted fonts (font-display: swap by default) — replaces external Google Fonts CSS
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";

import { reportWebVitals } from "./lib/web-vitals";

createRoot(document.getElementById("root")!).render(<App />);

// Real User Monitoring — Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
reportWebVitals();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service worker registered:", registration.scope);
      })
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
  });
}
