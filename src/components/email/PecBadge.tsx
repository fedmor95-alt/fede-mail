import { PEC_KIND_LABELS, PEC_STATUS_LABELS, type PecStatus } from "@/services/pec/pecStatus";

const STATUS_STYLES: Record<PecStatus, string> = {
  ricevuta: "bg-accent/15 text-accent",
  accettata: "bg-warning/15 text-warning",
  consegnata: "bg-success/15 text-success",
  errore: "bg-danger/15 text-danger",
};

/** Thread-level PEC badge: "PEC" for a received PEC, delivery status for a sent one. */
export function PecStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status || !(status in STATUS_STYLES)) return null;
  const s = status as PecStatus;
  const label = s === "ricevuta" ? "PEC" : `PEC · ${PEC_STATUS_LABELS[s]}`;
  return (
    <span className={`shrink-0 text-[0.625rem] font-medium px-1.5 rounded-full leading-normal ${STATUS_STYLES[s]}`}>
      {label}
    </span>
  );
}

/** Message-level PEC tag: envelope or receipt type. */
export function PecKindBadge({ kind }: { kind: string | null | undefined }) {
  if (!kind) return null;
  const isError = /errore|non-accettazione|virus/.test(kind);
  const isDelivered = kind === "avvenuta-consegna";
  const style = isError ? "bg-danger/15 text-danger" : isDelivered ? "bg-success/15 text-success" : "bg-accent/15 text-accent";
  return (
    <span className={`shrink-0 text-[0.625rem] font-medium px-1.5 rounded-full leading-normal ${style}`}>
      {PEC_KIND_LABELS[kind] ?? `PEC (${kind})`}
    </span>
  );
}
