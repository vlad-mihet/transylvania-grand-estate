"use client";

import { cn } from "@tge/utils";
import { GoogleMark } from "./google-mark";

interface GoogleSsoButtonProps {
  label: string;
  /** When present, forwarded to the API so the OAuth callback can accept the
   *  invitation after the roundtrip. Only used by accept-invite. */
  invitationToken?: string;
  className?: string;
}

/**
 * Browser redirect to the API's `/auth/google` endpoint. Rendered as a plain
 * anchor (not a button + JS) so it survives JS-disabled environments and keeps
 * the referrer policy simple.
 */
export function GoogleSsoButton({
  label,
  invitationToken,
  className,
}: GoogleSsoButtonProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const qs = invitationToken
    ? `?invitation=${encodeURIComponent(invitationToken)}`
    : "";
  const href = apiUrl ? `${apiUrl}/auth/google${qs}` : "#";
  return (
    <a
      href={href}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-md border border-border bg-card px-3 text-left text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <GoogleMark className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 truncate">{label}</span>
    </a>
  );
}
