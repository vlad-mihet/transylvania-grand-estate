"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface CoverImageFieldProps {
  courseId: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
}

/**
 * Upload / replace / clear a course cover. Wraps react-dropzone with a
 * multipart POST to the academy uploads endpoint. Calls `onChange` with
 * the new public URL after a successful upload so the parent form's
 * `coverImage` field stays in sync — save-on-upload semantics, since the
 * backend has already persisted the URL; the form's submit just covers
 * the rest of the course metadata.
 */
export function CoverImageField({
  courseId,
  value,
  onChange,
}: CoverImageFieldProps) {
  const [dragError, setDragError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return apiClient<{
        course: { coverImage: string | null };
        upload: { publicUrl: string };
      }>(`/admin/academy/courses/${courseId}/cover-image`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (res) => {
      onChange(res.course.coverImage ?? res.upload.publicUrl);
      toast.success("Cover image updated");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
    },
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      apiClient(`/admin/academy/courses/${courseId}/cover-image`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      onChange(null);
      toast.success("Cover image removed");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Delete failed"),
  });

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setDragError(null);
      if (rejected.length > 0) {
        setDragError(rejected[0]?.errors[0]?.message ?? "File rejected");
        return;
      }
      const [file] = accepted;
      if (!file) return;
      uploadMutation.mutate(file);
    },
    [uploadMutation],
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
    disabled: uploadMutation.isPending || clearMutation.isPending,
  });

  if (value) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Course cover"
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
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Replace image
              </>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending || uploadMutation.isPending}
            className="text-[var(--color-danger)]"
          >
            {clearMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Removing…
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </>
            )}
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
          className: `flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-8 text-center transition ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:bg-muted"
          } ${uploadMutation.isPending ? "pointer-events-none opacity-70" : "cursor-pointer"}`,
        })}
      >
        <input {...getInputProps()} />
        {uploadMutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">Uploading…</p>
          </>
        ) : (
          <>
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragActive ? "Drop to upload" : "Drop or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or AVIF · up to 5 MB
            </p>
          </>
        )}
      </div>
      {dragError ? (
        <p className="mt-2 text-xs text-[var(--color-danger)]">{dragError}</p>
      ) : null}
    </div>
  );
}
