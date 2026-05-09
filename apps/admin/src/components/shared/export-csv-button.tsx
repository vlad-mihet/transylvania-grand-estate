"use client";

import { useState } from "react";
import { Button } from "@tge/ui";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError, getAccessToken } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface ExportCsvButtonProps {
  /** API path (without origin) including any query params already encoded. */
  path: string;
  /** Optional override label; falls back to Common.exportCsv. */
  label?: string;
  /** Render as a small ghost button next to other section actions. */
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default";
  /**
   * Filename used for the local save. The server already sets
   * Content-Disposition with its own dated filename — this is a
   * client-side fallback when the browser rejects the header (rare).
   */
  fallbackFilename?: string;
}

/**
 * Authenticated CSV download trigger. Uses an in-memory access token via
 * `getAccessToken` to fetch the endpoint as a Blob, then drives a
 * synthetic `<a download>` to save it. Falls back to a session-expired
 * toast on 401 (the apiClient's redirect-to-login flow handles the rest
 * on the next navigation).
 */
export function ExportCsvButton({
  path,
  label,
  variant = "outline",
  size = "sm",
  fallbackFilename = "export.csv",
}: ExportCsvButtonProps) {
  const t = useTranslations("Common");
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const siteId = process.env.NEXT_PUBLIC_SITE_ID;
      if (siteId) headers["X-Site"] = siteId;

      const res = await fetch(`${base}${path}`, { headers });
      if (!res.ok) {
        throw new ApiError(res.status, res.statusText, path);
      }

      // Prefer the server-supplied filename so locale-dated names land in
      // the user's downloads folder. Falls back to the prop default.
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] ?? fallbackFilename;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={busy}
    >
      <Download className="mr-1.5 h-3.5 w-3.5" />
      {busy ? t("exportInProgress") : (label ?? t("exportCsv"))}
    </Button>
  );
}
