import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./styles/globals.css";
import { installConsoleToLog } from "./utils/consoleToLog";

installConsoleToLog();

const params = new URLSearchParams(window.location.search);
const isThreadWindow = params.has("thread") && params.has("account");
const isComposerWindow = params.has("compose");

// Pop-out windows are separate entry points: keep them (and the editor they
// pull in) out of the main window's startup bundle.
const ThreadWindow = lazy(() => import("./ThreadWindow"));
const ComposerWindow = lazy(() => import("./ComposerWindow"));

// Pop-out windows apply the interface size themselves; the main window does
// it in App, after the migrations, so nothing touches the DB before them.
if (isThreadWindow || isComposerWindow) {
  import("./services/uiZoom").then((m) => m.initUiZoom()).catch(() => {});
}

// Ctrl+W (Cmd+W on Mac) closes the window it's pressed in, like any other
// app. The main window then goes to the tray, as with its close button.
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "w") {
    e.preventDefault();
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => getCurrentWindow().close())
      .catch(() => {});
  }
});

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
