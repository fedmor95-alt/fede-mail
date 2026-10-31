import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useRouterState } from "@tanstack/react-router";
import { Minus, Square, X, Copy, PanelLeftClose, PanelLeftOpen, PenSquare } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useComposerStore } from "@/stores/composerStore";
import { SearchBar } from "../search/SearchBar";
import appIcon from "@/assets/icon.png";

const isMac = navigator.userAgent.includes("Macintosh");

/** Pages that have nothing to do with the mail list: no search box there. */
const NON_MAIL_ROUTES = ["/settings", "/tasks", "/calendar", "/help", "/attachments"];

/**
 * Window title bar, Outlook/Windows 11 style: it carries the search box, so
 * the app spends one row on chrome instead of two. The empty parts are the
 * drag region; the window buttons sit on the right (native traffic lights on
 * macOS, hence the left padding there).
 */
export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showSearch = !NON_MAIL_ROUTES.some((r) => pathname.startsWith(r));
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openComposer = useComposerStore((s) => s.openComposer);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then(setMaximized);

    // Listen for resize events to track maximize state
    let unlisten: (() => void) | undefined;
    appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized);
    }).then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = () => getCurrentWindow().toggleMaximize();
  const handleClose = () => getCurrentWindow().close();

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) handleMaximize();
      }}
      className="grid grid-cols-[1fr_minmax(0,560px)_1fr] items-center h-11 bg-sidebar-bg border-b border-border-primary select-none shrink-0"
    >
      <div data-tauri-drag-region className={`flex items-center gap-1.5 h-full ${isMac ? "pl-20" : "pl-3"}`}>
        {!isMac && (
          <img src={appIcon} alt="" draggable={false} data-tauri-drag-region className="w-4 h-4 rounded-[3px] mr-1.5" />
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-sidebar-text/70 hover:text-sidebar-text hover:bg-sidebar-hover rounded-md transition-colors"
          title={sidebarCollapsed ? "Mostra barra laterale (Ctrl+Shift+E)" : "Nascondi barra laterale (Ctrl+Shift+E)"}
          aria-label={sidebarCollapsed ? "Mostra barra laterale" : "Nascondi barra laterale"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button
          onClick={() => openComposer()}
          className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-accent hover:bg-accent-hover text-bg-primary text-[13px] font-medium transition-colors"
          title="Scrivi nuova email (Ctrl+N)"
        >
          <PenSquare size={14} />
          Scrivi
        </button>
      </div>

      <div data-tauri-drag-region className="px-2">
        {showSearch && <SearchBar />}
      </div>

      {/* Window controls (macOS uses the native traffic lights) */}
      <div data-tauri-drag-region className="flex items-center justify-end h-full">
        {!isMac && (
          <>
            <button
              onClick={handleMinimize}
              className="h-full w-11 flex items-center justify-center text-sidebar-text/70 hover:bg-sidebar-hover transition-colors"
              title="Riduci a icona"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={handleMaximize}
              className="h-full w-11 flex items-center justify-center text-sidebar-text/70 hover:bg-sidebar-hover transition-colors"
              title={maximized ? "Ripristina" : "Ingrandisci"}
            >
              {maximized ? <Copy size={12} /> : <Square size={12} />}
            </button>
            <button
              onClick={handleClose}
              className="h-full w-11 flex items-center justify-center text-sidebar-text/70 hover:bg-[#c42b1c] hover:text-white transition-colors"
              title="Chiudi"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
