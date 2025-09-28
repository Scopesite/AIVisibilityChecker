// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ⬇️ shadcn/radix tooltip provider
import { TooltipProvider } from "@/components/ui/tooltip"; // adjust path if you don't use '@' alias

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={100} skipDelayDuration={300}>
      <App />
    </TooltipProvider>
  </React.StrictMode>
);
