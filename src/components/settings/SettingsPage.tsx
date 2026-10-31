import { useState, useEffect, useCallback, useRef } from "react";
import { SHOW_PEC_RECEIPTS_SETTING, setShowPecReceipts } from "@/services/pec/pecStatus";
import { useParams } from "@tanstack/react-router";
import { useUIStore } from "@/stores/uiStore";
import { navigateToLabel, navigateToSettings } from "@/router/navigate";
import { useAccountStore } from "@/stores/accountStore";
import { getSetting, setSetting, getSecureSetting, setSecureSetting } from "@/services/db/settings";
import { PROVIDER_MODELS } from "@/services/ai/types";
import { deleteAccount } from "@/services/db/accounts";
import { removeClient, reauthorizeAccount } from "@/services/gmail/tokenManager";
import { triggerSync, forceFullSync, resyncAccount, startBackgroundSync } from "@/services/gmail/syncManager";
import { startPush } from "@/services/push/pushManager";
import {
  registerComposeShortcut,
  getCurrentShortcut,
  DEFAULT_SHORTCUT,
} from "@/services/globalShortcut";
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  PenLine,
  Bell,
  Filter,
  Users,
  UserCircle,
  Keyboard,
  Sparkles,
  Check,
  Mail,
  Info,
  ExternalLink,
  Github,
  Scale,
  Globe,
  Download,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { SignatureEditor } from "./SignatureEditor";
import { TemplateEditor } from "./TemplateEditor";
import { FilterEditor } from "./FilterEditor";
import { LabelEditor } from "./LabelEditor";
import { ContactEditor } from "./ContactEditor";
import { SubscriptionManager } from "./SubscriptionManager";
import { SmartFolderEditor } from "./SmartFolderEditor";
import { QuickStepEditor } from "./QuickStepEditor";
import { SmartLabelEditor } from "./SmartLabelEditor";
import { SHORTCUTS, getDefaultKeyMap, ALT_SUFFIX, formatShortcut } from "@/constants/shortcuts";
import { isMac } from "@/utils/platform";
import { useShortcutStore } from "@/stores/shortcutStore";
import { COLOR_THEMES } from "@/constants/themes";
import {
  getAliasesForAccount,
  setDefaultAlias,
  mapDbAlias,
  type SendAsAlias,
} from "@/services/db/sendAsAliases";
import { ALL_NAV_ITEMS } from "@/components/layout/Sidebar";
import type { SidebarNavItem } from "@/stores/uiStore";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import appIcon from "@/assets/icon.png";
import { UiZoomSelect } from "./UiZoomSelect";

type SettingsTab = "general" | "notifications" | "composing" | "mail-rules" | "people" | "accounts" | "shortcuts" | "ai" | "about";

const tabs: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "Generale", icon: Settings },
  { id: "notifications", label: "Notifiche", icon: Bell },
  { id: "composing", label: "Scrittura", icon: PenLine },
  { id: "mail-rules", label: "Regole posta", icon: Filter },
  { id: "people", label: "Persone", icon: Users },
  { id: "accounts", label: "Account", icon: UserCircle },
  { id: "shortcuts", label: "Scorciatoie", icon: Keyboard },
  { id: "ai", label: "IA", icon: Sparkles },
  { id: "about", label: "Info", icon: Info },
];

const CATEGORY_LABELS: Record<string, string> = {
  Primary: "Principale",
  Updates: "Aggiornamenti",
  Promotions: "Promozioni",
  Social: "Social",
  Newsletters: "Newsletter",
};

