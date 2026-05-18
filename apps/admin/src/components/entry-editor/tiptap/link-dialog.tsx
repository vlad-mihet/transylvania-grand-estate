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

interface LinkDialogProps {
  open: boolean;
  initialUrl?: string;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string) => void;
  onRemove?: () => void;
}

/**
 * URL-only link insertion. The selected text in the editor is the link's
 * display text — if nothing's selected the dialog still creates a link node
 * whose text matches the URL (handled by the caller in editor-core).
 *
 * When `initialUrl` is provided the dialog is in "edit existing link" mode
 * and exposes a Remove affordance via `onRemove`.
 *
 * The dialog's input is rebound via `key` whenever `initialUrl` changes —
 * cleaner than seeding internal state in a useEffect (which the react-hooks
 * lint rule flags as a cascading render anti-pattern). When closed, the
 * component is fully unmounted by the parent's `open` state so no manual
 * reset is needed.
 */
export function LinkDialog({
  open,
  initialUrl,
  onOpenChange,
  onInsert,
  onRemove,
}: LinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialUrl ? "Edit link" : "Insert link"}</DialogTitle>
        </DialogHeader>
        <LinkDialogBody
          key={initialUrl ?? ""}
          initialUrl={initialUrl ?? ""}
          onInsert={onInsert}
          onRemove={initialUrl ? onRemove : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}

interface LinkDialogBodyProps {
  initialUrl: string;
  onInsert: (url: string) => void;
  onRemove?: () => void;
}

function LinkDialogBody({
  initialUrl,
  onInsert,
  onRemove,
}: LinkDialogBodyProps) {
  // `useState` initializer runs once per mount; the parent passes a fresh
  // `key` whenever `initialUrl` changes so this state is re-initialized
  // without any effect-driven setState dance.
  const [url, setUrl] = useState(initialUrl);

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="tt-link-url">URL</Label>
          <Input
            id="tt-link-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && url) {
                e.preventDefault();
                onInsert(url);
              }
            }}
          />
        </div>
      </div>
      <DialogFooter>
        {initialUrl && onRemove ? (
          <Button
            variant="outline"
            type="button"
            onClick={onRemove}
            className="mr-auto"
          >
            Remove link
          </Button>
        ) : null}
        <DialogClose asChild>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          onClick={() => url && onInsert(url)}
          disabled={!url}
        >
          {initialUrl ? "Save" : "Insert"}
        </Button>
      </DialogFooter>
    </>
  );
}
