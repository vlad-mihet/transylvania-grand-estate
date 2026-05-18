"use client";

import { type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { InfoCard } from "./info-card";

export interface ReferenceLink {
  /** Display label (e.g. "Bucharest" for a city, "ABC Imobil" for a developer). */
  label: ReactNode;
  /** Optional type label rendered as a small chip ("City", "Developer"). */
  type?: string;
  /** Admin route this reference resolves to. */
  href: string;
}

export interface ReferencesCardProps {
  /**
   * What this entry references — outgoing FKs. E.g. an article's category +
   * author; a property's developer + county + city.
   */
  outgoing?: ReferenceLink[];
  /**
   * What references this entry — incoming FKs. E.g. for a developer, the
   * properties that belong to it. Optional; many entries don't track
   * backlinks and this section is hidden when empty.
   */
  incoming?: ReferenceLink[];
}

/**
 * Outgoing + incoming reference list. Surfaces "what is this entry connected
 * to?" without forcing the editor to leave the page. Outgoing references
 * come from the form's loaded entity; incoming references are typically
 * fetched separately by the consumer (this card just renders).
 */
export function ReferencesCard({
  outgoing = [],
  incoming = [],
}: ReferencesCardProps) {
  if (outgoing.length === 0 && incoming.length === 0) return null;
  return (
    <InfoCard title="References">
      <div className="space-y-3">
        {outgoing.length > 0 ? (
          <Section
            heading="Links to"
            icon={<ArrowUpRight className="h-3 w-3" />}
            refs={outgoing}
          />
        ) : null}
        {incoming.length > 0 ? (
          <Section
            heading="Linked from"
            icon={<ArrowDownRight className="h-3 w-3" />}
            refs={incoming}
          />
        ) : null}
      </div>
    </InfoCard>
  );
}

function Section({
  heading,
  icon,
  refs,
}: {
  heading: string;
  icon: ReactNode;
  refs: ReferenceLink[];
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground" aria-hidden>
          {icon}
        </span>
        <span className="mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
          {heading}
        </span>
      </div>
      <ul className="space-y-0.5">
        {refs.map((ref, i) => (
          <li key={`${ref.type ?? ""}-${i}`}>
            <Link
              href={ref.href as Parameters<typeof Link>[0]["href"]}
              className="flex items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-muted hover:text-copper"
            >
              {ref.type ? (
                <span className="mono shrink-0 rounded bg-muted px-1 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                  {ref.type}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{ref.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