export function SettingsPage() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const readingPanePosition = useUIStore((s) => s.readingPanePosition);
  const setReadingPanePosition = useUIStore((s) => s.setReadingPanePosition);
  const emailDensity = useUIStore((s) => s.emailDensity);
  const setEmailDensity = useUIStore((s) => s.setEmailDensity);
  const fontScale = useUIStore((s) => s.fontScale);
  const setFontScale = useUIStore((s) => s.setFontScale);
  const colorTheme = useUIStore((s) => s.colorTheme);
  const setColorTheme = useUIStore((s) => s.setColorTheme);
  const defaultReplyMode = useUIStore((s) => s.defaultReplyMode);
  const setDefaultReplyMode = useUIStore((s) => s.setDefaultReplyMode);
  const markAsReadBehavior = useUIStore((s) => s.markAsReadBehavior);
  const setMarkAsReadBehavior = useUIStore((s) => s.setMarkAsReadBehavior);
  const sendAndArchive = useUIStore((s) => s.sendAndArchive);
  const setSendAndArchive = useUIStore((s) => s.setSendAndArchive);
  const inboxViewMode = useUIStore((s) => s.inboxViewMode);
  const setInboxViewMode = useUIStore((s) => s.setInboxViewMode);
  const reduceMotion = useUIStore((s) => s.reduceMotion);
  const setReduceMotion = useUIStore((s) => s.setReduceMotion);
  const accounts = useAccountStore((s) => s.accounts);
  const removeAccountFromStore = useAccountStore((s) => s.removeAccount);
  const { tab } = useParams({ strict: false }) as { tab?: string };
  const activeTab = (tab && tabs.some((t) => t.id === tab) ? tab : "general") as SettingsTab;
  const setActiveTab = (t: SettingsTab) => navigateToSettings(t);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [undoSendDelay, setUndoSendDelay] = useState("5");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiSettingsSaved, setApiSettingsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPeriodDays, setSyncPeriodDays] = useState("365");
  const [blockRemoteImages, setBlockRemoteImages] = useState(true);
  const [showPecReceipts, setShowPecReceiptsState] = useState(false);
  const [phishingDetectionEnabled, setPhishingDetectionEnabled] = useState(true);
  const [phishingSensitivity, setPhishingSensitivity] = useState<"low" | "default" | "high">("default");
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState<"claude" | "openai" | "gemini" | "ollama" | "copilot">("claude");
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [copilotApiKey, setCopilotApiKey] = useState("");
  const [ollamaServerUrl, setOllamaServerUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [claudeModel, setClaudeModel] = useState("claude-haiku-4-5-20251001");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash-preview-05-20");
  const [copilotModel, setCopilotModel] = useState("openai/gpt-4o-mini");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiAutoCategorize, setAiAutoCategorize] = useState(true);
  const [aiAutoSummarize, setAiAutoSummarize] = useState(true);
  const [aiKeySaved, setAiKeySaved] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<"success" | "fail" | null>(null);
  const [aiAutoDraftEnabled, setAiAutoDraftEnabled] = useState(true);
  const [aiWritingStyleEnabled, setAiWritingStyleEnabled] = useState(true);
  const [styleAnalyzing, setStyleAnalyzing] = useState(false);
  const [styleAnalyzeDone, setStyleAnalyzeDone] = useState(false);
  const [cacheMaxMb, setCacheMaxMb] = useState("500");
  const [cacheSizeMb, setCacheSizeMb] = useState<number | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [reauthStatus, setReauthStatus] = useState<Record<string, "idle" | "authorizing" | "done" | "error">>({});
  const [resyncStatus, setResyncStatus] = useState<Record<string, "idle" | "syncing" | "done" | "error">>({});
  const [autoArchiveCategories, setAutoArchiveCategories] = useState<Set<string>>(() => new Set());
  const [smartNotifications, setSmartNotifications] = useState(true);
  const [notifyCategories, setNotifyCategories] = useState<Set<string>>(() => new Set(["Primary"]));
  const [vipSenders, setVipSenders] = useState<{ email_address: string; display_name: string | null }[]>([]);
  const [newVipEmail, setNewVipEmail] = useState("");

  // Load settings from DB
  useEffect(() => {
    async function load() {
      const notif = await getSetting("notifications_enabled");
      setNotificationsEnabled(notif !== "false");
      const delay = await getSetting("undo_send_delay_seconds");
      setUndoSendDelay(delay ?? "5");
      const id = await getSetting("google_client_id");
      setClientId(id ?? "");
      const secret = await getSecureSetting("google_client_secret");
      setClientSecret(secret ?? "");
      const blockImg = await getSetting("block_remote_images");
      setBlockRemoteImages(blockImg !== "false");
      setShowPecReceiptsState((await getSetting(SHOW_PEC_RECEIPTS_SETTING)) === "true");
      const phishingEnabled = await getSetting("phishing_detection_enabled");
      setPhishingDetectionEnabled(phishingEnabled !== "false");
      const phishingSens = await getSetting("phishing_sensitivity");
      if (phishingSens === "low" || phishingSens === "high") setPhishingSensitivity(phishingSens);
      const syncDays = await getSetting("sync_period_days");
      setSyncPeriodDays(syncDays ?? "365");

      // Load autostart state
      try {
        const { isEnabled } = await import("@tauri-apps/plugin-autostart");
        setAutostartEnabled(await isEnabled());
      } catch {
        // autostart plugin may not be available in dev
      }

      // Load AI settings
      const provider = await getSetting("ai_provider");
      if (provider === "openai" || provider === "gemini" || provider === "ollama" || provider === "copilot") setAiProvider(provider);
      const ollamaUrl = await getSetting("ollama_server_url");
      if (ollamaUrl) setOllamaServerUrl(ollamaUrl);
      const ollamaModelVal = await getSetting("ollama_model");
      if (ollamaModelVal) setOllamaModel(ollamaModelVal);
      const claudeModelVal = await getSetting("claude_model");
      if (claudeModelVal) setClaudeModel(claudeModelVal);
      const openaiModelVal = await getSetting("openai_model");
      if (openaiModelVal) setOpenaiModel(openaiModelVal);
      const geminiModelVal = await getSetting("gemini_model");
      if (geminiModelVal) setGeminiModel(geminiModelVal);
      const aiKey = await getSecureSetting("claude_api_key");
      setClaudeApiKey(aiKey ?? "");
      const oaiKey = await getSecureSetting("openai_api_key");
      setOpenaiApiKey(oaiKey ?? "");
      const gemKey = await getSecureSetting("gemini_api_key");
      setGeminiApiKey(gemKey ?? "");
      const copKey = await getSecureSetting("copilot_api_key");
      setCopilotApiKey(copKey ?? "");
      const copilotModelVal = await getSetting("copilot_model");
      if (copilotModelVal) setCopilotModel(copilotModelVal);
      const aiEn = await getSetting("ai_enabled");
      setAiEnabled(aiEn !== "false");
      const aiCat = await getSetting("ai_auto_categorize");
      setAiAutoCategorize(aiCat !== "false");
      const aiSum = await getSetting("ai_auto_summarize");
      setAiAutoSummarize(aiSum !== "false");
      const aiDraft = await getSetting("ai_auto_draft_enabled");
      setAiAutoDraftEnabled(aiDraft !== "false");
      const aiStyle = await getSetting("ai_writing_style_enabled");
      setAiWritingStyleEnabled(aiStyle !== "false");

      // Load auto-archive categories
      const autoArchive = await getSetting("auto_archive_categories");
      if (autoArchive) {
        setAutoArchiveCategories(new Set(autoArchive.split(",").map((s) => s.trim()).filter(Boolean)));
      }

      // Load smart notification settings
      const smartNotif = await getSetting("smart_notifications");
      setSmartNotifications(smartNotif !== "false");
      const notifCats = await getSetting("notify_categories");
      if (notifCats) {
        setNotifyCategories(new Set(notifCats.split(",").map((s) => s.trim()).filter(Boolean)));
      }
      try {
        const { getAllVipSenders } = await import("@/services/db/notificationVips");
        const activeId = accounts.find((a) => a.isActive)?.id;
        if (activeId) {
          const vips = await getAllVipSenders(activeId);
          setVipSenders(vips.map((v) => ({ email_address: v.email_address, display_name: v.display_name })));
        }
      } catch {
        // VIP table may not exist yet
      }

      // Load cache settings
      const cacheMax = await getSetting("attachment_cache_max_mb");
      setCacheMaxMb(cacheMax ?? "500");
      try {
        const { getCacheSize } = await import("@/services/attachments/cacheManager");
        const size = await getCacheSize();
        setCacheSizeMb(Math.round(size / (1024 * 1024) * 10) / 10);
      } catch {
        // cache manager may not be available
      }
    }
    load();
  }, []);

  const handleNotificationsToggle = useCallback(async () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    await setSetting("notifications_enabled", newVal ? "true" : "false");
  }, [notificationsEnabled]);

  const handleUndoDelayChange = useCallback(async (value: string) => {
    setUndoSendDelay(value);
    await setSetting("undo_send_delay_seconds", value);
  }, []);

  const handleSaveApiSettings = useCallback(async () => {
    const trimmedId = clientId.trim();
    if (trimmedId) {
      await setSetting("google_client_id", trimmedId);
    }
    const trimmedSecret = clientSecret.trim();
    if (trimmedSecret) {
      await setSecureSetting("google_client_secret", trimmedSecret);
    }
    setApiSettingsSaved(true);
    setTimeout(() => setApiSettingsSaved(false), 2000);
  }, [clientId, clientSecret]);

  const handleManualSync = useCallback(async () => {
    const activeIds = accounts.filter((a) => a.isActive).map((a) => a.id);
    if (activeIds.length === 0) return;
    setIsSyncing(true);
    try {
      await triggerSync(activeIds);
    } finally {
      setIsSyncing(false);
    }
  }, [accounts]);

  const handleForceFullSync = useCallback(async () => {
    const activeIds = accounts.filter((a) => a.isActive).map((a) => a.id);
    if (activeIds.length === 0) return;
    setIsSyncing(true);
    try {
      await forceFullSync(activeIds);
    } finally {
      setIsSyncing(false);
    }
  }, [accounts]);

  const handleAutostartToggle = useCallback(async () => {
    try {
      const { enable, disable } = await import("@tauri-apps/plugin-autostart");
      if (autostartEnabled) {
        await disable();
      } else {
        await enable();
      }
      setAutostartEnabled(!autostartEnabled);
    } catch (err) {
      console.error("Failed to toggle autostart:", err);
    }
  }, [autostartEnabled]);

  const handleRemoveAccount = useCallback(
    async (accountId: string) => {
      removeClient(accountId);
      await deleteAccount(accountId);
      removeAccountFromStore(accountId);
      // Restart sync and push without the removed account, otherwise its
      // timer and IDLE watcher keep running against a deleted account.
      const remaining = useAccountStore.getState().accounts.filter((a) => a.isActive);
      startBackgroundSync(remaining.map((a) => a.id), true);
      startPush(remaining.filter((a) => a.provider !== "caldav").map((a) => a.id)).catch((err) =>
        console.warn("[push] restart failed:", err),
      );
    },
    [removeAccountFromStore],
  );

  const handleReauthorizeAccount = useCallback(
    async (accountId: string, email: string) => {
      setReauthStatus((prev) => ({ ...prev, [accountId]: "authorizing" }));
      try {
        await reauthorizeAccount(accountId, email);
        setReauthStatus((prev) => ({ ...prev, [accountId]: "done" }));
        setTimeout(() => {
          setReauthStatus((prev) => ({ ...prev, [accountId]: "idle" }));
        }, 3000);
      } catch (err) {
        console.error("Re-authorization failed:", err);
        setReauthStatus((prev) => ({ ...prev, [accountId]: "error" }));
        setTimeout(() => {
          setReauthStatus((prev) => ({ ...prev, [accountId]: "idle" }));
        }, 3000);
      }
    },
    [],
  );

  const handleResyncAccount = useCallback(
    async (accountId: string) => {
      setResyncStatus((prev) => ({ ...prev, [accountId]: "syncing" }));
      try {
        await resyncAccount(accountId);
        setResyncStatus((prev) => ({ ...prev, [accountId]: "done" }));
        setTimeout(() => {
          setResyncStatus((prev) => ({ ...prev, [accountId]: "idle" }));
        }, 3000);
      } catch (err) {
        console.error("Resync failed:", err);
        setResyncStatus((prev) => ({ ...prev, [accountId]: "error" }));
        setTimeout(() => {
          setResyncStatus((prev) => ({ ...prev, [accountId]: "idle" }));
        }, 3000);
      }
    },
    [],
  );

  const activeTabDef = tabs.find((t) => t.id === activeTab);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border-primary shrink-0 bg-bg-primary backdrop-blur-sm">
        <button
          onClick={() => navigateToLabel("inbox")}
          className="p-1.5 -ml-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Torna alla Posta in arrivo"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold text-text-primary">Impostazioni</h1>
      </div>

      {/* Body: sidebar nav + content */}
      <div className="flex flex-1 min-h-0">
        {/* Vertical tab sidebar */}
        <nav className="w-48 border-r border-border-primary py-2 overflow-y-auto shrink-0 bg-bg-primary">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 w-full px-4 py-2 text-[0.8125rem] transition-colors ${
                  isActive
                    ? "bg-bg-selected text-accent font-medium"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl px-8 py-6">
            {/* Tab title */}
            {activeTabDef && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-primary">
                  {activeTabDef.label}
                </h2>
              </div>
            )}

            <div className="space-y-8">
              {activeTab === "general" && (
                <>
                  <Section title="Aspetto">
                    <SettingRow label="Tema">
                      <select
                        value={theme}
                        onChange={(e) => {
                          const val = e.target.value as "light" | "dark" | "system";
                          setTheme(val);
                          setSetting("theme", val);
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="system">Sistema</option>
                        <option value="light">Chiaro</option>
                        <option value="dark">Scuro</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Pannello di lettura">
                      <select
                        value={readingPanePosition}
                        onChange={(e) => {
                          setReadingPanePosition(e.target.value as "right" | "bottom" | "hidden");
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="right">Destra</option>
                        <option value="bottom">In basso</option>
                        <option value="hidden">Nascosto</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Densità email">
                      <select
                        value={emailDensity}
                        onChange={(e) => {
                          setEmailDensity(e.target.value as "compact" | "default" | "spacious");
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="compact">Compatta</option>
                        <option value="default">Predefinita</option>
                        <option value="spacious">Ampia</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Dimensione interfaccia">
                      <UiZoomSelect />
                    </SettingRow>
                    <SettingRow label="Dimensione carattere">
                      <select
                        value={fontScale}
                        onChange={(e) => {
                          setFontScale(e.target.value as "small" | "default" | "large" | "xlarge");
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="small">Piccola</option>
                        <option value="default">Predefinita</option>
                        <option value="large">Grande</option>
                        <option value="xlarge">Molto grande</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Colore principale">
                      <div className="flex items-center gap-2">
                        {COLOR_THEMES.map((t) => {
                          const isSelected = colorTheme === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setColorTheme(t.id)}
                              title={t.name}
                              className={`relative w-7 h-7 rounded-full transition-all ${
                                isSelected
                                  ? "ring-2 ring-offset-2 ring-offset-bg-primary scale-110"
                                  : "hover:scale-105"
                              }`}
                              style={{
                                backgroundColor: t.swatch,
                                boxShadow: isSelected
                                  ? `0 0 0 2px var(--color-bg-primary), 0 0 0 4px ${t.swatch}`
                                  : undefined,
                              }}
                            >
                              {isSelected && (
                                <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow-sm" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </SettingRow>
                    <SettingRow label="Modalità di visualizzazione Posta in arrivo">
                      <select
                        value={inboxViewMode}
                        onChange={(e) => {
                          setInboxViewMode(e.target.value as "unified" | "split");
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="unified">Unificata</option>
                        <option value="split">Divisa (categorie)</option>
                      </select>
                    </SettingRow>
                    <ToggleRow
                      label="Riduci animazioni"
                      description="Disattiva gli effetti animati dello sfondo (risolve lo sfarfallio su alcune GPU)"
                      checked={reduceMotion}
                      onToggle={() => setReduceMotion(!reduceMotion)}
                    />
                  </Section>

                  <SidebarNavEditor />

                  <Section title="Avvio">
                    <ToggleRow
                      label="Apri all'accesso"
                      description="Avvia Velo Fedmor automaticamente quando accedi (ridotto a icona nell'area di notifica)"
                      checked={autostartEnabled}
                      onToggle={handleAutostartToggle}
                    />
                  </Section>

                  <Section title="Privacy e sicurezza">
                    <ToggleRow
                      label="Blocca immagini remote"
                      description="Nasconde i pixel di tracciamento e le immagini remote finché non scegli di caricarli"
                      checked={blockRemoteImages}
                      onToggle={async () => {
                        const newVal = !blockRemoteImages;
                        setBlockRemoteImages(newVal);
                        await setSetting("block_remote_images", newVal ? "true" : "false");
                      }}
                    />
                    <ToggleRow
                      label="Mostra ricevute PEC in Posta in arrivo"
                      description="Le ricevute di accettazione e consegna restano comunque nella conversazione del messaggio inviato"
                      checked={showPecReceipts}
                      onToggle={async () => {
                        const newVal = !showPecReceipts;
                        setShowPecReceiptsState(newVal);
                        await setShowPecReceipts(newVal);
                      }}
                    />
                    <ToggleRow
                      label="Rilevamento link di phishing"
                      description="Analizza i link dei messaggi alla ricerca di segnali di phishing e mostra degli avvisi"
                      checked={phishingDetectionEnabled}
                      onToggle={async () => {
                        const newVal = !phishingDetectionEnabled;
                        setPhishingDetectionEnabled(newVal);
                        await setSetting("phishing_detection_enabled", newVal ? "true" : "false");
                      }}
                    />
                    {phishingDetectionEnabled && (
                      <SettingRow label="Sensibilità del rilevamento">
                        <select
                          value={phishingSensitivity}
                          onChange={async (e) => {
                            const val = e.target.value as "low" | "default" | "high";
                            setPhishingSensitivity(val);
                            await setSetting("phishing_sensitivity", val);
                          }}
                          className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                        >
                          <option value="low">Bassa (meno avvisi)</option>
                          <option value="default">Predefinita</option>
                          <option value="high">Alta (più avvisi)</option>
                        </select>
                      </SettingRow>
                    )}
                  </Section>

                  <Section title="Archiviazione">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-text-secondary">Cache degli allegati</span>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {cacheSizeMb !== null ? `${cacheSizeMb} MB utilizzati` : "Calcolo in corso..."}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          setClearingCache(true);
                          try {
                            const { clearAllCache } = await import("@/services/attachments/cacheManager");
                            await clearAllCache();
                            setCacheSizeMb(0);
                          } catch (err) {
                            console.error("Failed to clear cache:", err);
                          } finally {
                            setClearingCache(false);
                          }
                        }}
                        disabled={clearingCache}
                        className="bg-bg-tertiary text-text-primary border border-border-primary"
                      >
                        {clearingCache ? "Svuotamento..." : "Svuota cache"}
                      </Button>
                    </div>
                    <SettingRow label="Dimensione massima della cache">
                      <select
                        value={cacheMaxMb}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setCacheMaxMb(val);
                          await setSetting("attachment_cache_max_mb", val);
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="100">100 MB</option>
                        <option value="250">250 MB</option>
                        <option value="500">500 MB</option>
                        <option value="1000">1 GB</option>
                        <option value="2000">2 GB</option>
                      </select>
                    </SettingRow>
                  </Section>
                </>
              )}

              {activeTab === "notifications" && (
                <>
                  <Section title="Notifiche">
                    <ToggleRow
                      label="Attiva notifiche"
                      checked={notificationsEnabled}
                      onToggle={handleNotificationsToggle}
                    />
                    <ToggleRow
                      label="Notifiche intelligenti"
                      description="Notifica solo per le categorie selezionate e i mittenti VIP"
                      checked={smartNotifications}
                      onToggle={async () => {
                        const newVal = !smartNotifications;
                        setSmartNotifications(newVal);
                        await setSetting("smart_notifications", newVal ? "true" : "false");
                      }}
                    />
                  </Section>

                  {smartNotifications && (
                    <>
                      <Section title="Filtri per categoria">
                        <div>
                          <span className="text-sm text-text-secondary">Notifica per le categorie</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(["Primary", "Updates", "Promotions", "Social", "Newsletters"] as const).map((cat) => (
                              <button
                                key={cat}
                                onClick={async () => {
                                  const next = new Set(notifyCategories);
                                  if (next.has(cat)) next.delete(cat);
                                  else next.add(cat);
                                  setNotifyCategories(next);
                                  await setSetting("notify_categories", [...next].join(","));
                                }}
                                className={`px-2.5 py-1 text-xs rounded-full transition-colors border ${
                                  notifyCategories.has(cat)
                                    ? "bg-accent/15 text-accent border-accent/30"
                                    : "bg-bg-tertiary text-text-tertiary border-border-primary hover:text-text-primary"
                                }`}
                              >
                                {CATEGORY_LABELS[cat] ?? cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      </Section>

                      <Section title="Mittenti VIP">
                        <p className="text-xs text-text-tertiary mb-2">
                          Questi mittenti generano sempre una notifica, a prescindere dalla categoria
                        </p>
                        <div className="space-y-1.5">
                          {vipSenders.map((vip) => (
                            <div key={vip.email_address} className="flex items-center justify-between py-1.5 px-3 bg-bg-secondary rounded-md">
                              <span className="text-xs text-text-primary truncate">
                                {vip.display_name ? `${vip.display_name} (${vip.email_address})` : vip.email_address}
                              </span>
                              <button
                                onClick={async () => {
                                  const activeId = accounts.find((a) => a.isActive)?.id;
                                  if (!activeId) return;
                                  const { removeVipSender } = await import("@/services/db/notificationVips");
                                  await removeVipSender(activeId, vip.email_address);
                                  setVipSenders((prev) => prev.filter((v) => v.email_address !== vip.email_address));
                                }}
                                className="text-xs text-danger hover:text-danger/80 ml-2 shrink-0"
                              >
                                Rimuovi
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <input
                            type="email"
                            value={newVipEmail}
                            onChange={(e) => setNewVipEmail(e.target.value)}
                            placeholder="email@esempio.com"
                            className="flex-1 px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded-md text-xs text-text-primary outline-none focus:border-accent"
                            onKeyDown={async (e) => {
                              if (e.key !== "Enter" || !newVipEmail.trim()) return;
                              const activeId = accounts.find((a) => a.isActive)?.id;
                              if (!activeId) return;
                              const { addVipSender } = await import("@/services/db/notificationVips");
                              await addVipSender(activeId, newVipEmail.trim());
                              setVipSenders((prev) => [...prev, { email_address: newVipEmail.trim().toLowerCase(), display_name: null }]);
                              setNewVipEmail("");
                            }}
                          />
                          <Button
                            variant="primary"
                            onClick={async () => {
                              if (!newVipEmail.trim()) return;
                              const activeId = accounts.find((a) => a.isActive)?.id;
                              if (!activeId) return;
                              const { addVipSender } = await import("@/services/db/notificationVips");
                              await addVipSender(activeId, newVipEmail.trim());
                              setVipSenders((prev) => [...prev, { email_address: newVipEmail.trim().toLowerCase(), display_name: null }]);
                              setNewVipEmail("");
                            }}
                            disabled={!newVipEmail.trim()}
                          >
                            Aggiungi
                          </Button>
                        </div>
                      </Section>
                    </>
                  )}
                </>
              )}

              {activeTab === "composing" && (
                <>
                  <Section title="Invio">
                    <SettingRow label="Ritardo per annullare l'invio">
                      <select
                        value={undoSendDelay}
                        onChange={(e) => handleUndoDelayChange(e.target.value)}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="5">5 secondi</option>
                        <option value="10">10 secondi</option>
                        <option value="30">30 secondi</option>
                      </select>
                    </SettingRow>
                    <ToggleRow
                      label="Invia e archivia"
                      description="Archivia automaticamente le conversazioni dopo aver inviato una risposta"
                      checked={sendAndArchive}
                      onToggle={() => setSendAndArchive(!sendAndArchive)}
                    />
                  </Section>

                  <Section title="Comportamento">
                    <SettingRow label="Azione di risposta predefinita">
                      <select
                        value={defaultReplyMode}
                        onChange={(e) => {
                          setDefaultReplyMode(e.target.value as "reply" | "replyAll");
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="reply">Rispondi</option>
                        <option value="replyAll">Rispondi a tutti</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Segna come letto">
                      <select
                        value={markAsReadBehavior}
                        onChange={(e) => {
                          setMarkAsReadBehavior(e.target.value as "instant" | "2s" | "manual");
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="instant">Subito</option>
                        <option value="2s">Dopo 2 secondi</option>
                        <option value="manual">Manualmente</option>
                      </select>
                    </SettingRow>
                  </Section>

                  <Section title="Firme">
                    <SignatureEditor />
                  </Section>

                  <Section title="Modelli">
                    <TemplateEditor />
                  </Section>
                </>
              )}

              {activeTab === "mail-rules" && (
                <>
                  <Section title="Etichette">
                    <p className="text-xs text-text-tertiary mb-3">
                      Crea, rinomina, cambia colore, elimina o riordina le tue etichette Gmail.
                    </p>
                    <LabelEditor />
                  </Section>

                  <Section title="Filtri">
                    <p className="text-xs text-text-tertiary mb-3">
                      I filtri applicano automaticamente delle azioni alle nuove email in arrivo durante la sincronizzazione.
                    </p>
                    <FilterEditor />
                  </Section>

                  <Section title="Etichette smart">
                    <p className="text-xs text-text-tertiary mb-3">
                      Descrivi con parole tue quali email devono ricevere un'etichetta. L'IA etichetta automaticamente le email corrispondenti durante la sincronizzazione.
                    </p>
                    <SmartLabelEditor />
                  </Section>

                  <Section title="Cartelle smart">
                    <p className="text-xs text-text-tertiary mb-3">
                      Le cartelle smart sono ricerche salvate che mostrano automaticamente le email corrispondenti. Usa operatori di ricerca come <code className="bg-bg-tertiary px-1 rounded">is:unread</code>, <code className="bg-bg-tertiary px-1 rounded">from:</code>, <code className="bg-bg-tertiary px-1 rounded">has:attachment</code>, <code className="bg-bg-tertiary px-1 rounded">after:</code>.
                    </p>
                    <SmartFolderEditor />
                  </Section>

                  <Section title="Passaggi rapidi">
                    <p className="text-xs text-text-tertiary mb-3">
                      I passaggi rapidi permettono di concatenare più azioni in un solo clic.
                      Applicali dal menu contestuale (clic destro) di qualsiasi conversazione.
                    </p>
                    <QuickStepEditor />
                  </Section>
                </>
              )}

              {activeTab === "people" && (
                <>
                  <Section title="Contatti">
                    <p className="text-xs text-text-tertiary mb-3">
                      I contatti vengono aggiunti automaticamente quando invii o ricevi email. Modifica i nomi visualizzati o rimuovi i contatti qui sotto.
                    </p>
                    <ContactEditor />
                  </Section>

                  <Section title="Iscrizioni">
                    <p className="text-xs text-text-tertiary mb-3">
                      Visualizza tutti i mittenti di newsletter e promozioni rilevati. Annulla l'iscrizione con POST a un clic (RFC 8058), mailto o, in alternativa, dal browser.
                    </p>
                    <SubscriptionManager />
                  </Section>
                </>
              )}

              {activeTab === "accounts" && (
                <>
                  <Section title="Account di posta">
                    {accounts.filter((a) => a.provider !== "caldav").length === 0 ? (
                      <p className="text-sm text-text-tertiary">
                        Nessun account di posta collegato
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {accounts.filter((a) => a.provider !== "caldav").map((account) => {
                          const providerLabel = account.provider === "imap" ? "IMAP" : "Gmail";
                          return (
                            <div
                              key={account.id}
                              className="flex items-center justify-between py-2.5 px-4 bg-bg-secondary rounded-lg"
                            >
                              <div>
                                <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                                  {account.displayName ?? account.email}
                                  <span className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-tertiary">
                                    {providerLabel}
                                  </span>
                                </div>
                                <div className="text-xs text-text-tertiary">
                                  {account.email}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleReauthorizeAccount(account.id, account.email)}
                                  disabled={reauthStatus[account.id] === "authorizing"}
                                  className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                                >
                                  {reauthStatus[account.id] === "authorizing" && "In attesa..."}
                                  {reauthStatus[account.id] === "done" && "Fatto!"}
                                  {reauthStatus[account.id] === "error" && "Non riuscito"}
                                  {(!reauthStatus[account.id] || reauthStatus[account.id] === "idle") && "Riautorizza"}
                                </button>
                                <button
                                  onClick={() => handleResyncAccount(account.id)}
                                  disabled={resyncStatus[account.id] === "syncing"}
                                  className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                                >
                                  {resyncStatus[account.id] === "syncing" && "Risincronizzazione..."}
                                  {resyncStatus[account.id] === "done" && "Fatto!"}
                                  {resyncStatus[account.id] === "error" && "Non riuscito"}
                                  {(!resyncStatus[account.id] || resyncStatus[account.id] === "idle") && "Risincronizza"}
                                </button>
                                <button
                                  onClick={() => handleRemoveAccount(account.id)}
                                  className="text-xs text-danger hover:text-danger/80 transition-colors"
                                >
                                  Rimuovi
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Section>

                  {accounts.some((a) => a.provider === "caldav") && (
                    <Section title="Account calendario">
                      <div className="space-y-2">
                        {accounts.filter((a) => a.provider === "caldav").map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between py-2.5 px-4 bg-bg-secondary rounded-lg"
                          >
                            <div>
                              <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                                {account.displayName ?? account.email}
                                <span className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                                  CalDAV
                                </span>
                              </div>
                              <div className="text-xs text-text-tertiary">
                                {account.email}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveAccount(account.id)}
                              className="text-xs text-danger hover:text-danger/80 transition-colors"
                            >
                              Rimuovi
                            </button>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  <SendAsAliasesSection />

                  <ImapCalDavSection />

                  <Section title="Google API">
                    <div className="space-y-3">
                      <TextField
                        label="Client ID"
                        size="md"
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Client ID OAuth di Google"
                      />
                      <TextField
                        label="Client Secret"
                        size="md"
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="Client Secret OAuth di Google"
                      />
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleSaveApiSettings}
                        disabled={!clientId.trim()}
                      >
                        {apiSettingsSaved ? "Salvato!" : "Salva"}
                      </Button>
                    </div>
                  </Section>

                  <Section title="Sincronizzazione">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        Controlla nuova posta
                      </span>
                      <Button
                        variant="primary"
                        size="md"
                        icon={<RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />}
                        onClick={handleManualSync}
                        disabled={isSyncing || accounts.length === 0}
                      >
                        {isSyncing ? "Sincronizzazione..." : "Sincronizza ora"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-text-secondary">
                          Sincronizzazione completa
                        </span>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          Riscarica tutte le email da zero
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="md"
                        icon={<RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />}
                        onClick={handleForceFullSync}
                        disabled={isSyncing || accounts.length === 0}
                        className="bg-bg-tertiary text-text-primary border border-border-primary"
                      >
                        {isSyncing ? "Sincronizzazione..." : "Sincronizzazione completa"}
                      </Button>
                    </div>
                  </Section>

                  <Section title="Periodo di sincronizzazione">
                    <SettingRow label="Sincronizza le email di">
                      <select
                        value={syncPeriodDays}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setSyncPeriodDays(val);
                          await setSetting("sync_period_days", val);
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="30">Ultimi 30 giorni</option>
                        <option value="90">Ultimi 90 giorni</option>
                        <option value="180">Ultimi 180 giorni</option>
                        <option value="365">Ultimo anno</option>
                      </select>
                    </SettingRow>
                    <p className="text-xs text-text-tertiary">
                      Le modifiche si applicano alla prossima sincronizzazione completa.
                    </p>
                  </Section>

                  <SyncOfflineSection />
                </>
              )}

              {activeTab === "shortcuts" && (
                <ShortcutsTab />
              )}

              {activeTab === "ai" && (
                <>
                  <Section title="Provider">
                    <p className="text-xs text-text-tertiary mb-3">
                      Scegli quale provider IA usare per i riassunti, l'assistenza alla scrittura e la categorizzazione intelligente.
                    </p>
                    <SettingRow label="Provider IA">
                      <select
                        value={aiProvider}
                        onChange={async (e) => {
                          const val = e.target.value as "claude" | "openai" | "gemini" | "ollama" | "copilot";
                          setAiProvider(val);
                          setAiTestResult(null);
                          await setSetting("ai_provider", val);
                          const { clearProviderClients } = await import("@/services/ai/providerManager");
                          clearProviderClients();
                        }}
                        className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                      >
                        <option value="claude">Claude (Anthropic)</option>
                        <option value="openai">OpenAI</option>
                        <option value="gemini">Gemini (Google)</option>
                        <option value="ollama">IA locale (Ollama / LMStudio)</option>
                        <option value="copilot">GitHub Copilot</option>
                      </select>
                    </SettingRow>
                    <p className="text-xs text-text-tertiary">
                      {aiProvider === "claude" && `Usa ${PROVIDER_MODELS.claude.find((m) => m.id === claudeModel)?.label ?? claudeModel}.`}
                      {aiProvider === "openai" && `Usa ${PROVIDER_MODELS.openai.find((m) => m.id === openaiModel)?.label ?? openaiModel}.`}
                      {aiProvider === "gemini" && `Usa ${PROVIDER_MODELS.gemini.find((m) => m.id === geminiModel)?.label ?? geminiModel}.`}
                      {aiProvider === "ollama" && "Collegati a un server Ollama o LMStudio locale. Nessuna chiave API richiesta."}
                      {aiProvider === "copilot" && `Usa ${PROVIDER_MODELS.copilot.find((m) => m.id === copilotModel)?.label ?? copilotModel}. Richiede un PAT GitHub con il permesso models:read.`}
                    </p>
                  </Section>

                  {aiProvider === "ollama" ? (
                    <Section title="Server locale">
                      <div className="space-y-3">
                        <TextField
                          label="URL del server"
                          size="md"
                          value={ollamaServerUrl}
                          onChange={(e) => setOllamaServerUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                        />
                        <TextField
                          label="Nome del modello"
                          size="md"
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          placeholder="llama3.2"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="md"
                            onClick={async () => {
                              await setSetting("ollama_server_url", ollamaServerUrl.trim());
                              await setSetting("ollama_model", ollamaModel.trim());
                              const { clearProviderClients } = await import("@/services/ai/providerManager");
                              clearProviderClients();
                              setAiKeySaved(true);
                              setTimeout(() => setAiKeySaved(false), 2000);
                            }}
                            disabled={!ollamaServerUrl.trim() || !ollamaModel.trim()}
                          >
                            {aiKeySaved ? "Salvato!" : "Salva"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={async () => {
                              setAiTesting(true);
                              setAiTestResult(null);
                              try {
                                const { testConnection } = await import("@/services/ai/aiService");
                                const ok = await testConnection();
                                setAiTestResult(ok ? "success" : "fail");
                              } catch {
                                setAiTestResult("fail");
                              } finally {
                                setAiTesting(false);
                              }
                            }}
                            disabled={!ollamaServerUrl.trim() || !ollamaModel.trim() || aiTesting}
                            className="bg-bg-tertiary text-text-primary border border-border-primary"
                          >
                            {aiTesting ? "Verifica in corso..." : "Verifica connessione"}
                          </Button>
                          {aiTestResult === "success" && (
                            <span className="text-xs text-success">Connesso!</span>
                          )}
                          {aiTestResult === "fail" && (
                            <span className="text-xs text-danger">Connessione non riuscita</span>
                          )}
                        </div>
                      </div>
                    </Section>
                  ) : (
                    <Section title="Chiave API">
                      <div className="space-y-3">
                        <TextField
                          label={
                            aiProvider === "claude" ? "Chiave API Anthropic"
                            : aiProvider === "openai" ? "Chiave API OpenAI"
                            : aiProvider === "copilot" ? "Token di accesso personale GitHub"
                            : "Chiave API Google AI"
                          }
                          size="md"
                          type="password"
                          value={
                            aiProvider === "claude" ? claudeApiKey
                            : aiProvider === "openai" ? openaiApiKey
                            : aiProvider === "copilot" ? copilotApiKey
                            : geminiApiKey
                          }
                          onChange={(e) => {
                            if (aiProvider === "claude") setClaudeApiKey(e.target.value);
                            else if (aiProvider === "openai") setOpenaiApiKey(e.target.value);
                            else if (aiProvider === "copilot") setCopilotApiKey(e.target.value);
                            else setGeminiApiKey(e.target.value);
                          }}
                          placeholder={
                            aiProvider === "claude" ? "sk-ant-..."
                            : aiProvider === "openai" ? "sk-..."
                            : aiProvider === "copilot" ? "ghp_..."
                            : "AI..."
                          }
                        />
                        <SettingRow label="Modello">
                          <select
                            value={
                              aiProvider === "claude" ? claudeModel
                              : aiProvider === "openai" ? openaiModel
                              : aiProvider === "copilot" ? copilotModel
                              : geminiModel
                            }
                            onChange={async (e) => {
                              const val = e.target.value;
                              const modelSettingMap = {
                                claude: "claude_model",
                                openai: "openai_model",
                                gemini: "gemini_model",
                                copilot: "copilot_model",
                              } as const;
                              if (aiProvider === "claude") setClaudeModel(val);
                              else if (aiProvider === "openai") setOpenaiModel(val);
                              else if (aiProvider === "copilot") setCopilotModel(val);
                              else setGeminiModel(val);
                              await setSetting(modelSettingMap[aiProvider], val);
                              const { clearProviderClients } = await import("@/services/ai/providerManager");
                              clearProviderClients();
                            }}
                            className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
                          >
                            {PROVIDER_MODELS[aiProvider].map((m) => (
                              <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                          </select>
                        </SettingRow>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="md"
                            onClick={async () => {
                              const keySettingMap = {
                                claude: "claude_api_key",
                                openai: "openai_api_key",
                                gemini: "gemini_api_key",
                                copilot: "copilot_api_key",
                              } as const;
                              const keyValue =
                                aiProvider === "claude" ? claudeApiKey.trim()
                                : aiProvider === "openai" ? openaiApiKey.trim()
                                : aiProvider === "copilot" ? copilotApiKey.trim()
                                : geminiApiKey.trim();
                              if (keyValue) {
                                await setSecureSetting(keySettingMap[aiProvider], keyValue);
                                const { clearProviderClients } = await import("@/services/ai/providerManager");
                                clearProviderClients();
                              }
                              setAiKeySaved(true);
                              setTimeout(() => setAiKeySaved(false), 2000);
                            }}
                            disabled={
                              !(aiProvider === "claude" ? claudeApiKey.trim()
                              : aiProvider === "openai" ? openaiApiKey.trim()
                              : aiProvider === "copilot" ? copilotApiKey.trim()
                              : geminiApiKey.trim())
                            }
                          >
                            {aiKeySaved ? "Salvata!" : "Salva chiave"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={async () => {
                              setAiTesting(true);
                              setAiTestResult(null);
                              try {
                                const { testConnection } = await import("@/services/ai/aiService");
                                const ok = await testConnection();
                                setAiTestResult(ok ? "success" : "fail");
                              } catch {
                                setAiTestResult("fail");
                              } finally {
                                setAiTesting(false);
                              }
                            }}
                            disabled={
                              !(aiProvider === "claude" ? claudeApiKey.trim()
                              : aiProvider === "openai" ? openaiApiKey.trim()
                              : aiProvider === "copilot" ? copilotApiKey.trim()
                              : geminiApiKey.trim()) || aiTesting
                            }
                            className="bg-bg-tertiary text-text-primary border border-border-primary"
                          >
                            {aiTesting ? "Verifica in corso..." : "Verifica connessione"}
                          </Button>
                          {aiTestResult === "success" && (
                            <span className="text-xs text-success">Connesso!</span>
                          )}
                          {aiTestResult === "fail" && (
                            <span className="text-xs text-danger">Connessione non riuscita</span>
                          )}
                        </div>
                      </div>
                    </Section>
                  )}

                  <Section title="Funzionalità">
                    <ToggleRow
                      label="Attiva funzioni IA"
                      description="Interruttore generale per tutte le funzioni IA"
                      checked={aiEnabled}
                      onToggle={async () => {
                        const newVal = !aiEnabled;
                        setAiEnabled(newVal);
                        await setSetting("ai_enabled", newVal ? "true" : "false");
                      }}
                    />
                    <ToggleRow
                      label="Categorizza automaticamente la posta in arrivo"
                      description="Usa l'IA per affinare la categorizzazione basata su regole"
                      checked={aiAutoCategorize}
                      onToggle={async () => {
                        const newVal = !aiAutoCategorize;
                        setAiAutoCategorize(newVal);
                        await setSetting("ai_auto_categorize", newVal ? "true" : "false");
                      }}
                    />
                    <ToggleRow
                      label="Riassumi automaticamente le conversazioni"
                      description="Mostra i riassunti IA nelle conversazioni con più messaggi"
                      checked={aiAutoSummarize}
                      onToggle={async () => {
                        const newVal = !aiAutoSummarize;
                        setAiAutoSummarize(newVal);
                        await setSetting("ai_auto_summarize", newVal ? "true" : "false");
                      }}
                    />
                  </Section>

                  <Section title="Bozze di risposta automatiche">
                    <ToggleRow
                      label="Bozze di risposta automatiche"
                      description="Precompila l'editor di risposta con una bozza generata dall'IA"
                      checked={aiAutoDraftEnabled}
                      onToggle={async () => {
                        const newVal = !aiAutoDraftEnabled;
                        setAiAutoDraftEnabled(newVal);
                        await setSetting("ai_auto_draft_enabled", newVal ? "true" : "false");
                      }}
                    />
                    <ToggleRow
                      label="Impara lo stile di scrittura"
                      description="Analizza le email inviate per adattarsi al tuo tono e al tuo stile"
                      checked={aiWritingStyleEnabled}
                      onToggle={async () => {
                        const newVal = !aiWritingStyleEnabled;
                        setAiWritingStyleEnabled(newVal);
                        await setSetting("ai_writing_style_enabled", newVal ? "true" : "false");
                      }}
                    />
                    {aiWritingStyleEnabled && (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-text-secondary">Profilo dello stile di scrittura</span>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            Rianalizza il tuo stile di scrittura dalle email inviate di recente
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={async () => {
                            setStyleAnalyzing(true);
                            setStyleAnalyzeDone(false);
                            try {
                              const activeId = accounts.find((a) => a.isActive)?.id;
                              if (activeId) {
                                const { refreshWritingStyle } = await import("@/services/ai/writingStyleService");
                                await refreshWritingStyle(activeId);
                                setStyleAnalyzeDone(true);
                                setTimeout(() => setStyleAnalyzeDone(false), 3000);
                              }
                            } catch (err) {
                              console.error("Style analysis failed:", err);
                            } finally {
                              setStyleAnalyzing(false);
                            }
                          }}
                          disabled={styleAnalyzing}
                          className="bg-bg-tertiary text-text-primary border border-border-primary"
                        >
                          {styleAnalyzing ? "Analisi in corso..." : styleAnalyzeDone ? "Fatto!" : "Rianalizza"}
                        </Button>
                      </div>
                    )}
                  </Section>

                  <Section title="Categorie">
                    <p className="text-xs text-text-tertiary mb-1">
                      Le email in arrivo vengono ordinate automaticamente con regole euristiche (etichette Gmail, dominio del mittente, intestazioni). Quando l'IA è attiva, affina i risultati per una maggiore precisione.
                    </p>
                    <p className="text-xs text-text-tertiary mb-3">
                      Attiva l'archiviazione automatica per saltare la posta in arrivo per categorie specifiche.
                    </p>
                    {(["Updates", "Promotions", "Social", "Newsletters"] as const).map((cat) => (
                      <ToggleRow
                        key={cat}
                        label={`Archivia automaticamente: ${CATEGORY_LABELS[cat] ?? cat}`}
                        description={`Salta la posta in arrivo per le email di tipo ${(CATEGORY_LABELS[cat] ?? cat).toLowerCase()}`}
                        checked={autoArchiveCategories.has(cat)}
                        onToggle={async () => {
                          const next = new Set(autoArchiveCategories);
                          if (next.has(cat)) next.delete(cat);
                          else next.add(cat);
                          setAutoArchiveCategories(next);
                          await setSetting("auto_archive_categories", [...next].join(","));
                        }}
                      />
                    ))}
                  </Section>

                  <Section title="Raggruppamento e orari di consegna">
                    <p className="text-xs text-text-tertiary mb-3">
                      Comprimi le categorie in un'unica riga nella posta in arrivo. In alternativa, imposta un orario di consegna per raggruppare le email.
                    </p>
                    <BundleSettings />
                  </Section>
                </>
              )}

              {activeTab === "about" && (
                <>
                  <DeveloperTab />
                  <AboutTab />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SendAsAliasesSection() {
  const accounts = useAccountStore((s) => s.accounts);
  const [aliases, setAliases] = useState<SendAsAlias[]>([]);

  useEffect(() => {
    const activeAccount = accounts.find((a) => a.isActive);
    if (!activeAccount) return;
    let cancelled = false;
    getAliasesForAccount(activeAccount.id).then((dbAliases) => {
      if (cancelled) return;
      setAliases(dbAliases.map(mapDbAlias));
    });
    return () => { cancelled = true; };
  }, [accounts]);

  const activeAccount = accounts.find((a) => a.isActive);

  const handleSetDefault = async (alias: SendAsAlias) => {
    if (!activeAccount) return;
    await setDefaultAlias(activeAccount.id, alias.id);
    setAliases((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === alias.id,
      })),
    );
  };

  return (
    <Section title="Alias di invio">
      <p className="text-xs text-text-tertiary mb-3">
        Questi alias vengono sincronizzati dalle impostazioni di Gmail. Puoi scegliere quale alias usare come mittente predefinito.
      </p>
      {aliases.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          Nessun alias trovato. Gli alias vengono recuperati da Gmail all'avvio.
        </p>
      ) : (
        <div className="space-y-2">
          {aliases.map((alias) => (
            <div
              key={alias.id}
              className="flex items-center justify-between py-2.5 px-4 bg-bg-secondary rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Mail size={15} className="text-text-tertiary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {alias.displayName ? `${alias.displayName} <${alias.email}>` : alias.email}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {alias.isPrimary && (
                      <span className="text-[0.625rem] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                        Principale
                      </span>
                    )}
                    {alias.isDefault && (
                      <span className="text-[0.625rem] bg-success/15 text-success px-1.5 py-0.5 rounded-full">
                        Predefinito
                      </span>
                    )}
                    {alias.verificationStatus !== "accepted" && (
                      <span className="text-[0.625rem] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full">
                        {alias.verificationStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!alias.isDefault && (
                <button
                  onClick={() => handleSetDefault(alias)}
                  className="text-xs text-accent hover:text-accent-hover transition-colors shrink-0 ml-3"
                >
                  Imposta come predefinito
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function SyncOfflineSection() {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadCounts = useCallback(async () => {
    const { getPendingOpsCount, getFailedOpsCount } = await import("@/services/db/pendingOperations");
    setPendingCount(await getPendingOpsCount());
    setFailedCount(await getFailedOpsCount());
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const handleRetryFailed = async () => {
    setLoading(true);
    try {
      const { retryFailedOperations } = await import("@/services/db/pendingOperations");
      await retryFailedOperations();
      await loadCounts();
    } finally {
      setLoading(false);
    }
  };

  const handleClearFailed = async () => {
    setLoading(true);
    try {
      const { clearFailedOperations } = await import("@/services/db/pendingOperations");
      await clearFailedOperations();
      await loadCounts();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Sincronizzazione e offline">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-text-secondary">Operazioni in sospeso</span>
            <p className="text-xs text-text-tertiary mt-0.5">
              Modifiche in attesa di essere sincronizzate con il server
            </p>
          </div>
          <span className="text-sm font-mono text-text-primary">{pendingCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-text-secondary">Operazioni non riuscite</span>
            <p className="text-xs text-text-tertiary mt-0.5">
              Modifiche che non è stato possibile sincronizzare dopo vari tentativi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-text-primary">{failedCount}</span>
            {failedCount > 0 && (
              <>
                <button
                  onClick={handleRetryFailed}
                  disabled={loading}
                  className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                >
                  Riprova
                </button>
                <button
                  onClick={handleClearFailed}
                  disabled={loading}
                  className="text-xs text-danger hover:opacity-80 transition-colors disabled:opacity-50"
                >
                  Cancella
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function DeveloperTab() {
  const [appVersion, setAppVersion] = useState("");
  const [tauriVersion, setTauriVersion] = useState("");
  const [webviewVersion, setWebviewVersion] = useState("");
  const [platformLabel, setPlatformLabel] = useState("...");
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateCheckDone, setUpdateCheckDone] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  useEffect(() => {
    async function load() {
      const { getVersion, getTauriVersion } = await import("@tauri-apps/api/app");
      setAppVersion(await getVersion());
      setTauriVersion(await getTauriVersion());

      // Extract WebView version from user agent
      const ua = navigator.userAgent;
      const edgMatch = /Edg\/(\S+)/.exec(ua);
      const chromeMatch = /Chrome\/(\S+)/.exec(ua);
      const webkitMatch = /AppleWebKit\/(\S+)/.exec(ua);
      setWebviewVersion(edgMatch?.[1] ?? chromeMatch?.[1] ?? webkitMatch?.[1] ?? "Sconosciuta");

      // Detect platform via Tauri OS plugin (reliable native arch detection)
      const { platform, arch } = await import("@tauri-apps/plugin-os");
      const p = platform();
      const a = arch();
      const archLabel = a === "aarch64" || a === "arm" ? "ARM" : a === "x86_64" ? "x64" : a;
      if (p === "macos") {
        setPlatformLabel(a === "aarch64" ? "macOS (Apple Silicon)" : `macOS (${archLabel})`);
      } else if (p === "windows") {
        setPlatformLabel(`Windows (${archLabel})`);
      } else if (p === "linux") {
        setPlatformLabel(`Linux (${archLabel})`);
      } else {
        setPlatformLabel(`${p} (${archLabel})`);
      }

      // Check if there's already a known update
      const { getAvailableUpdate } = await import("@/services/updateManager");
      const existing = getAvailableUpdate();
      if (existing) setUpdateVersion(existing.version);
    }
    load();
  }, []);

  const handleCheckForUpdate = async () => {
    setCheckingForUpdate(true);
    setUpdateCheckDone(false);
    setUpdateVersion(null);
    try {
      const { checkForUpdateNow } = await import("@/services/updateManager");
      const result = await checkForUpdateNow();
      if (result) {
        setUpdateVersion(result.version);
      } else {
        setUpdateCheckDone(true);
      }
    } catch (err) {
      console.error("Update check failed:", err);
      setUpdateCheckDone(true);
    } finally {
      setCheckingForUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    setInstallingUpdate(true);
    try {
      const { installUpdate } = await import("@/services/updateManager");
      await installUpdate();
    } catch (err) {
      console.error("Update install failed:", err);
      setInstallingUpdate(false);
    }
  };

  return (
    <>
      <Section title="Informazioni sull'app">
        <InfoRow label="Versione dell'app" value={appVersion || "..."} />
        <InfoRow label="Versione di Tauri" value={tauriVersion || "..."} />
        <InfoRow label="Versione di WebView" value={webviewVersion || "..."} />
        <InfoRow label="Piattaforma" value={platformLabel} />
      </Section>

      <Section title="Aggiornamenti">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-text-secondary">Aggiornamenti software</span>
            {updateVersion && (
              <p className="text-xs text-accent mt-0.5">
                v{updateVersion} disponibile
              </p>
            )}
            {updateCheckDone && !updateVersion && (
              <p className="text-xs text-success mt-0.5">Aggiornato</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {updateVersion ? (
              <Button
                variant="primary"
                size="md"
                icon={<Download size={14} />}
                onClick={handleInstallUpdate}
                disabled={installingUpdate}
              >
                {installingUpdate ? "Aggiornamento in corso..." : "Aggiorna e riavvia"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                icon={<RefreshCw size={14} className={checkingForUpdate ? "animate-spin" : ""} />}
                onClick={handleCheckForUpdate}
                disabled={checkingForUpdate}
                className="bg-bg-tertiary text-text-primary border border-border-primary"
              >
                {checkingForUpdate ? "Controllo in corso..." : "Verifica aggiornamenti"}
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Strumenti per sviluppatori">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-text-secondary">Apri DevTools</span>
            <p className="text-xs text-text-tertiary mt-0.5">
              Apre l'ispettore degli strumenti per sviluppatori di WebView
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={async () => {
              const { invoke } = await import("@tauri-apps/api/core");
              await invoke("open_devtools");
            }}
            className="bg-bg-tertiary text-text-primary border border-border-primary"
          >
            Apri DevTools
          </Button>
        </div>
      </Section>
    </>
  );
}

function AboutTab() {
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    import("@tauri-apps/api/app").then(({ getVersion }) =>
      getVersion().then(setAppVersion),
    );
  }, []);

  const openExternal = async (url: string) => {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  };

  return (
    <>
      <Section title="Velo Fedmor">
        <div className="flex items-center gap-3 mb-2">
          <img src={appIcon} alt="Velo Fedmor" className="w-12 h-12 rounded-xl" />
          <div>
            <h3 className="text-base font-semibold text-text-primary">Velo Fedmor</h3>
            <p className="text-sm text-text-tertiary">
              {appVersion ? `Versione ${appVersion}` : "Caricamento..."}
            </p>
          </div>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          Un client di posta per desktop veloce e open source, pensato per la privacy. Le tue email restano sul tuo computer: nessun cloud, nessun tracciamento.
        </p>
      </Section>

      <Section title="Link">
        <div className="space-y-1">
          <button
            onClick={() => openExternal("https://velomail.app")}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors text-left"
          >
            <Globe size={16} className="text-text-tertiary shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-sm text-text-primary">Sito web</span>
              <p className="text-xs text-text-tertiary">velomail.app</p>
            </div>
            <ExternalLink size={14} className="text-text-tertiary shrink-0" />
          </button>

          <button
            onClick={() => openExternal("https://github.com/fedmor95-alt/fede-mail")}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors text-left"
          >
            <Github size={16} className="text-text-tertiary shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-sm text-text-primary">Repository GitHub</span>
              <p className="text-xs text-text-tertiary">fedmor95-alt/fede-mail · basato su avihaymenahem/velo</p>
            </div>
            <ExternalLink size={14} className="text-text-tertiary shrink-0" />
          </button>

          <button
            onClick={() => openExternal("mailto:info@velomail.app")}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors text-left"
          >
            <Mail size={16} className="text-text-tertiary shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-sm text-text-primary">Contatti</span>
              <p className="text-xs text-text-tertiary">info@velomail.app</p>
            </div>
            <ExternalLink size={14} className="text-text-tertiary shrink-0" />
          </button>
        </div>
      </Section>

      <Section title="Licenza">
        <div className="px-4 py-3 bg-bg-secondary rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={15} className="text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary">Apache License 2.0</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Licensed under the Apache License, Version 2.0. You may obtain a copy of the License at{" "}
            <button
              onClick={() => openExternal("https://www.apache.org/licenses/LICENSE-2.0")}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              apache.org/licenses/LICENSE-2.0
            </button>
          </p>
          <p className="text-xs text-text-tertiary leading-relaxed">
            Copyright 2025 Velo Mail. You may use, distribute, and modify this software under the terms of the Apache 2.0 license. This software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.
          </p>
        </div>
      </Section>
    </>
  );
}


function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary font-mono">{value}</span>
    </div>
  );
}

function ShortcutsTab() {
  const keyMap = useShortcutStore((s) => s.keyMap);
  const setKey = useShortcutStore((s) => s.setKey);
  const resetKey = useShortcutStore((s) => s.resetKey);
  const resetAll = useShortcutStore((s) => s.resetAll);
  const defaults = getDefaultKeyMap();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [composeShortcut, setComposeShortcut] = useState(DEFAULT_SHORTCUT);
  const [recordingGlobal, setRecordingGlobal] = useState(false);
  const globalRecorderRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const current = getCurrentShortcut();
    if (current) setComposeShortcut(current);
  }, []);

  const handleGlobalRecord = useCallback((e: React.KeyboardEvent) => {
    if (!recordingGlobal) return;
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (isMac() ? e.metaKey : e.ctrlKey || e.metaKey) parts.push("CmdOrCtrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    const key = e.key;
    if (key !== "Control" && key !== "Meta" && key !== "Shift" && key !== "Alt") {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
      const shortcut = parts.join("+");
      setComposeShortcut(shortcut);
      setRecordingGlobal(false);
      registerComposeShortcut(shortcut).catch((err) => {
        console.error("Failed to register shortcut:", err);
      });
    }
  }, [recordingGlobal]);

  const handleKeyRecord = useCallback((e: React.KeyboardEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // "Ctrl" is stored as the primary modifier: ⌘ on macOS.
    const parts: string[] = [];
    if (isMac() ? e.metaKey : e.ctrlKey || e.metaKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    const key = e.key;
    if (key === "Control" || key === "Meta" || key === "Shift" || key === "Alt") return;

    if (parts.length > 0) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
    } else {
      parts.push(key);
    }

    setKey(id, parts.join("+"));
    setRecordingId(null);
  }, [setKey]);

  const hasCustom = Object.entries(keyMap).some(([id, keys]) => defaults[id] !== keys);

  return (
    <>
      <Section title="Scorciatoia globale">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-text-secondary">Scrittura rapida</span>
            <p className="text-xs text-text-tertiary mt-0.5">
              Apre la finestra di scrittura da qualsiasi app
            </p>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="text-xs bg-bg-tertiary px-2 py-1 rounded border border-border-primary font-mono">
              {formatShortcut(composeShortcut)}
            </kbd>
            <button
              ref={globalRecorderRef}
              onClick={() => setRecordingGlobal(true)}
              onKeyDown={handleGlobalRecord}
              onBlur={() => setRecordingGlobal(false)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                recordingGlobal
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary"
              }`}
            >
              {recordingGlobal ? "Premi i tasti..." : "Cambia"}
            </button>
          </div>
        </div>
      </Section>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-tertiary">
          Fai clic su una scorciatoia per modificarla. Premi un tasto o una combinazione di tasti per impostarla.
        </p>
        {hasCustom && (
          <button
            onClick={resetAll}
            className="text-xs text-accent hover:text-accent-hover transition-colors shrink-0 ml-4"
          >
            Ripristina tutte
          </button>
        )}
      </div>
      {SHORTCUTS.map((section) => (
        <Section key={section.category} title={section.category}>
          <div className="space-y-1">
            {section.items.flatMap((item) => (item.alt ? [item.id, item.id + ALT_SUFFIX] : [item.id]).map((bindId) => {
              const isAlt = bindId !== item.id;
              const currentKey = keyMap[bindId] ?? (isAlt ? item.alt! : item.keys);
              const isDefault = currentKey === defaults[bindId];
              const isRecording = recordingId === bindId;

              return (
                <div
                  key={bindId}
                  className="flex items-center justify-between py-2 px-1"
                >
                  <span className={`text-sm ${isAlt ? "text-text-tertiary pl-4" : "text-text-secondary"}`}>
                    {isAlt ? "oppure" : item.desc}
                  </span>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => setRecordingId(isRecording ? null : bindId)}
                      onKeyDown={(e) => {
                        if (isRecording) handleKeyRecord(e, bindId);
                      }}
                      onBlur={() => { if (isRecording) setRecordingId(null); }}
                      className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                        isRecording
                          ? "bg-accent text-white"
                          : "bg-bg-tertiary text-text-tertiary hover:text-text-primary border border-border-primary"
                      }`}
                    >
                      {isRecording ? "Premi un tasto..." : formatShortcut(currentKey)}
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => resetKey(bindId)}
                        className="text-xs text-text-tertiary hover:text-text-primary"
                        title={`Ripristina a ${defaults[bindId]}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            }))}
          </div>
        </Section>
      ))}
    </>
  );
}

function ImapCalDavSection() {
  const accounts = useAccountStore((s) => s.accounts);
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const [account, setAccount] = useState<import("@/services/db/accounts").DbAccount | null>(null);

  useEffect(() => {
    if (!activeAccountId) return;
    import("@/services/db/accounts").then(({ getAccount }) => {
      getAccount(activeAccountId).then(setAccount);
    });
  }, [activeAccountId]);

  const activeUiAccount = accounts.find((a) => a.id === activeAccountId);
  const isImap = activeUiAccount?.provider === "imap";

  if (!isImap || !account) return null;

  return (
    <Section title="Calendario (CalDAV)">
      <CalDavSettingsInline account={account} onSaved={() => {
        // Reload account
        import("@/services/db/accounts").then(({ getAccount }) => {
          getAccount(account.id).then(setAccount);
        });
      }} />
    </Section>
  );
}

function CalDavSettingsInline({ account, onSaved }: { account: import("@/services/db/accounts").DbAccount; onSaved: () => void }) {
  const [CalDav, setCalDav] = useState<typeof import("@/components/settings/CalDavSettings").CalDavSettings | null>(null);

  useEffect(() => {
    import("@/components/settings/CalDavSettings").then((m) => setCalDav(() => m.CalDavSettings));
  }, []);

  if (!CalDav) return <div className="text-xs text-text-tertiary">Caricamento...</div>;

  return <CalDav account={account} onSaved={onSaved} />;
}

function SidebarNavEditor() {
  const sidebarNavConfig = useUIStore((s) => s.sidebarNavConfig);
  const setSidebarNavConfig = useUIStore((s) => s.setSidebarNavConfig);

  const items: SidebarNavItem[] = (() => {
    if (!sidebarNavConfig) return ALL_NAV_ITEMS.map((i) => ({ id: i.id, visible: true }));
    // Append any ALL_NAV_ITEMS entries missing from saved config (e.g. newly added sections)
    const savedIds = new Set(sidebarNavConfig.map((i) => i.id));
    const missing = ALL_NAV_ITEMS.filter((i) => !savedIds.has(i.id)).map((i) => ({ id: i.id, visible: true }));
    return [...sidebarNavConfig, ...missing];
  })();
  const navLookup = new Map(ALL_NAV_ITEMS.map((n) => [n.id, n]));

  const moveItem = (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    setSidebarNavConfig(next);
  };

  const toggleItem = (index: number) => {
    const next = [...items];
    const current = next[index];
    // Inbox cannot be hidden
    if (!current || current.id === "inbox") return;
    next[index] = { ...current, visible: !current.visible };
    setSidebarNavConfig(next);
  };

  const resetToDefaults = () => {
    setSidebarNavConfig(ALL_NAV_ITEMS.map((i) => ({ id: i.id, visible: true })));
  };

  const isDefault =
    !sidebarNavConfig ||
    (items.length === ALL_NAV_ITEMS.length &&
      items.every((item, i) => item.id === ALL_NAV_ITEMS[i]?.id && item.visible));

  return (
    <Section title="Barra laterale">
      <div className="space-y-1">
        {items.map((item, index) => {
          const nav = navLookup.get(item.id);
          if (!nav) return null;
          const Icon = nav.icon;
          const isInbox = item.id === "inbox";
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                item.visible ? "text-text-primary" : "text-text-tertiary"
              }`}
            >
              <button
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                className="p-0.5 rounded text-text-tertiary hover:text-text-primary disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                title="Sposta su"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                className="p-0.5 rounded text-text-tertiary hover:text-text-primary disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                title="Sposta giù"
              >
                <ChevronDown size={14} />
              </button>
              <Icon size={16} className="shrink-0 ml-1" />
              <span className="flex-1 truncate">{nav.label}</span>
              <button
                onClick={() => toggleItem(index)}
                disabled={isInbox}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                  isInbox
                    ? "bg-accent/40 cursor-not-allowed"
                    : item.visible
                      ? "bg-accent cursor-pointer"
                      : "bg-bg-tertiary cursor-pointer"
                }`}
                title={isInbox ? "La Posta in arrivo è sempre visibile" : item.visible ? "Nascondi" : "Mostra"}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    item.visible ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
      {!isDefault && (
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover mt-2 transition-colors"
        >
          <RotateCcw size={12} />
          Ripristina predefiniti
        </button>
      )}
    </Section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-text-secondary">{label}</label>
      {children}
    </div>
  );
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function BundleSettings() {
  const accounts = useAccountStore((s) => s.accounts);
  const activeAccountId = accounts.find((a) => a.isActive)?.id;
  const [rules, setRules] = useState<Record<string, { bundled: boolean; delivery: boolean; days: number[]; hour: number; minute: number }>>({});

  useEffect(() => {
    if (!activeAccountId) return;
    import("@/services/db/bundleRules").then(async ({ getBundleRules }) => {
      const dbRules = await getBundleRules(activeAccountId);
      const map: typeof rules = {};
      for (const r of dbRules) {
        let schedule = { days: [6], hour: 9, minute: 0 };
        try {
          if (r.delivery_schedule) schedule = JSON.parse(r.delivery_schedule);
        } catch { /* use defaults */ }
        map[r.category] = {
          bundled: r.is_bundled === 1,
          delivery: r.delivery_enabled === 1,
          days: schedule.days,
          hour: schedule.hour,
          minute: schedule.minute,
        };
      }
      setRules(map);
    });
  }, [activeAccountId]);

  const saveRule = async (category: string, update: Partial<typeof rules[string]>) => {
    if (!activeAccountId) return;
    const current = rules[category] ?? { bundled: false, delivery: false, days: [6], hour: 9, minute: 0 };
    const merged = { ...current, ...update };
    setRules((prev) => ({ ...prev, [category]: merged }));
    const { setBundleRule } = await import("@/services/db/bundleRules");
    await setBundleRule(
      activeAccountId,
      category,
      merged.bundled,
      merged.delivery,
      merged.delivery ? { days: merged.days, hour: merged.hour, minute: merged.minute } : null,
    );
  };

  return (
    <div className="space-y-4">
      {(["Newsletters", "Promotions", "Social", "Updates"] as const).map((cat) => {
        const rule = rules[cat];
        return (
          <div key={cat} className="py-3 px-4 bg-bg-secondary rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">{CATEGORY_LABELS[cat] ?? cat}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={rule?.bundled ?? false}
                    onChange={() => saveRule(cat, { bundled: !(rule?.bundled ?? false) })}
                    className="accent-accent"
                  />
                  Raggruppa
                </label>
                <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={rule?.delivery ?? false}
                    onChange={() => saveRule(cat, { delivery: !(rule?.delivery ?? false) })}
                    className="accent-accent"
                  />
                  Pianifica
                </label>
              </div>
            </div>
            {rule?.delivery && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {DAY_NAMES.map((name, idx) => (
                    <button
                      key={name}
                      onClick={() => {
                        const days = rule.days.includes(idx)
                          ? rule.days.filter((d) => d !== idx)
                          : [...rule.days, idx].sort();
                        saveRule(cat, { days });
                      }}
                      className={`w-8 h-7 text-[0.625rem] rounded transition-colors ${
                        rule.days.includes(idx)
                          ? "bg-accent text-white"
                          : "bg-bg-tertiary text-text-tertiary border border-border-primary"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary">alle</span>
                  <input
                    type="time"
                    value={`${String(rule.hour).padStart(2, "0")}:${String(rule.minute).padStart(2, "0")}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      saveRule(cat, { hour: h ?? 9, minute: m ?? 0 });
                    }}
                    className="bg-bg-tertiary text-text-primary text-xs px-2 py-1 rounded border border-border-primary"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-text-secondary">{label}</span>
        {description && (
          <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ml-4 ${
          checked ? "bg-accent" : "bg-bg-tertiary"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
