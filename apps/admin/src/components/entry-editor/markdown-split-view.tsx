"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
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
import { MarkdownView } from "@tge/ui";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  Heading2,
  Eye,
  Pencil,
} from "lucide-react";
import {
  blockquote,
  bold,
  bulletList,
  heading,
  inlineCode,
  insertImage,
  insertLink,
  italic,
  numberedList,
  type EditorState,
} from "./markdown-editor-actions";

type ViewMode = "write" | "preview";

export interface MarkdownSplitViewProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  /** Optional id for the underlying textarea — used by labels in shells. */
  id?: string;
  ariaLabel?: string;
}

export function MarkdownSplitView({
  value,
  onChange,
  placeholder,
  rows = 14,
  id,
  ariaLabel,
}: MarkdownSplitViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mobileView, setMobileView] = useState<ViewMode>("write");
  const [linkDialog, setLinkDialog] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);
  const deferredValue = useDeferredValue(value);

  /**
   * Pending selection from a toolbar action — applied after the controlled
   * textarea re-renders with the new value, so the cursor lands where the
   * user expects (most common DIY-toolbar bug).
   */
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  useEffect(() => {
    if (!textareaRef.current || !pendingSelection.current) return;
    const { start, end } = pendingSelection.current;
    textareaRef.current.setSelectionRange(start, end);
    textareaRef.current.focus();
    pendingSelection.current = null;
  }, [value]);

  const apply = useCallback(
    (transform: (s: EditorState) => EditorState) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const next = transform({
        value,
        selStart: ta.selectionStart,
        selEnd: ta.selectionEnd,
      });
      pendingSelection.current = { start: next.selStart, end: next.selEnd };
      onChange(next.value);
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        apply(bold);
      } else if (key === "i") {
        e.preventDefault();
        apply(italic);
      } else if (key === "k") {
        e.preventDefault();
        setLinkDialog(true);
      }
    },
    [apply],
  );

  return (
    <div className="rounded-md border border-border bg-card">
      <Toolbar
        onAction={apply}
        onLink={() => setLinkDialog(true)}
        onImage={() => setImageDialog(true)}
        mobileView={mobileView}
        setMobileView={setMobileView}
      />
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div
          className={[
            "border-b border-border md:border-b-0 md:border-r",
            mobileView === "write" ? "block" : "hidden md:block",
          ].join(" ")}
        >
          <textarea
            ref={textareaRef}
            id={id}
            aria-label={ariaLabel}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            spellCheck
            className="w-full resize-y bg-transparent p-3 font-mono text-[13px] leading-relaxed outline-none focus:ring-0"
          />
        </div>
        <div
          className={[
            "max-h-[640px] overflow-auto p-4",
            mobileView === "preview" ? "block" : "hidden md:block",
          ].join(" ")}
          aria-label="Preview"
        >
          {deferredValue.trim() ? (
            <MarkdownView proseSize="sm" className="prose-admin">
              {deferredValue}
            </MarkdownView>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nothing to preview yet — write some markdown on the left.
            </p>
          )}
        </div>
      </div>

      <LinkDialog
        open={linkDialog}
        onOpenChange={setLinkDialog}
        onInsert={(url, text) => {
          apply((s) => insertLink(s, url, text));
          setLinkDialog(false);
        }}
      />
      <ImageDialog
        open={imageDialog}
        onOpenChange={setImageDialog}
        onInsert={(url, alt) => {
          apply((s) => insertImage(s, url, alt));
          setImageDialog(false);
        }}
      />
    </div>
  );
}

interface ToolbarProps {
  onAction: (transform: (s: EditorState) => EditorState) => void;
  onLink: () => void;
  onImage: () => void;
  mobileView: ViewMode;
  setMobileView: (m: ViewMode) => void;
}

function Toolbar({
  onAction,
  onLink,
  onImage,
  mobileView,
  setMobileView,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-0.5">
        <ToolbarButton title="Heading" onClick={() => onAction(heading(2))}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Bold (Ctrl+B)" onClick={() => onAction(bold)}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic (Ctrl+I)" onClick={() => onAction(italic)}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton title="Link (Ctrl+K)" onClick={onLink}>
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Image" onClick={onImage}>
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton title="Bulleted list" onClick={() => onAction(bulletList)}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          onClick={() => onAction(numberedList)}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Blockquote" onClick={() => onAction(blockquote)}>
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Inline code" onClick={() => onAction(inlineCode)}>
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <div className="md:hidden inline-flex rounded-sm border border-border bg-card p-0.5">
        <ViewToggle
          active={mobileView === "write"}
          onClick={() => setMobileView("write")}
          icon={<Pencil className="h-3 w-3" />}
          label="Write"
        />
        <ViewToggle
          active={mobileView === "preview"}
          onClick={() => setMobileView("preview")}
          icon={<Eye className="h-3 w-3" />}
          label="Preview"
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />;
}

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em]",
        active ? "bg-copper/10 text-copper" : "text-muted-foreground",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string, text: string) => void;
}

function LinkDialog({ open, onOpenChange, onInsert }: LinkDialogProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setUrl("");
      setText("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert link</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="md-link-url">URL</Label>
            <Input
              id="md-link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="md-link-text">Text (optional)</Label>
            <Input
              id="md-link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text — defaults to selection or 'link'"
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
            onClick={() => url && onInsert(url, text || url)}
            disabled={!url}
          >
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string, alt: string) => void;
}

function ImageDialog({ open, onOpenChange, onInsert }: ImageDialogProps) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setUrl("");
      setAlt("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="md-image-url">Image URL</Label>
            <Input
              id="md-image-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="md-image-alt">Alt text</Label>
            <Input
              id="md-image-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers"
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
      </DialogContent>
    </Dialog>
  );
}
