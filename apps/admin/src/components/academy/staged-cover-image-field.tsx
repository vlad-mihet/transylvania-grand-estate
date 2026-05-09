"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Button } from "@tge/ui";
import { ImagePlus, Trash2, Upload } from "lucide-react";

interface StagedCoverImageFieldProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

/**
 * Create-mode counterpart of `CoverImageField`. Holds the picked image in
 * local form state without hitting the API; the create page uploads it
 * after the parent resource (course) has been persisted, then redirects
 * into edit mode where the live uploader takes over.
 */
export function StagedCoverImageField({
  file,
  onFileChange,
}: StagedCoverImageFieldProps) {
  const [dragError, setDragError] = useState<string | null>(null);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setDragError(null);
      if (rejected.length > 0) {
        setDragError(rejected[0]?.errors[0]?.message ?? "File rejected");
        return;
      }
      const [next] = accepted;
      if (!next) return;
      onFileChange(next);
    },
    [onFileChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/avif": [".avif"],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  if (file && previewUrl) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Cover preview"
          className="h-32 w-56 rounded-md border border-border object-cover"
        />
        <div className="flex flex-col gap-2">
          <div
            {...getRootProps({
              className:
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted",
            })}
          >
            <input {...getInputProps()} />
            <Upload className="h-3.5 w-3.5" />
            Replace image
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onFileChange(null)}
            className="text-[var(--color-danger)]"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
          {dragError ? (
            <p className="text-xs text-[var(--color-danger)]">{dragError}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps({
          className: `flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-8 text-center transition cursor-pointer ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:bg-muted"
          }`,
        })}
      >
        <input {...getInputProps()} />
        <ImagePlus className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop to stage" : "Drop or click to choose a file"}
        </p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP, or AVIF · up to 5 MB · uploads after the course is created
        </p>
      </div>
      {dragError ? (
        <p className="mt-2 text-xs text-[var(--color-danger)]">{dragError}</p>
      ) : null}
    </div>
  );
}
