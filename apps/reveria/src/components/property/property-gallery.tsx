"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { PropertyImage, Locale } from "@tge/types";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@tge/ui";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn, localize } from "@tge/utils";

interface PropertyGalleryProps {
  images: PropertyImage[];
}

export function PropertyGallery({ images }: PropertyGalleryProps) {
  const locale = useLocale() as Locale;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const heroImage = images.find((img) => img.isHero) || images[0];
  const thumbnails = images.filter((img) => !img.isHero).slice(0, 4);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(3, prev + 0.5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    resetZoom();
  }, [images.length, resetZoom]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    resetZoom();
  }, [images.length, resetZoom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    },
    [goPrev, goNext, zoomIn, zoomOut, resetZoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      setZoom((prev) => {
        const next = Math.min(3, Math.max(1, prev + delta));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    },
    []
  );

  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      resetZoom();
    }
  }, [zoom, resetZoom]);

  const openLightboxAt = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const thumbCount = thumbnails.length;
  const gridColsClass =
    thumbCount === 1 ? "grid-cols-1 md:grid-cols-3"
    : thumbCount === 2 ? "grid-cols-2 md:grid-cols-3"
    : "grid-cols-2 md:grid-cols-4";
  const thumbSingleClass =
    thumbCount === 1
      ? "aspect-[4/3] md:aspect-auto md:h-full"
      : "aspect-[4/3]";

  return (
    <>
      {thumbCount === 0 ? (
        <div
          className="relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer"
          onClick={() => openLightboxAt(0)}
        >
          <Image
            src={heroImage.src}
            alt={localize(heroImage.alt, locale)}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      ) : (
        <div className={cn("grid gap-2", gridColsClass)}>
          <div
            className={cn(
              "relative rounded-xl overflow-hidden cursor-pointer aspect-[4/3]",
              thumbCount === 1 ? "md:col-span-2" : "col-span-2 md:row-span-2",
            )}
            onClick={() => openLightboxAt(0)}
          >
            <Image
              src={heroImage.src}
              alt={localize(heroImage.alt, locale)}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 66vw"
            />
          </div>
          {thumbnails.map((img, index) => (
            <div
              key={index}
              className={cn(
                "relative rounded-xl overflow-hidden cursor-pointer",
                thumbSingleClass,
              )}
              onClick={() => openLightboxAt(index + 1)}
            >
              <Image
                src={img.src}
                alt={localize(img.alt, locale)}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/90"
          className="sm:max-w-none max-w-none top-0 left-0 translate-x-0 translate-y-0 w-screen h-[100dvh] rounded-none border-0 bg-transparent p-0 shadow-none gap-0 flex flex-col data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">
            {localize(images[currentIndex].alt, locale)}
          </DialogTitle>

          <DialogClose className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-sm border border-border text-foreground hover:bg-background/80 hover:text-primary transition-all duration-300 cursor-pointer">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="absolute top-4 left-4 z-10 flex items-center rounded-full bg-background/60 backdrop-blur-sm border border-border">
            <button
              onClick={zoomOut}
              disabled={zoom === 1}
              aria-label="Zoom out"
              className="w-9 h-9 flex items-center justify-center text-foreground hover:text-primary transition-colors duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-foreground text-xs font-medium border-x border-border leading-9 select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom === 3}
              aria-label="Zoom in"
              className="w-9 h-9 flex items-center justify-center text-foreground hover:text-primary transition-colors duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={resetZoom}
              disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
              aria-label="Reset zoom"
              className="w-9 h-9 flex items-center justify-center text-foreground hover:text-primary transition-colors duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-l border-border"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-border">
            <span className="text-foreground text-sm font-medium tracking-wide">
              {currentIndex + 1} / {images.length}
            </span>
          </div>

          <div
            className="flex-1 relative flex items-center justify-center min-h-0 overflow-hidden"
            onWheel={handleWheel}
          >
            <div
              className={cn(
                "relative w-full h-full px-16 md:px-20 py-16",
                !isDragging && "transition-transform duration-200",
                zoom > 1
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-default"
              )}
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
            >
              <Image
                src={images[currentIndex].src}
                alt={localize(images[currentIndex].alt, locale)}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {images.length > 1 && (
              <button
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-sm border border-border text-foreground hover:bg-background/80 hover:text-primary transition-all duration-300 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}

            {images.length > 1 && (
              <button
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-sm border border-border text-foreground hover:bg-background/80 hover:text-primary transition-all duration-300 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="h-20 md:h-24 bg-background/60 backdrop-blur-sm border-t border-border flex items-center justify-center gap-2 px-4 overflow-x-auto flex-shrink-0">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    resetZoom();
                  }}
                  aria-label={`View image ${index + 1}`}
                  className={cn(
                    "relative h-14 md:h-16 w-20 md:w-24 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-300 cursor-pointer",
                    index === currentIndex
                      ? "border-primary opacity-100 ring-1 ring-primary/30"
                      : "border-transparent opacity-40 hover:opacity-70"
                  )}
                >
                  <Image
                    src={img.src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
