"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { LoadingState, ErrorState } from "@tge/ui";

export type KanbanStatus = "new" | "read" | "archived";

interface KanbanInquiry {
  id: string;
  type: "general" | "property" | "developer";
  status: KanbanStatus;
  name: string;
  email: string;
  message: string;
  source?: string | null;
  createdAt: string;
}

interface KanbanBoardProps {
  items: KanbanInquiry[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onStatusChange: (id: string, status: KanbanStatus) => void;
  onOpen: (inquiry: KanbanInquiry) => void;
}

const COLUMNS: KanbanStatus[] = ["new", "read", "archived"];

export function InquiryKanbanBoard({
  items,
  isLoading,
  isError,
  onRetry,
  onStatusChange,
  onOpen,
}: KanbanBoardProps) {
  const t = useTranslations("Common");
  const [activeId, setActiveId] = useState<string | null>(null);

  // PointerSensor's small activation distance avoids swallowing plain clicks.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const byStatus = useMemo(() => {
    const map: Record<KanbanStatus, KanbanInquiry[]> = {
      new: [],
      read: [],
      archived: [],
    };
    for (const item of items) map[item.status].push(item);
    return map;
  }, [items]);

  const activeItem = useMemo(
    () => items.find((i) => i.id === activeId) ?? null,
    [items, activeId],
  );

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const next = e.over.id as KanbanStatus;
    if (!COLUMNS.includes(next)) return;
    const id = String(e.active.id);
    const current = items.find((i) => i.id === id);
    if (!current || current.status === next) return;
    onStatusChange(id, next);
  };

  if (isError)
    return (
      <ErrorState
        onRetry={onRetry}
        retryLabel={t("retry")}
        className="mt-4"
      />
    );
  if (isLoading && items.length === 0)
    return <LoadingState label={t("loading")} className="mt-4" />;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        role="grid"
        aria-label={t("inquiriesKanbanLabel")}
        className="grid min-h-[60vh] grid-cols-1 gap-3 md:grid-cols-3"
      >
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            items={byStatus[status]}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <InquiryCard
            inquiry={activeItem}
            dragging
            onOpen={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface ColumnProps {
  status: KanbanStatus;
  items: KanbanInquiry[];
  onOpen: (inquiry: KanbanInquiry) => void;
}

function Column({ status, items, onOpen }: ColumnProps) {
  const ts = useTranslations("Common");
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const toneClass =
    status === "new"
      ? "border-[color-mix(in_srgb,var(--color-info)_25%,var(--border))]"
      : status === "read"
        ? "border-border"
        : "border-border opacity-90";

  const statusLabel = ts(
    `statusLabel.${status}` as Parameters<typeof ts>[0],
  );

  return (
    <div
      ref={setNodeRef}
      role="rowgroup"
      aria-label={`${statusLabel} (${items.length})`}
      className={cn(
        "flex min-h-[200px] flex-col rounded-md border bg-muted/30 p-2 transition-colors",
        toneClass,
        isOver && "bg-[color-mix(in_srgb,var(--color-copper)_6%,var(--muted))]",
      )}
    >
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <span className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {statusLabel}
        </span>
        <Mono className="text-[11px] text-muted-foreground">{items.length}</Mono>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <InquiryCard
            key={item.id}
            inquiry={item}
            statusLabel={statusLabel}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

interface InquiryCardProps {
  inquiry: KanbanInquiry;
  onOpen: (inquiry: KanbanInquiry) => void;
  dragging?: boolean;
  statusLabel?: string;
}

function InquiryCard({
  inquiry,
  onOpen,
  dragging,
  statusLabel,
}: InquiryCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: inquiry.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="row"
      aria-label={
        statusLabel
          ? `${inquiry.name} — ${statusLabel}`
          : inquiry.name
      }
      className={cn(
        "group rounded-md border border-border bg-card p-2.5 text-left transition-shadow",
        dragging
          ? "shadow-lg"
          : "hover:border-[color-mix(in_srgb,var(--color-copper)_30%,var(--border))]",
        isDragging && !dragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            // Don't open peek mid-drag; react-dnd-kit fires click even for
            // short drags sometimes — activationConstraint above gates that.
            if (dragging || isDragging) return;
            e.stopPropagation();
            onOpen(inquiry);
          }}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium text-foreground">
            {inquiry.name}
          </p>
          <Mono className="truncate text-[11px] text-muted-foreground">
            {inquiry.email}
          </Mono>
        </button>
        <MonoTag className="shrink-0">{inquiry.type}</MonoTag>
      </div>
      <p className="mt-1.5 line-clamp-2 cursor-grab text-[12px] leading-snug text-muted-foreground active:cursor-grabbing">
        {inquiry.message}
      </p>
      <div className="mt-2 flex items-center justify-between">
        {inquiry.source ? (
          <MonoTag>{inquiry.source}</MonoTag>
        ) : (
          <span />
        )}
        <RelativeTime value={inquiry.createdAt} />
      </div>
    </div>
  );
}
