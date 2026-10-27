export type QuickStepActionType =
  | "archive"
  | "trash"
  | "markRead"
  | "markUnread"
  | "star"
  | "unstar"
  | "pin"
  | "unpin"
  | "applyLabel"
  | "removeLabel"
  | "moveToCategory"
  | "reply"
  | "replyAll"
  | "forward"
  | "snooze"
  | "spam"
  | "notSpam";

export interface QuickStepAction {
  type: QuickStepActionType;
  params?: {
    labelId?: string;
    category?: string;
    snoozeDuration?: number;
    forwardTo?: string;
  };
}

export interface QuickStep {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  shortcut: string | null;
  actions: QuickStepAction[];
  icon: string | null;
  isEnabled: boolean;
  continueOnError: boolean;
  sortOrder: number;
  createdAt: number;
}

export interface QuickStepExecutionResult {
  success: boolean;
  completedActions: number;
  totalActions: number;
  error?: string;
  failedActionIndex?: number;
}

export const ACTION_TYPE_METADATA: {
  type: QuickStepActionType;
  label: string;
  icon: string;
  requiresParams: boolean;
  removesFromView: boolean;
}[] = [
  { type: "archive", label: "Archivia", icon: "Archive", requiresParams: false, removesFromView: true },
  { type: "trash", label: "Sposta nel cestino", icon: "Trash2", requiresParams: false, removesFromView: true },
  { type: "markRead", label: "Segna come letto", icon: "MailOpen", requiresParams: false, removesFromView: false },
  { type: "markUnread", label: "Segna come non letto", icon: "Mail", requiresParams: false, removesFromView: false },
  { type: "star", label: "Aggiungi a Speciali", icon: "Star", requiresParams: false, removesFromView: false },
  { type: "unstar", label: "Rimuovi da Speciali", icon: "Star", requiresParams: false, removesFromView: false },
  { type: "pin", label: "Fissa", icon: "Pin", requiresParams: false, removesFromView: false },
  { type: "unpin", label: "Sblocca", icon: "Pin", requiresParams: false, removesFromView: false },
  { type: "applyLabel", label: "Applica etichetta", icon: "Tag", requiresParams: true, removesFromView: false },
  { type: "removeLabel", label: "Rimuovi etichetta", icon: "Tag", requiresParams: true, removesFromView: false },
  { type: "moveToCategory", label: "Sposta in categoria", icon: "Layers", requiresParams: true, removesFromView: false },
  { type: "reply", label: "Rispondi", icon: "Reply", requiresParams: false, removesFromView: false },
  { type: "replyAll", label: "Rispondi a tutti", icon: "ReplyAll", requiresParams: false, removesFromView: false },
  { type: "forward", label: "Inoltra", icon: "Forward", requiresParams: false, removesFromView: false },
  { type: "snooze", label: "Posticipa", icon: "Clock", requiresParams: true, removesFromView: true },
  { type: "spam", label: "Segnala come indesiderata", icon: "Ban", requiresParams: false, removesFromView: true },
  { type: "notSpam", label: "Non indesiderata", icon: "Ban", requiresParams: false, removesFromView: true },
];
