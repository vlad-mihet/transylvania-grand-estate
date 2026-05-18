"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor, Range } from "@tiptap/core";
import { createEditorExtensions } from "./extensions";
import { EditorBubbleMenu } from "./bubble-menu";
import { SlashMenu } from "./slash-menu";
import { LinkDialog } from "./link-dialog";
import { ImageDialog } from "./image-dialog";
import {
  useEntryOutline,
  type OutlineHeading,
} from "../entry-outline-provider";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { LOCALIZED_RICH_TEXT_MAX_LENGTH } from "@tge/types";

export interface EditorCoreProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /**
   * When this token changes, the editor's content is replaced (via setContent
   * + clearHistory). Used by the locale-sync layer to swap content across
   * locales without bleeding undo/redo history between them.
   */
  resetToken: string;
}

/**
 * Inner Tiptap surface — kept in its own file so the entire editor (~280KB
 * gzipped) can be lazy-loaded via `next/dynamic` from `LocalizedTiptapEditor`.
 * Owns: extension wiring, bubble menu, slash menu, link/image dialogs,
 * char-count footer, undo-history scoping on locale change.
 *
 * The parent controls `value` (markdown string). The editor's internal
 * ProseMirror state is the source of truth while focused; on every update
 * we serialize back to markdown via `tiptap-markdown` and emit through
 * `onChange`. External value writes (copy-from-primary, locale swap, autosave
 * conflict reload) flow back in via the value/resetToken reconciliation
 * effects below.
 */
