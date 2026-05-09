"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DialogFooter,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@tge/ui";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Mono } from "@/components/shared/mono";
import { pickTitle } from "@/lib/academy/pick-title";

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
};

type LocaleKey = "ro" | "en" | "fr" | "de";
const LOCALES: LocaleKey[] = ["ro", "en", "fr", "de"];
const WILDCARD = "__wildcard__";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedRow = {
  raw: string;
  email: string;
  name: string;
  locale: LocaleKey;
  error: string | null;
};

type SendStatus = "pending" | "sending" | "success" | "failed";

interface BulkInviteFormProps {
  courses: Course[];
  onCancel: () => void;
  onSuccess: () => void;
}

export function BulkInviteForm({
  courses,
  onCancel,
  onSuccess,
}: BulkInviteFormProps) {
  const locale = useLocale();
  const t = useTranslations("Academy.invite");
  const tBulk = useTranslations("Academy.invite.bulk");
  const tLang = useTranslations("Academy.languages");
  const tc = useTranslations("Common");

  const [defaultCourseId, setDefaultCourseId] = useState<string>(WILDCARD);
  const [defaultLocale, setDefaultLocale] = useState<LocaleKey>("ro");
  const [csvText, setCsvText] = useState("");

  const [statuses, setStatuses] = useState<Record<string, SendStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const parsed: ParsedRow[] = useMemo(
    () => parseCsv(csvText, defaultLocale),
    [csvText, defaultLocale],
  );

  const validRows = parsed.filter((r) => !r.error);
  const errorRows = parsed.filter((r) => r.error);
  const allSentSuccessfully =
    validRows.length > 0 &&
    validRows.every((r) => statuses[r.email] === "success");
  const successCount = validRows.filter(
    (r) => statuses[r.email] === "success",
  ).length;
  const failCount = validRows.filter(
    (r) => statuses[r.email] === "failed",
  ).length;

  const send = async () => {
    if (sending || validRows.length === 0) return;
    setSending(true);
    // Mark all as pending up front so the table shows progression cleanly.
    setStatuses(
      Object.fromEntries(validRows.map((r) => [r.email, "pending"])) as Record<
        string,
        SendStatus
      >,
    );
    setErrors({});

    // Sequential to keep request ordering predictable and avoid hammering
    // the email provider rate limit. For batches > ~50 a small concurrency
    // bump would be fine, but most admin batches are tens of users.
    for (const row of validRows) {
      setStatuses((prev) => ({ ...prev, [row.email]: "sending" }));
      try {
        await apiClient("/admin/academy/invitations", {
          method: "POST",
          body: {
            email: row.email,
            name: row.name,
            locale: row.locale,
            initialCourseId:
              defaultCourseId === WILDCARD ? null : defaultCourseId,
          },
        });
        setStatuses((prev) => ({ ...prev, [row.email]: "success" }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed";
        setStatuses((prev) => ({ ...prev, [row.email]: "failed" }));
        setErrors((prev) => ({ ...prev, [row.email]: message }));
      }
    }
    setSending(false);
  };

  const close = () => {
    if (allSentSuccessfully && successCount > 0) {
      toast.success(tBulk("toastSent", { count: successCount }));
      onSuccess();
      return;
    }
    onCancel();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="bulk-course">{t("courseLabel")}</Label>
          <Select value={defaultCourseId} onValueChange={setDefaultCourseId}>
            <SelectTrigger id="bulk-course" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WILDCARD}>{t("wildcardOption")}</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {pickTitle(c.title, c.slug, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tBulk("courseHelper")}
          </p>
        </div>

        <div>
          <Label htmlFor="bulk-locale">{tBulk("defaultLocaleLabel")}</Label>
          <Select
            value={defaultLocale}
            onValueChange={(v) => setDefaultLocale(v as LocaleKey)}
          >
            <SelectTrigger id="bulk-locale" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l} value={l}>
                  {tLang(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tBulk("defaultLocaleHelper")}
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="bulk-csv">{tBulk("csvLabel")}</Label>
        <Textarea
          id="bulk-csv"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={tBulk("csvPlaceholder")}
          className="font-mono mt-1.5 text-[12px]"
          disabled={sending}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {tBulk("csvHelper")}
        </p>
      </div>

      {parsed.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-8 px-2 py-2" aria-label={tBulk("statusAria")} />
                <th className="px-3 py-2">{tBulk("columnEmail")}</th>
                <th className="px-3 py-2">{tBulk("columnName")}</th>
                <th className="w-20 px-3 py-2">{tBulk("columnLocale")}</th>
                <th className="px-3 py-2">{tBulk("columnNote")}</th>
              </tr>
            </thead>
            <tbody>
              {parsed.map((row, i) => {
                const status = statuses[row.email];
                const sendError = errors[row.email];
                return (
                  <tr
                    key={`${row.raw}-${i}`}
                    className="border-t border-border"
                  >
                    <td className="w-8 px-2 py-2">
                      <RowStatusIcon
                        rowError={row.error}
                        sendStatus={status}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Mono className="text-foreground">{row.email || "—"}</Mono>
                    </td>
                    <td className="px-3 py-2 text-xs">{row.name || "—"}</td>
                    <td className="w-20 px-3 py-2">
                      <Mono className="uppercase">{row.locale}</Mono>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {row.error ? (
                        <span className="text-[var(--color-danger)]">
                          {row.error}
                        </span>
                      ) : sendError ? (
                        <span className="text-[var(--color-danger)]">
                          {sendError}
                        </span>
                      ) : status === "success" ? (
                        <span className="text-[var(--color-success)]">
                          {tBulk("rowSent")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {tBulk("rowReady")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          {validRows.length > 0
            ? tBulk("summaryReady", {
                valid: validRows.length,
                errors: errorRows.length,
              })
            : null}
        </div>
        {sending || successCount > 0 || failCount > 0 ? (
          <div className="flex items-center gap-3">
            {successCount > 0 ? (
              <span className="text-[var(--color-success)]">
                {tBulk("summarySent", { count: successCount })}
              </span>
            ) : null}
            {failCount > 0 ? (
              <span className="text-[var(--color-danger)]">
                {tBulk("summaryFailed", { count: failCount })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={close}>
          {allSentSuccessfully ? tc("close") : tc("cancel")}
        </Button>
        <Button
          type="button"
          onClick={send}
          disabled={
            sending || validRows.length === 0 || allSentSuccessfully
          }
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {tBulk("sending", {
                done: successCount + failCount,
                total: validRows.length,
              })}
            </>
          ) : (
            tBulk("sendN", { count: validRows.length })
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

function RowStatusIcon({
  rowError,
  sendStatus,
}: {
  rowError: string | null;
  sendStatus: SendStatus | undefined;
}) {
  if (rowError) {
    return <XCircle className="h-4 w-4 text-[var(--color-danger)]" />;
  }
  if (sendStatus === "success") {
    return <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />;
  }
  if (sendStatus === "failed") {
    return <XCircle className="h-4 w-4 text-[var(--color-danger)]" />;
  }
  if (sendStatus === "sending") {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  return (
    <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
  );
}

/**
 * Tolerant CSV parser for the invite flow. Accepts:
 *   email
 *   email,name
 *   email,name,locale
 * Strips an optional header row (first cell starts with "email"). Trims
 * each cell. Skips blank lines. Dedupes by lowercased email — first
 * occurrence wins.
 */
function parseCsv(text: string, fallbackLocale: LocaleKey): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const seenEmails = new Set<string>();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return rows;

  // Detect header (case-insensitive "email" first cell).
  const start =
    lines[0].split(",")[0]?.trim().toLowerCase() === "email" ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const raw = lines[i];
    const cells = raw.split(",").map((c) => c.trim());
    const email = (cells[0] ?? "").toLowerCase();
    const name = cells[1] ?? "";
    const localeCell = (cells[2] ?? "").toLowerCase();
    const locale: LocaleKey = LOCALES.includes(localeCell as LocaleKey)
      ? (localeCell as LocaleKey)
      : fallbackLocale;

    let error: string | null = null;
    if (!email) {
      error = "missing email";
    } else if (!EMAIL_RE.test(email)) {
      error = "invalid email";
    } else if (seenEmails.has(email)) {
      error = "duplicate";
    } else if (!name) {
      error = "missing name";
    } else if (name.length > 200) {
      error = "name too long";
    }

    if (!error) seenEmails.add(email);

    rows.push({ raw, email, name, locale, error });
  }

  return rows;
}
