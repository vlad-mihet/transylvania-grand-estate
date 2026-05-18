"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Heading2,
  Heading3,
  Eraser,
} from "lucide-react";

interface EditorBubbleMenuProps {
  editor: Editor | null;
  onOpenLink: () => void;
}

/**
 * Selection-anchored toolbar. Suppressed inside code blocks (where bold/italic
 * are meaningless) and when the selection is empty.
 *
 * Heading toggles cycle paragraph → H2 → H3 → paragraph rather than expose
 * every level — keeps the bubble short. H1 is reserved for the document
 * title and gets its own slash command.
 */
export function EditorBubbleMenu({
  editor,
  onOpenLink,
}: EditorBubbleMenuProps) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed, from, to }) => {
        if (from === to) return false;
        if (ed.isActive("codeBlock")) return false;
        return true;
      }}
      options={{ placement: "top" }}
    >
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-popover px-1 py-1 shadow-md">
        <BubbleButton
          title="Bold (⌘B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          title="Italic (⌘I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          title="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-3.5 w-3.5" />
        </BubbleButton>
        <Divider />
        <BubbleButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-3.5 w-3.5" />
        </BubbleButton>
        <Divider />
        <BubbleButton title="Link (⌘K)" onClick={onOpenLink}>
          <LinkIcon className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton
          title="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <Eraser className="h-3.5 w-3.5" />
        </BubbleButton>
      </div>
    </BubbleMenu>
  );
}

function BubbleButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
        active
          ? "bg-copper/10 text-copper"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />;
}