export function EditorCore({
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled,
  resetToken,
}: EditorCoreProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [initialLinkUrl, setInitialLinkUrl] = useState<string | undefined>(
    undefined,
  );

  const outline = useEntryOutline();

  // Refs let the editor's onUpdate / onCreate closures read the latest
  // onChange/outline without re-instantiating the editor on every parent
  // re-render. Writes are scheduled via useEffect (not during render) so
  // the react-hooks/refs rule stays satisfied.
  const onChangeRef = useRef(onChange);
  const outlineRef = useRef(outline);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    outlineRef.current = outline;
  }, [outline]);

  const slashHandler = useCallback(
    ({
      editor,
      range,
      commandId,
    }: {
      editor: Editor;
      range: Range;
      commandId: string;
    }) => {
      const chain = editor.chain().focus().deleteRange(range);

      switch (commandId) {
        case "h1":
          chain.toggleHeading({ level: 1 }).run();
          break;
        case "h2":
          chain.toggleHeading({ level: 2 }).run();
          break;
        case "h3":
          chain.toggleHeading({ level: 3 }).run();
          break;
        case "paragraph":
          chain.setParagraph().run();
          break;
        case "bullet-list":
          chain.toggleBulletList().run();
          break;
        case "numbered-list":
          chain.toggleOrderedList().run();
          break;
        case "task-list":
          chain.toggleTaskList().run();
          break;
        case "blockquote":
          chain.toggleBlockquote().run();
          break;
        case "code-block":
          chain.toggleCodeBlock().run();
          break;
        case "hr":
          chain.setHorizontalRule().run();
          break;
        case "table":
          chain
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
          break;
        case "link":
          chain.run();
          setInitialLinkUrl(undefined);
          setLinkOpen(true);
          break;
        case "image":
          chain.run();
          setImageOpen(true);
          break;
        default:
          chain.run();
      }
    },
    [],
  );

  // `slashHandler` is stabilized via useCallback([], …) above (it only closes
  // over setState setters, which React guarantees are referentially stable)
  // so we can pass it directly into the extension factory without a ref.
  const extensions = useMemo(
    () =>
      createEditorExtensions({
        placeholder,
        onSlashCommand: slashHandler,
        imageUploader: uploadInlineImage,
        onImageUploadError: (err) => {
          const message =
            err instanceof Error
              ? err.message
              : "Image upload failed — please try again";
          toast.error(message);
        },
      }),
    [placeholder, slashHandler],
  );

  const editor = useEditor({
    extensions,
    content: value,
    editable: !disabled,
    // The Next App Router renders client components on the server first;
    // ProseMirror cannot run in SSR. We mount the editor in dynamic({ ssr:
    // false }) but the flag belt-and-braces guards against hydration warnings.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel ?? "Content editor",
        class:
          "tge-tiptap-editor prose prose-sm max-w-none min-h-[260px] outline-none focus:outline-none px-4 py-3",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const md = (ed.storage as { markdown?: { getMarkdown: () => string } })
        .markdown?.getMarkdown();
      if (typeof md === "string") onChangeRef.current(md);
      publishOutline(ed, outlineRef.current.setHeadings);
    },
    onCreate: ({ editor: ed }) => {
      publishOutline(ed, outlineRef.current.setHeadings);
      outlineRef.current.setOnJump((pos: number) => {
        ed.chain().focus(pos).scrollIntoView().run();
      });
    },
    onDestroy: () => {
      outlineRef.current.setHeadings([]);
      outlineRef.current.setOnJump(null);
    },
  });

  // External value reconciliation. When the parent changes `value` (e.g.
  // locale swap, copy-from-primary, autosave conflict reload) we replace
  // editor content — but only when it actually differs from the canonical
  // markdown the editor would emit, so user-typed values don't cause a
  // re-set on every keystroke.
  useEffect(() => {
    if (!editor) return;
    const current = (
      editor.storage as { markdown?: { getMarkdown: () => string } }
    ).markdown?.getMarkdown();
    if (current === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  // Reset undo/redo history when the resetToken changes (locale swap). The
  // value-reconciliation effect above already loaded the new content; we
  // just need to clear the history stack so Cmd+Z doesn't roll across
  // locale boundaries. clearHistory was renamed in Tiptap v3, so go through
  // chain() which exposes both names.
  const lastResetRef = useRef(resetToken);
  useEffect(() => {
    if (!editor) return;
    if (lastResetRef.current === resetToken) return;
    lastResetRef.current = resetToken;
    type ChainWithHistory = ReturnType<Editor["chain"]> & {
      clearHistory?: () => ChainWithHistory;
    };
    const chain = editor.chain() as ChainWithHistory;
    chain.clearHistory?.().run();
  }, [editor, resetToken]);

  // Surface ⌘K to open the link dialog with the currently-selected URL (if
  // any) prefilled. Other ⌘-shortcuts (⌘B/⌘I/⌘Z) are handled by StarterKit.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!editor) return;
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        const existing = editor.getAttributes("link")?.href as
          | string
          | undefined;
        setInitialLinkUrl(existing);
        setLinkOpen(true);
      }
    },
    [editor],
  );

  const insertLink = useCallback(
    (url: string) => {
      if (!editor) return;
      const hasSelection = editor.state.selection.from !== editor.state.selection.to;
      if (hasSelection) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${escapeHref(url)}">${escapeText(url)}</a>`)
          .run();
      }
      setLinkOpen(false);
    },
    [editor],
  );

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }, [editor]);

  const insertImage = useCallback(
    (url: string, alt: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: url, alt: alt || undefined }).run();
      setImageOpen(false);
    },
    [editor],
  );

  const charCount =
    (editor?.storage as { characterCount?: { characters: () => number } })
      ?.characterCount?.characters() ?? 0;
  const charPercent = Math.min(
    100,
    Math.round((charCount / LOCALIZED_RICH_TEXT_MAX_LENGTH) * 100),
  );
  const charWarning = charPercent >= 90;

  return (
    <div
      className="rounded-md border border-border bg-card"
      onKeyDown={handleKeyDown}
    >
      <EditorContent editor={editor} />
      <SlashMenu editor={editor} />
      <EditorBubbleMenu
        editor={editor}
        onOpenLink={() => {
          const existing = editor?.getAttributes("link")?.href as
            | string
            | undefined;
          setInitialLinkUrl(existing);
          setLinkOpen(true);
        }}
      />
      <LinkDialog
        open={linkOpen}
        initialUrl={initialLinkUrl}
        onOpenChange={(o) => {
          setLinkOpen(o);
          if (!o) setInitialLinkUrl(undefined);
        }}
        onInsert={insertLink}
        onRemove={initialLinkUrl ? removeLink : undefined}
      />
      <ImageDialog
        open={imageOpen}
        onOpenChange={setImageOpen}
        onInsert={insertImage}
      />
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-3 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          Type <kbd className="rounded border border-border bg-card px-1">/</kbd>{" "}
          for commands · <kbd className="rounded border border-border bg-card px-1">⌘K</kbd>{" "}
          for link
        </p>
        <p
          className={[
            "mono text-[10px]",
            charWarning ? "text-warning" : "text-muted-foreground",
          ].join(" ")}
          title={`${charCount} of ${LOCALIZED_RICH_TEXT_MAX_LENGTH} characters`}
        >
          {charCount.toLocaleString()} / {LOCALIZED_RICH_TEXT_MAX_LENGTH.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

/**
 * Walk the editor's document collecting every heading node so the outline
 * sidebar can render. Called on every editor update; the provider's
 * `setHeadings` does its own equality bail so we don't flush React state
 * for transactions that don't change the heading set.
 */
function publishOutline(
  editor: Editor,
  setHeadings: (h: OutlineHeading[]) => void,
) {
  const headings: OutlineHeading[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const level = (node.attrs.level as number) ?? 1;
      if (level <= 4) {
        headings.push({
          level: level as 1 | 2 | 3 | 4,
          text: node.textContent || "(untitled)",
          pos,
        });
      }
    }
  });
  setHeadings(headings);
}

/**
 * Multipart upload of a single inline image. Returns the persisted public
 * URL the editor inserts as an `<img src>`. Module-level so the extension
 * factory's referential identity is stable — `useMemo` on it would
 * otherwise rebuild the entire extension array on every editor re-render.
 */
async function uploadInlineImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const result = await apiClient<{ url: string }>(
    "/admin/uploads/inline-images",
    { method: "POST", body: fd },
  );
  return result.url;
}

function escapeHref(url: string): string {
  return url.replace(/"/g, "&quot;");
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default EditorCore;
