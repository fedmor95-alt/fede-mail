import { memo, useCallback, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Thread } from "@/stores/threadStore";
import { useThreadStore } from "@/stores/threadStore";
import { useUIStore, type SwipeAction } from "@/stores/uiStore";
import { useSwipeActions, SWIPE_SETTLE_MS, type SwipeDirection } from "@/hooks/useSwipeActions";
import { archiveThread, trashThread, markThreadRead, starThread } from "@/services/emailActions";
import { useActiveLabel } from "@/hooks/useRouteNavigation";
import { formatRelativeDate } from "@/utils/date";
import { PecStatusBadge } from "./PecBadge";
import { Paperclip, Star, Check, Pin, BellRing, VolumeX, Archive, Trash2, Mail, MailOpen, Clock } from "lucide-react";
import type { DragData } from "@/components/dnd/DndProvider";

const CATEGORY_COLORS: Record<string, string> = {
  Updates: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  Promotions: "bg-green-500/15 text-green-600 dark:text-green-400",
  Social: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  Newsletters: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  Updates: "Aggiornamenti",
  Promotions: "Promozioni",
  Social: "Social",
  Newsletters: "Newsletter",
};

const SWIPE_COLORS: Record<Exclude<SwipeAction, "none">, string> = {
  archive: "bg-emerald-600",
  trash: "bg-red-600",
  snooze: "bg-orange-500",
  read: "bg-sky-600",
  star: "bg-yellow-500",
};

function swipeLook(action: Exclude<SwipeAction, "none">, thread: Thread) {
  switch (action) {
    case "archive": return { Icon: Archive, label: "Archivia" };
    case "trash": return { Icon: Trash2, label: "Elimina" };
    case "snooze": return { Icon: Clock, label: "Posticipa" };
    case "read": return thread.isRead ? { Icon: Mail, label: "Non letta" } : { Icon: MailOpen, label: "Letta" };
    case "star": return { Icon: Star, label: thread.isStarred ? "Togli speciale" : "Speciale" };
  }
}

interface ThreadCardProps {
  thread: Thread;
  isSelected: boolean;
  onClick: (thread: Thread) => void;
  onContextMenu?: (e: React.MouseEvent, threadId: string) => void;
  category?: string;
  showCategoryBadge?: boolean;
  hasFollowUp?: boolean;
}

