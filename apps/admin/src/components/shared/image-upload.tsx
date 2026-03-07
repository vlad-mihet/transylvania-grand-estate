"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { Button } from "@tge/ui";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface ImageUploadProps {
  value?: string | null;
  onChange: (file: File | null) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const t = useTranslations("Common");

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (file) {
        onChange(file);
        setPreview(URL.createObjectURL(file));
      }
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".avif"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const displaySrc = preview || value;

  const clear = () => {
    onChange(null);
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium">{label}</p>
      )}
      {displaySrc ? (
        <div className="relative w-fit">
          <Image
            src={displaySrc}
            alt="Preview"
            width={200}
            height={200}
            className="rounded-xl border border-copper/15 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={clear}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
            isDragActive
              ? "border-copper bg-copper/5 shadow-[0_0_20px_-4px_rgba(196,127,90,0.15)]"
              : "border-copper/20 hover:border-copper/40 hover:bg-copper/[0.02]"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mb-2 h-8 w-8 text-copper/40" />
          <p className="text-sm text-muted-foreground">
            {t("dragDrop")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("fileFormats")}
          </p>
        </div>
      )}
    </div>
  );
}
