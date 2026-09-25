import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { Providers } from "./app/providers";
import { router } from "./app/router";
import "./index.css";

// PWA: auto-refresh when a new service worker is deployed.
// `registerType: "autoUpdate"` makes the new SW skipWaiting immediately; this
// handler reloads stale tabs so users never keep running an old cached build
// (which is what kept serving the React #321 code after deploys).
registerSW({
  onNeedReload() {
    window.location.reload();
  },
});

// Mount the BioForo app.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