export const ThreadCard = memo(function ThreadCard({ thread, isSelected, onClick, onContextMenu, category, showCategoryBadge, hasFollowUp }: ThreadCardProps) {
  const isMultiSelected = useThreadStore((s) => s.selectedThreadIds.has(thread.id));
  const hasMultiSelect = useThreadStore((s) => s.selectedThreadIds.size > 0);
  const toggleThreadSelection = useThreadStore((s) => s.toggleThreadSelection);
  const selectThreadRange = useThreadStore((s) => s.selectThreadRange);
  const activeLabel = useActiveLabel();
  const emailDensity = useUIStore((s) => s.emailDensity);
  const avatarSize = useUIStore((s) => s.avatarSize);
  const isSpam = thread.labelIds.includes("SPAM");
  const swipeLeftAction = useUIStore((s) => s.swipeLeftAction);
  const swipeRightAction = useUIStore((s) => s.swipeRightAction);

  const actionFor = useCallback((direction: SwipeDirection): SwipeAction => {
    const action = direction === "left" ? swipeLeftAction : swipeRightAction;
    // Deleting from the trash is permanent: leave that to the explicit command
    if (action === "trash" && activeLabel === "trash") return "none";
    return action;
  }, [swipeLeftAction, swipeRightAction, activeLabel]);

  const swipe = useSwipeActions(
    useCallback((d: SwipeDirection) => actionFor(d) !== "none", [actionFor]),
    useCallback((d: SwipeDirection) => actionFor(d) === "archive" || actionFor(d) === "trash", [actionFor]),
    useCallback((d: SwipeDirection) => {
      const { accountId, id } = thread;
      switch (actionFor(d)) {
        case "archive": void archiveThread(accountId, id, []); break;
        case "trash": void trashThread(accountId, id, []); break;
        // The row comes back; it leaves the list once a time is picked
        case "snooze":
          window.dispatchEvent(new CustomEvent("velo-snooze-request", { detail: { accountId, threadIds: [id] } }));
          break;
        case "read": void markThreadRead(accountId, id, [], !thread.isRead); break;
        case "star": void starThread(accountId, id, [], !thread.isStarred); break;
      }
    }, [actionFor, thread]),
  );
  const shownAction = swipe.offset === 0 ? "none" : actionFor(swipe.offset < 0 ? "left" : "right");
  const look = shownAction === "none" ? null : swipeLook(shownAction, thread);

  // Read selectedThreadIds lazily for drag — avoids subscribing all cards to the Set reference
  const dragData: DragData = useMemo(() => ({
    threadIds: hasMultiSelect && isMultiSelected
      ? [...useThreadStore.getState().selectedThreadIds]
      : [thread.id],
    sourceLabel: activeLabel,
  }), [hasMultiSelect, isMultiSelected, thread.id, activeLabel]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `thread-${thread.id}`,
    data: dragData,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      selectThreadRange(thread.id);
    } else if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      toggleThreadSelection(thread.id);
    } else if (hasMultiSelect) {
      toggleThreadSelection(thread.id);
    } else {
      onClick(thread);
    }
  };

  const handleContextMenu = onContextMenu
    ? (e: React.MouseEvent) => onContextMenu(e, thread.id)
    : undefined;
  const initial = (
    thread.fromName?.[0] ??
    thread.fromAddress?.[0] ??
    "?"
  ).toUpperCase();

  // Touch drags are swipes; mouse drags still go to drag-and-drop
  const dragListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") listeners?.onPointerDown?.(e);
    },
  };

  return (
    // select-none and the dragstart guard keep WebView2 from drawing its own
    // (black) drag image of selected text when a click wobbles into a drag
    <div
      ref={swipe.rowRef}
      className="relative overflow-hidden select-none"
      style={{ touchAction: "pan-y" }}
      onDragStart={(e) => e.preventDefault()}
      {...swipe.handlers}
    >
      {shownAction !== "none" && look && (
        <div
          className={`absolute inset-0 flex items-center px-5 text-white text-sm font-medium ${SWIPE_COLORS[shownAction]} ${
            swipe.offset < 0 ? "justify-end" : "justify-start"
          } ${swipe.armed ? "" : "opacity-60"}`}
        >
          <span className={`flex items-center gap-2 transition-transform duration-150 ${swipe.armed ? "scale-110" : ""}`}>
            <look.Icon size={18} />
            {look.label}
          </span>
        </div>
      )}
      <div
        className={swipe.offset !== 0 ? "relative bg-bg-primary" : "relative"}
        style={{
          transform: swipe.offset ? `translateX(${swipe.offset}px)` : undefined,
          transition: swipe.settling ? `transform ${SWIPE_SETTLE_MS}ms ease-out` : undefined,
        }}
      >
        <button
          ref={setNodeRef}
          {...attributes}
          {...dragListeners}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          aria-label={`${thread.isRead ? "" : "Non letta: "}email da ${thread.fromName ?? thread.fromAddress ?? "Sconosciuto"}: ${thread.subject ?? "(Nessun oggetto)"}`}
          aria-selected={isSelected}
          className={`w-full text-left border-b border-border-secondary group hover-lift press-scale ${
            emailDensity === "compact" ? "px-3 py-1.5" : emailDensity === "spacious" ? "px-4 py-4" : "px-4 py-3"
          } ${
            isDragging
              ? "opacity-50"
              : isMultiSelected
                ? "bg-accent/10"
                : isSelected
                  ? "bg-bg-selected"
                  : "hover:bg-bg-hover"
          } ${isSpam ? "bg-red-500/8 dark:bg-red-500/10" : ""}`}
        >
          <div className="flex items-start gap-3">
            {/* Avatar; when hidden, only a dot marks unread or selected threads */}
            {avatarSize === "hidden" ? (
              <span
                className={`w-2 h-2 mt-1.5 -mr-1 rounded-full shrink-0 ${
                  isMultiSelected || !thread.isRead ? "bg-accent" : "bg-transparent"
                }`}
              />
            ) : (
              <div
                className={`rounded-full flex items-center justify-center shrink-0 font-medium text-white ${
                  avatarSize === "small"
                    ? "w-6 h-6 text-[0.6875rem]"
                    : emailDensity === "compact" ? "w-7 h-7 text-xs" : emailDensity === "spacious" ? "w-10 h-10 text-sm" : "w-9 h-9 text-sm"
                } ${
                  isMultiSelected ? "bg-accent" : thread.isRead ? "bg-text-secondary" : "bg-accent"
                }`}
              >
                {isMultiSelected ? <Check size={avatarSize === "small" || emailDensity === "compact" ? 13 : 16} /> : initial}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* First row: sender + date */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm truncate ${
                    thread.isRead
                      ? "text-text-primary/85"
                      : "font-semibold text-text-primary"
                  }`}
                >
                  {thread.fromName ?? thread.fromAddress ?? "Sconosciuto"}
                </span>
                <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">
                  {formatRelativeDate(thread.lastMessageAt)}
                </span>
              </div>

              {/* Subject */}
              <div
                className={`text-sm truncate mt-0.5 ${
                  thread.isRead ? "text-text-primary/85" : "text-text-primary"
                }`}
              >
                {thread.subject ?? "(Nessun oggetto)"}
              </div>

              {/* Snippet + indicators */}
              <div className={`flex items-center gap-1.5 mt-0.5 ${emailDensity === "compact" ? "hidden" : ""}`}>
                <span className="text-xs text-text-secondary truncate flex-1">
                  {thread.snippet}
                </span>
                <PecStatusBadge status={thread.pecStatus} />
                {showCategoryBadge && category && category !== "Primary" && CATEGORY_COLORS[category] && (
                  <span className={`shrink-0 text-[0.625rem] px-1.5 rounded-full leading-normal ${CATEGORY_COLORS[category]}`}>
                    {CATEGORY_LABELS[category] ?? category}
                  </span>
                )}
                {hasFollowUp && (
                  <span className="shrink-0 text-accent" title="Promemoria di sollecito impostato">
                    <BellRing size={12} />
                  </span>
                )}
                {thread.isMuted && (
                  <span className="shrink-0 text-warning" title="Silenziata">
                    <VolumeX size={12} />
                  </span>
                )}
                {thread.isPinned && (
                  <span className="shrink-0 text-accent" title="Fissata">
                    <Pin size={12} className="fill-current" />
                  </span>
                )}
                {thread.hasAttachments && (
                  <span className="shrink-0 text-text-tertiary" title="Con allegati">
                    <Paperclip size={12} />
                  </span>
                )}
                {thread.isStarred && (
                  <span className="shrink-0 text-warning star-animate" title="Contrassegnata">
                    <Star size={12} className="fill-current" />
                  </span>
                )}
                {thread.messageCount > 1 && (
                  <span className="text-xs text-text-tertiary shrink-0 bg-bg-tertiary rounded-full px-1.5">
                    {thread.messageCount}
                  </span>
                )}
              </div>
            </div>
          </div>

        </button>
      </div>
    </div>
  );
});
