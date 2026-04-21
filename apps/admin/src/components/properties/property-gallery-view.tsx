"use client";

import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/shared/section-card";
import {
  ImageGalleryManager,
  type GalleryImage,
} from "@/components/shared/image-gallery-manager";

interface PropertyGalleryViewProps {
  images: GalleryImage[];
}

export function PropertyGalleryView({ images }: PropertyGalleryViewProps) {
  const t = useTranslations("PropertyForm");

  if (images.length === 0) {
    return (
      <SectionCard title={t("images")}>
        <p className="text-sm text-muted-foreground">{t("noImages")}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t("images")}>
      <ImageGalleryManager images={images} readOnly />
    </SectionCard>
  );
}
