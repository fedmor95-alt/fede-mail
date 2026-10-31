import { useState, useRef, useCallback, useEffect } from "react";
import { runUnifiedSearch } from "@/services/search/unifiedSearch";
import { useAccountStore } from "@/stores/accountStore";
import { useThreadStore } from "@/stores/threadStore";
import { useSmartFolderStore } from "@/stores/smartFolderStore";
import { InputDialog } from "@/components/ui/InputDialog";
import { Search, X, FolderPlus } from "lucide-react";

export function SearchBar() {
  const searchQuery = useThreadStore((s) => s.searchQuery);
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const [showSaveModal, setShowSaveModal] = useState(false);

  // Ctrl+F / "/" from the keyboard shortcuts
  useEffect(() => {
    const focus = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("velo-focus-search", focus);
    return () => window.removeEventListener("velo-focus-search", focus);
  }, []);

  const handleSaveAsSmartFolder = useCallback(() => {
    if (useThreadStore.getState().searchQuery.trim().length < 2) return;
    setShowSaveModal(true);
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      const { setSearch } = useThreadStore.getState();
      setSearch(value, useThreadStore.getState().searchThreadIds);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length < 2) {
        cancelRef.current?.();
        setSearch(value, null);
        useThreadStore.getState().setSearchResults(null, false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        cancelRef.current?.();
        const { accounts, unifiedView, activeAccountId: activeId } = useAccountStore.getState();
        const scope = unifiedView ? accounts.filter((a) => a.provider !== "caldav") : accounts.filter((a) => a.id === activeId);
        useThreadStore.getState().setSearchResults(useThreadStore.getState().searchResults ?? [], true);
        cancelRef.current = runUnifiedSearch(value.trim(), scope, (results, pending) => {
          if (useThreadStore.getState().searchQuery !== value) return;
          useThreadStore.getState().setSearchResults(results, pending);
        });
      }, 300);
    },
    [],
  );

  const handleClear = useCallback(() => {
    cancelRef.current?.();
    useThreadStore.getState().clearSearch();
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      useThreadStore.getState().clearSearch();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Cerca in tutte le caselle (from: to: has:attachment)"
        className="w-full bg-bg-tertiary text-text-primary text-sm pl-8 pr-14 py-1.5 rounded-md border border-border-primary focus:border-accent focus:outline-none placeholder:text-text-tertiary"
      />
      {searchQuery && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery.trim().length >= 2 && (
            <button
              onClick={handleSaveAsSmartFolder}
              className="text-text-tertiary hover:text-accent transition-colors"
              title="Salva come cartella smart"
            >
              <FolderPlus size={14} />
            </button>
          )}
          <button
            onClick={handleClear}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <InputDialog
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSubmit={(values) => {
          useSmartFolderStore.getState().createFolder(values.name!.trim(), useThreadStore.getState().searchQuery.trim(), activeAccountId ?? undefined);
        }}
        title="Salva come cartella smart"
        fields={[
          { key: "name", label: "Nome", defaultValue: searchQuery.trim() },
        ]}
        submitLabel="Salva"
      />
    </div>
  );
}
