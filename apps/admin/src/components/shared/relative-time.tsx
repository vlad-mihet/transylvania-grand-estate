"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Mono } from "@/components/shared/mono";

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;

interface RelativeTimeProps {
  value: string | number | Date;
  className?: string;
}

/**
 * Compact relative timestamp ("3m", "2h", "5d", "3w"). Falls back to locale
 * date formatting for anything older than 4 weeks. Renders in mono so
 * timestamps align vertically in tables.
 */
export function RelativeTime({ value, className }: RelativeTimeProps) {
  const locale = useLocale();
  const date = value instanceof Date ? value : new Date(value);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  const label = formatRelative(seconds, date, locale);
  const title = date.toLocaleString(locale);

  return (
    <Mono className={className} title={title}>
      {label}
    </Mono>
  );
}

function formatRelative(seconds: number, date: Date, locale: string): string {
  if (seconds < MINUTE) return "just now";
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h`;
  if (seconds < WEEK) return `${Math.floor(seconds / DAY)}d`;
  if (seconds < 4 * WEEK) return `${Math.floor(seconds / WEEK)}w`;
  return date.toLocaleDateString(locale, {
    year: "2-digit",
    month: "short",
    day: "numeric",
  });
}
