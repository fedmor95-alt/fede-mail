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
  const accountMismatch = !!selectedThread && selectedThread.accountId !== activeAccountId;

  // The active account follows the opened thread (unified view, or a search
  // result from another account), so the reader, replies and actions all
  // run against the thread's own account.
  useEffect(() => {
    if (selectedThread && accountMismatch) {
      useAccountStore.setState({ activeAccountId: selectedThread.accountId });
    }
  }, [selectedThread, accountMismatch]);

  if (!selectedThread) {
    return (
      <div className="flex-1 flex flex-col bg-bg-primary glass-panel">
        <EmptyState illustration={ReadingPaneIllustration} title="Velo Fedmor" subtitle="Seleziona un'email da leggere" />
      </div>
    );
  }

  if (accountMismatch) return <div className="flex-1 bg-bg-primary glass-panel" />;

  return (
    <div className="flex-1 bg-bg-primary overflow-hidden glass-panel">
      <ThreadView key={`${selectedThread.accountId}:${selectedThread.id}`} thread={selectedThread} />
    </div>
  );
}
