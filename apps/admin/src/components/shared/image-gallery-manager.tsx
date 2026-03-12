"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Star } from "lucide-react";
import { Button } from "@tge/ui";
import Image from "next/image";
import { useTranslations } from "next-intl";

export interface GalleryImage {
  id?: string;
  src: string;
  alt: string;
  isHero: boolean;
  file?: File;
}

interface ImageGalleryManagerProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

export function ImageGalleryManager({
  images,
  onChange,
}: ImageGalleryManagerProps) {
  const t = useTranslations("Common");

  const onDrop = useCallback(
    (accepted: File[]) => {
      const newImages: GalleryImage[] = accepted.map((file) => ({
        src: URL.createObjectURL(file),
        alt: file.name.replace(/\.[^.]+$/, ""),
        isHero: images.length === 0,
        file,
      }));
      onChange([...images, ...newImages]);
    },
    [images, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".avif"] },
    maxSize: 10 * 1024 * 1024,
  });

  const removeImage = (index: number) => {
    const removed = images[index];
    if (removed.file) URL.revokeObjectURL(removed.src);
    const updated = images.filter((_, i) => i !== index);
    // If we removed the hero, set first remaining as hero
    if (updated.length > 0 && !updated.some((img) => img.isHero)) {
      updated[0].isHero = true;
    }
    onChange(updated);
  };

  const setHero = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      isHero: i === index,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, index) => (
          <div
            key={img.id ?? `new-${index}`}
            className={`group relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-300 ${
              img.isHero ? "border-copper shadow-[0_2px_12px_-2px_rgba(196,127,90,0.15)]" : "border-copper/10 hover:border-copper/25"
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={200}
              height={150}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="absolute inset-0 flex items-start justify-end gap-1 bg-black/0 p-1.5 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                onClick={() => setHero(index)}
                title={t("setAsHero")}
              >
                <Star
                  className={`h-3.5 w-3.5 ${img.isHero ? "fill-primary text-primary" : ""}`}
                />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeImage(index)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {img.isHero && (
              <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-copper px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                {t("hero")}
              </span>
            )}
          </div>
        ))}
      </div>

      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
          isDragActive
            ? "border-copper bg-copper/5"
            : "border-copper/20 hover:border-copper/40 hover:bg-copper/[0.02]"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("dragDropImages")}
        </p>
      </div>
    </div>
  );
}
