import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./styles/globals.css";
import { installConsoleToLog } from "./utils/consoleToLog";

installConsoleToLog();
// Interface size from Settings; DB errors (e.g. first run) just keep 100%.
import("./services/uiZoom").then((m) => m.initUiZoom()).catch(() => {});

const params = new URLSearchParams(window.location.search);
const isThreadWindow = params.has("thread") && params.has("account");
const isComposerWindow = params.has("compose");

// Pop-out windows are separate entry points: keep them (and the editor they
// pull in) out of the main window's startup bundle.
const ThreadWindow = lazy(() => import("./ThreadWindow"));
const ComposerWindow = lazy(() => import("./ComposerWindow"));

function Root() {
  if (isThreadWindow) return <Suspense fallback={null}><ThreadWindow /></Suspense>;
  if (isComposerWindow) return <Suspense fallback={null}><ComposerWindow /></Suspense>;
  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
