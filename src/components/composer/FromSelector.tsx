import type { SendAsAlias } from "@/services/db/sendAsAliases";

interface FromSelectorProps {
  aliases: SendAsAlias[];
  selectedEmail: string;
  /** Account the selected address belongs to: the same address can exist
   *  on two accounts (e.g. Gmail and IMAP), so email alone is ambiguous. */
  selectedAccountId?: string | null;
  onChange: (alias: SendAsAlias) => void;
}

/**
 * Dropdown for selecting a send-as alias in the composer.
 * Only visible when more than one alias is available.
 */
export function FromSelector({ aliases, selectedEmail, selectedAccountId, onChange }: FromSelectorProps) {
  if (aliases.length <= 1) return null;

  const selected =
    aliases.find((a) => a.email === selectedEmail && (!selectedAccountId || a.accountId === selectedAccountId))
    ?? aliases.find((a) => a.email === selectedEmail);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary w-14 shrink-0">
        Da
      </span>
      <select
        value={selected?.id ?? ""}
        onChange={(e) => {
          const alias = aliases.find((a) => a.id === e.target.value);
          if (alias) onChange(alias);
        }}
        className="flex-1 bg-transparent text-sm text-text-primary outline-none cursor-pointer hover:bg-bg-hover rounded px-1 py-0.5 -ml-1 border-none"
      >
        {aliases.map((alias) => (
          <option key={alias.id} value={alias.id}>
            {alias.displayName
              ? `${alias.displayName} <${alias.email}>`
              : alias.email}
          </option>
        ))}
      </select>
    </div>
  );
}
