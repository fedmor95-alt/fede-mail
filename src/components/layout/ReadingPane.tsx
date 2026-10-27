import { useEffect } from "react";
import { ThreadView } from "../email/ThreadView";
import { useThreadStore } from "@/stores/threadStore";
import { useAccountStore } from "@/stores/accountStore";
import { useSelectedThreadId } from "@/hooks/useRouteNavigation";
import { EmptyState } from "../ui/EmptyState";
import { ReadingPaneIllustration } from "../ui/illustrations";

export function ReadingPane() {
  const selectedThreadId = useSelectedThreadId();
  const selectedThread = useThreadStore((s) => selectedThreadId ? s.threadMap.get(selectedThreadId) ?? null : null);
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const unifiedView = useAccountStore((s) => s.unifiedView);
  const accountMismatch = !!selectedThread && selectedThread.accountId !== activeAccountId;

  // Unified view: the active account follows the opened thread, so the
  // reader, replies and actions all run against the thread's own account.
  useEffect(() => {
    if (unifiedView && selectedThread && accountMismatch) {
      useAccountStore.setState({ activeAccountId: selectedThread.accountId });
    }
  }, [unifiedView, selectedThread, accountMismatch]);

  if (!selectedThread) {
    return (
      <div className="flex-1 flex flex-col bg-bg-primary glass-panel">
        <EmptyState illustration={ReadingPaneIllustration} title="Velo" subtitle="Seleziona un'email da leggere" />
      </div>
    );
  }

  if (accountMismatch) return <div className="flex-1 bg-bg-primary glass-panel" />;

  return (
    <div className="flex-1 bg-bg-primary overflow-hidden glass-panel">
      <ThreadView thread={selectedThread} />
    </div>
  );
}
