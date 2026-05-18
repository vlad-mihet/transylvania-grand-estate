import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

/**
 * Slash command catalogue surfaced in the popover. Stable IDs let the React
 * menu dispatch via a switch on `commandId`. The slash extension itself is
 * concerned only with detecting "/" + query and delegating; the actual
 * block-mutating commands live in `editor-core.tsx`'s slashHandler.
 */
export interface SlashItem {
  id: string;
  label: string;
  hint?: string;
}

export const SLASH_ITEMS: SlashItem[] = [
  { id: "h1", label: "Heading 1", hint: "Big section title" },
  { id: "h2", label: "Heading 2", hint: "Medium section title" },
  { id: "h3", label: "Heading 3", hint: "Small section title" },
  { id: "paragraph", label: "Paragraph", hint: "Plain text" },
  { id: "bullet-list", label: "Bulleted list", hint: "• item" },
  { id: "numbered-list", label: "Numbered list", hint: "1. item" },
  { id: "task-list", label: "Task list", hint: "☐ todo" },
  { id: "blockquote", label: "Quote", hint: "> quoted text" },
  { id: "code-block", label: "Code block", hint: "Monospace block" },
  { id: "hr", label: "Divider", hint: "Horizontal rule" },
  { id: "link", label: "Link", hint: "Insert a URL" },
  { id: "image", label: "Image", hint: "Insert an image" },
  { id: "table", label: "Table", hint: "3×3 grid" },
];

export type SlashCommandHandler = (args: {
  editor: Editor;
  range: Range;
  commandId: string;
}) => void;

export interface SlashRenderState {
  open: boolean;
  query: string;
  items: SlashItem[];
  range: Range | null;
  clientRect: (() => DOMRect | null) | null;
  /**
   * The suggestion plugin's `command` callback. Calling this with `{ id }`
   * deletes the "/" trigger text and invokes the extension's command option
   * (which delegates to the configured handler).
   */
  pick: ((item: { id: string }) => void) | null;
  /** Arrow / Enter / Esc passthrough used to keep the menu cmdk-driven. */
  onKeyDown:
    | ((event: KeyboardEvent) => boolean)
    | null;
}

const INITIAL_STATE: SlashRenderState = {
  open: false,
  query: "",
  items: SLASH_ITEMS,
  range: null,
  clientRect: null,
  pick: null,
  onKeyDown: null,
};

export type SlashListener = (state: SlashRenderState) => void;

interface SlashStorage {
  state: SlashRenderState;
  listener: SlashListener | null;
  setListener: (listener: SlashListener | null) => void;
}

/**
 * Tiptap extension wiring up "/" slash commands. Detection is delegated to
 * `@tiptap/suggestion`; the popover is rendered by a React sibling that
 * subscribes via `editor.storage.slashCommands.setListener`. When the React
 * menu picks an item it calls `state.pick({ id })` which invokes the
 * suggestion's own `command` callback (which deletes the "/" trigger range
 * before our handler runs).
 */
export function createSlashExtension(handler?: SlashCommandHandler) {
  return Extension.create<{
    handler?: SlashCommandHandler;
  }>({
    name: "slashCommands",

    addOptions() {
      return { handler };
    },

    addStorage(): SlashStorage {
      return {
        state: { ...INITIAL_STATE },
        listener: null,
        setListener(listener: SlashListener | null) {
          this.listener = listener;
        },
      };
    },

    addProseMirrorPlugins() {
      // Capture lazy accessors so the `Suggestion` callbacks don't need to
      // alias `this` (which the no-this-alias lint rule rejects). The
      // accessors read live each invocation so reconfigure() takes effect.
      const getStorage = () => this.storage as SlashStorage;
      const getHandler = () => this.options.handler;
      const emit = (next: SlashRenderState) => {
        const storage = getStorage();
        storage.state = next;
        storage.listener?.(next);
      };

      return [
        Suggestion<SlashItem, { id: string }>({
          editor: this.editor,
          char: "/",
          allowSpaces: false,
          startOfLine: false,
          items: ({ query }) => {
            const q = query.toLowerCase().trim();
            return q
              ? SLASH_ITEMS.filter((i) =>
                  (i.label + " " + (i.hint ?? "")).toLowerCase().includes(q),
                )
              : SLASH_ITEMS;
          },
          command: ({ editor, range, props }) => {
            const commandId = props.id;
            if (commandId) {
              getHandler()?.({ editor, range, commandId });
            }
          },
          render: () => {
            return {
              onStart: (props) => {
                emit({
                  open: true,
                  query: props.query,
                  items: props.items,
                  range: props.range,
                  clientRect: props.clientRect ?? null,
                  pick: props.command,
                  onKeyDown: null,
                });
              },
              onUpdate: (props) => {
                emit({
                  open: true,
                  query: props.query,
                  items: props.items,
                  range: props.range,
                  clientRect: props.clientRect ?? null,
                  pick: props.command,
                  onKeyDown: null,
                });
              },
              onKeyDown: ({ event }) => {
                return getStorage().state.onKeyDown?.(event) ?? false;
              },
              onExit: () => {
                emit({ ...INITIAL_STATE });
              },
            };
          },
        }),
      ];
    },
  });
}
