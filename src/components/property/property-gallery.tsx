"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { PropertyImage, Locale } from "@/types/property";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyGalleryProps {
  images: PropertyImage[];
}

export function PropertyGallery({ images }: PropertyGalleryProps) {
  const locale = useLocale() as Locale;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const heroImage = images.find((img) => img.isHero) || images[0];
  const thumbnails = images.filter((img) => !img.isHero).slice(0, 4);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
        <div
          className="md:col-span-2 md:row-span-2 relative aspect-[4/3] md:aspect-auto md:h-full rounded-xl overflow-hidden cursor-pointer"
          onClick={() => {
            setCurrentIndex(0);
            setLightboxOpen(true);
          }}
        >
          <Image
            src={heroImage.src}
            alt={heroImage.alt[locale]}
            fill
            className="object-cover hover:scale-105 transition-transform duration-500"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        {thumbnails.map((img, index) => (
          <div
            key={index}
            className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer"
            onClick={() => {
              setCurrentIndex(index + 1);
              setLightboxOpen(true);
            }}
          >
            <Image
              src={img.src}
              alt={img.alt[locale]}
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        ))}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl bg-background/95 backdrop-blur-xl border-copper/10 p-2 md:p-4">
          <div className="relative aspect-[16/10]">
            <Image
              src={images[currentIndex].src}
              alt={images[currentIndex].alt[locale]}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
          <button
            onClick={() =>
              setCurrentIndex(
                (currentIndex - 1 + images.length) % images.length
              )
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 border border-copper/20 text-copper hover:bg-copper/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() =>
              setCurrentIndex((currentIndex + 1) % images.length)
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 border border-copper/20 text-copper hover:bg-copper/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="text-center text-cream-muted text-sm mt-2">
            {currentIndex + 1} / {images.length}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
