import { ShieldAlert } from "lucide-react";
import type { MessageScanResult } from "@/utils/phishingDetector";

interface PhishingBannerProps {
  scanResult: MessageScanResult;
  onTrustSender: () => void;
}

export function PhishingBanner({ scanResult, onTrustSender }: PhishingBannerProps) {
  const isHigh = scanResult.maxRiskScore >= 60;

  const bgClass = isHigh
    ? "bg-danger/10 border-danger/30"
    : "bg-warning/10 border-warning/30";
  const textClass = isHigh ? "text-danger" : "text-warning";
  const iconClass = isHigh ? "text-danger" : "text-warning";
  const buttonClass = isHigh
    ? "text-danger hover:text-danger/80 border-danger/30 hover:bg-danger/5"
    : "text-warning hover:text-warning/80 border-warning/30 hover:bg-warning/5";

  return (
    <div className={`mx-4 my-2 px-3 py-2.5 rounded-lg border ${bgClass} flex items-center gap-3`}>
      <ShieldAlert size={18} className={`shrink-0 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${textClass}`}>
          Link {isHigh ? "ad alto rischio" : "sospetti"} rilevati
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">
          {scanResult.suspiciousLinkCount === 1
            ? "Trovato 1 link sospetto"
            : `Trovati ${scanResult.suspiciousLinkCount} link sospetti`}
          {" "}in questo messaggio. Fai attenzione prima di cliccare sui link.
        </p>
      </div>
      <button
        onClick={onTrustSender}
        className={`shrink-0 text-xs px-2.5 py-1 rounded-md border transition-colors ${buttonClass}`}
      >
        Fidati di questo mittente
      </button>
    </div>
  );
}
