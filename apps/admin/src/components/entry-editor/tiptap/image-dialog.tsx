"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@tge/ui";

interface ImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string, alt: string) => void;
}

/**
 * URL + alt image insertion. Phase 5 covers drag/drop + paste upload via the
 * Tiptap extension; this dialog stays as the manual-URL fallback for when
 * the source is an existing CDN URL.
 *
 * The Body is keyed on `open` so opening the dialog always presents fresh
 * empty inputs without an effect-driven reset (which the React 19 lint rule
 * flags as cascading state).
 */
export function ImageDialog({
  open,
  onOpenChange,
  onInsert,
}: ImageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
        </DialogHeader>
        {open ? <ImageDialogBody onInsert={onInsert} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ImageDialogBody({
  onInsert,
}: {
  onInsert: (url: string, alt: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="tt-image-url">Image URL</Label>
          <Input
            id="tt-image-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tt-image-alt">Alt text</Label>
          <Input
            id="tt-image-alt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image for screen readers"
            onKeyDown={(e) => {
              if (e.key === "Enter" && url) {
                e.preventDefault();
                onInsert(url, alt);
              }
            }}
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          onClick={() => url && onInsert(url, alt)}
          disabled={!url}
        >
          Insert
        </Button>
      </DialogFooter>
    </>
  );
}
