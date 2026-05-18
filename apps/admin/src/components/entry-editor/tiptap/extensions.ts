import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { Typography } from "@tiptap/extension-typography";
import { Markdown } from "tiptap-markdown";
import type { Extensions } from "@tiptap/core";
import type { SlashCommandHandler } from "./slash-extension";
import { createSlashExtension } from "./slash-extension";
import {
  ImageUploadExtension,
  type ImageUploader,
} from "./image-upload-extension";
import { LOCALIZED_RICH_TEXT_MAX_LENGTH } from "@tge/types";

export interface ExtensionOptions {
  placeholder?: string;
  /** Soft character-count limit surfaced in the status bar. */
  characterLimit?: number;
  /** Handler invoked with editor + range when the slash menu picks a command. */
  onSlashCommand?: SlashCommandHandler;
  /**
   * File uploader for paste/drop. Returns the persisted public URL. When
   * `null`, paste/drop falls through to default behavior (no upload).
   */
  imageUploader?: ImageUploader | null;
  /** Error sink for failed uploads (toast in the React layer). */
  onImageUploadError?: (err: unknown) => void;
}

/**
 * Tiptap extension stack used by the entry editor. Configured to:
 *   - parse/serialize markdown (GFM-aware) with HTML escape hatches preserved
 *   - support links, images, tables, task lists, typography niceties
 *   - render a placeholder when empty
 *   - count characters against the schema cap so editors get a soft warning
 *     before the server-side validator rejects them
 *   - emit a slash-command suggestion stream consumed by the slash menu
 */
export function createEditorExtensions(
  options: ExtensionOptions = {},
): Extensions {
  const characterLimit =
    options.characterLimit ?? LOCALIZED_RICH_TEXT_MAX_LENGTH;

  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      codeBlock: { HTMLAttributes: { class: "tge-code-block" } },
      bulletList: { HTMLAttributes: { class: "tge-bullet-list" } },
      orderedList: { HTMLAttributes: { class: "tge-ordered-list" } },
      blockquote: { HTMLAttributes: { class: "tge-blockquote" } },
      horizontalRule: { HTMLAttributes: { class: "tge-hr" } },
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      protocols: ["http", "https", "mailto", "tel"],
      HTMLAttributes: {
        class: "tge-link",
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: "tge-image" },
    }),
    Placeholder.configure({
      placeholder: options.placeholder ?? "Start writing — type / for commands",
      emptyEditorClass: "is-editor-empty",
      includeChildren: false,
    }),
    CharacterCount.configure({ limit: characterLimit }),
    TaskList.configure({ HTMLAttributes: { class: "tge-task-list" } }),
    TaskItem.configure({
      HTMLAttributes: { class: "tge-task-item" },
      nested: true,
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: "tge-table" },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Typography,
    Markdown.configure({
      // GFM tables / task lists / strikethrough — matches what MarkdownView
      // renders on the public side via remark-gfm.
      transformPastedText: true,
      transformCopiedText: true,
      // html: true preserves block-level HTML escape hatches authors already
      // rely on (<details>, <iframe>, <figure> markup, etc.). Inline HTML
      // mid-paragraph round-trips on a best-effort basis.
      html: true,
      tightLists: true,
      tightListClass: "tight",
      bulletListMarker: "-",
      linkify: true,
      breaks: true,
    }),
    createSlashExtension(options.onSlashCommand),
    ImageUploadExtension.configure({
      uploader: options.imageUploader ?? null,
      onError: options.onImageUploadError,
    }),
  ];
}
