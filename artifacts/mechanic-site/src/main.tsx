import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

createRoot(document.getElementById("root")!).render(<App />);

let leadConversionSent = false;

const configureGoogleAdsTracking = () => {
  if (typeof window.gtag !== "function") return;

  window.gtag("config", "AW-607679323/BSvACLmN5OscENvm4aEC", {
    phone_conversion_number: "(832) 930-1444",
  });

  const reportSuccessfulLead = () => {
    if (leadConversionSent) return;
    if (!document.querySelector('[data-testid="link-call-after-request"]')) return;

    leadConversionSent = true;
    window.gtag("event", "conversion", {
      send_to: "AW-607679323/ER_bCLaN5OscENvm4aEC",
    });
  };

  reportSuccessfulLead();
  const observer = new MutationObserver(reportSuccessfulLead);
  observer.observe(document.documentElement, { childList: true, subtree: true });
};

window.requestAnimationFrame(configureGoogleAdsTracking);
