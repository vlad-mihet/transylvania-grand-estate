"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { GripVertical, Star, Upload, X } from "lucide-react";
import { Button } from "@tge/ui";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";

export interface GalleryImage {
  /** DB id for persisted rows; absent for newly-added files. */
  id?: string;
  src: string;
  alt: string;
  isHero: boolean;
  file?: File;
}

interface ImageGalleryManagerProps {
  images: GalleryImage[];
  /** Omit when `readOnly` — the viewer never calls it. */
  onChange?: (images: GalleryImage[]) => void;
  /** Render the gallery without DnD, upload dropzone, or per-tile mutations. */
  readOnly?: boolean;
}

/**
 * Drag-to-reorder image gallery. Uses the filename (for new files) or the
 * persisted id (for existing rows) as a stable sortable id so the order
 * survives re-renders during an in-flight upload.
 */
function itemKey(img: GalleryImage, index: number): string {
  return img.id ?? img.src ?? `new-${index}`;
}

export function ImageGalleryManager({
  images,
  onChange,
  readOnly = false,
}: ImageGalleryManagerProps) {
  const t = useTranslations("Common");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const emit = (next: GalleryImage[]) => onChange?.(next);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const newImages: GalleryImage[] = accepted.map((file) => ({
        src: URL.createObjectURL(file),
        alt: file.name.replace(/\.[^.]+$/, ""),
        isHero: false,
        file,
      }));
      const merged = [...images, ...newImages];
      if (merged.length > 0 && !merged.some((img) => img.isHero)) {
        merged[0].isHero = true;
      }
      onChange?.(merged);
    },
    [images, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".avif"] },
    maxSize: 10 * 1024 * 1024,
    disabled: readOnly,
    noClick: readOnly,
    noKeyboard: readOnly,
  });

  const removeImage = (index: number) => {
    const removed = images[index];
    if (removed.file) URL.revokeObjectURL(removed.src);
    const updated = images.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((img) => img.isHero)) {
      updated[0].isHero = true;
    }
    emit(updated);
  };

  const setHero = (index: number) => {
    emit(images.map((img, i) => ({ ...img, isHero: i === index })));
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const keys = images.map((img, i) => itemKey(img, i));
    const oldIndex = keys.indexOf(String(e.active.id));
    const newIndex = keys.indexOf(String(e.over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    emit(arrayMove(images, oldIndex, newIndex));
  };

  const ids = images.map((img, i) => itemKey(img, i));

  const gridClasses =
    "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

  if (readOnly) {
    return (
      <div className={gridClasses}>
        {images.map((img, index) => (
          <StaticImage
            key={itemKey(img, index)}
            img={img}
            heroLabel={t("hero")}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <div className={gridClasses}>
            {images.map((img, index) => (
              <SortableImage
                key={itemKey(img, index)}
                id={itemKey(img, index)}
                img={img}
                onSetHero={() => setHero(index)}
                onRemove={() => removeImage(index)}
                heroLabel={t("hero")}
                setAsHeroLabel={t("setAsHero")}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-6 transition-colors",
          isDragActive
            ? "border-[var(--color-copper)] bg-[color-mix(in_srgb,var(--color-copper)_5%,transparent)]"
            : "border-border hover:border-[color-mix(in_srgb,var(--color-copper)_40%,var(--border))] hover:bg-muted/40",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("dragDropImages")}</p>
        <p className="mono mt-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
          {t("fileFormats")}
        </p>
      </div>
    </div>
  );
}

interface SortableImageProps {
  id: string;
  img: GalleryImage;
  onSetHero: () => void;
  onRemove: () => void;
  heroLabel: string;
  setAsHeroLabel: string;
}

function SortableImage({
  id,
  img,
  onSetHero,
  onRemove,
  heroLabel,
  setAsHeroLabel,
}: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-md border bg-card transition-shadow",
        img.isHero
          ? "border-[var(--color-copper)] shadow-[0_0_0_1px_var(--color-copper)]"
          : "border-border hover:border-[color-mix(in_srgb,var(--color-copper)_30%,var(--border))]",
        isDragging && "z-10 shadow-lg",
      )}
    >
      <Image
        src={img.src}
        alt={img.alt}
        width={240}
        height={180}
        className="aspect-[4/3] w-full object-cover"
        unoptimized={img.src.startsWith("blob:")}
      />

      {/* Drag grip — only this subregion is the listener target so the action
          buttons below stay clickable without triggering a drag. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1.5 flex h-6 w-6 cursor-grab items-center justify-center rounded-sm bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-6 w-6 bg-black/40 text-white hover:bg-black/60"
          onClick={onSetHero}
          title={setAsHeroLabel}
        >
          <Star
            className={cn(
              "h-3 w-3",
              img.isHero && "fill-[var(--color-copper)] text-[var(--color-copper)]",
            )}
          />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-6 w-6"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {img.isHero && (
        <span className="mono absolute bottom-1.5 left-1.5 rounded-sm border border-[color-mix(in_srgb,var(--color-copper)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-copper)_20%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-copper-dark)]">
          {heroLabel}
        </span>
      )}
    </div>
  );
}

function StaticImage({
  img,
  heroLabel,
}: {
  img: GalleryImage;
  heroLabel: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border bg-card",
        img.isHero
          ? "border-[var(--color-copper)] shadow-[0_0_0_1px_var(--color-copper)]"
          : "border-border",
      )}
    >
      <Image
        src={img.src}
        alt={img.alt}
        width={240}
        height={180}
        className="aspect-[4/3] w-full object-cover"
        unoptimized={img.src.startsWith("blob:")}
      />
      {img.isHero && (
        <span className="mono absolute bottom-1.5 left-1.5 rounded-sm border border-[color-mix(in_srgb,var(--color-copper)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-copper)_20%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-copper-dark)]">
          {heroLabel}
        </span>
      )}
    </div>
  );
}
