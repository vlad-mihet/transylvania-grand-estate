/**
 * Pure helpers for the markdown editor toolbar. Each action receives the
 * current textarea value + selection and returns the next value + selection,
 * so the caller can apply them and restore the cursor.
 */

export interface EditorState {
  value: string;
  selStart: number;
  selEnd: number;
}

function inlineWrap(state: EditorState, marker: string): EditorState {
  const { value, selStart, selEnd } = state;
  const selected = value.slice(selStart, selEnd);
  const before = value.slice(0, selStart);
  const after = value.slice(selEnd);
  const placeholder = selected || "text";
  const next = `${before}${marker}${placeholder}${marker}${after}`;
  return {
    value: next,
    selStart: before.length + marker.length,
    selEnd: before.length + marker.length + placeholder.length,
  };
}

function prefixLines(state: EditorState, prefix: string): EditorState {
  const { value, selStart, selEnd } = state;
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const before = value.slice(0, lineStart);
  const block = value.slice(lineStart, selEnd);
  const after = value.slice(selEnd);
  const lines = block.length === 0 ? [""] : block.split("\n");
  const prefixed = lines.map((line) => `${prefix}${line}`).join("\n");
  const added = prefix.length * lines.length;
  const next = `${before}${prefixed}${after}`;
  return {
    value: next,
    selStart: selStart + prefix.length,
    selEnd: selEnd + added,
  };
}

export const bold = (s: EditorState) => inlineWrap(s, "**");
export const italic = (s: EditorState) => inlineWrap(s, "*");
export const inlineCode = (s: EditorState) => inlineWrap(s, "`");
export const heading = (level: 1 | 2 | 3) => (s: EditorState) =>
  prefixLines(s, `${"#".repeat(level)} `);
export const bulletList = (s: EditorState) => prefixLines(s, "- ");
export const numberedList = (s: EditorState) => prefixLines(s, "1. ");
export const blockquote = (s: EditorState) => prefixLines(s, "> ");

export function insertLink(
  state: EditorState,
  url: string,
  text?: string,
): EditorState {
  const { value, selStart, selEnd } = state;
  const selected = value.slice(selStart, selEnd);
  const linkText = text ?? selected ?? "link";
  const before = value.slice(0, selStart);
  const after = value.slice(selEnd);
  const inserted = `[${linkText}](${url})`;
  const next = `${before}${inserted}${after}`;
  return {
    value: next,
    selStart: before.length + inserted.length,
    selEnd: before.length + inserted.length,
  };
}

export function insertImage(
  state: EditorState,
  url: string,
  alt: string,
): EditorState {
  const { value, selStart } = state;
  const before = value.slice(0, selStart);
  const after = value.slice(selStart);
  const inserted = `![${alt}](${url})`;
  const next = `${before}${inserted}${after}`;
  return {
    value: next,
    selStart: before.length + inserted.length,
    selEnd: before.length + inserted.length,
  };
}

export function codeBlock(state: EditorState, language = ""): EditorState {
  const { value, selStart, selEnd } = state;
  const selected = value.slice(selStart, selEnd);
  const before = value.slice(0, selStart);
  const after = value.slice(selEnd);
  const fence = `\`\`\`${language}\n${selected || "code"}\n\`\`\``;
  const next = `${before}${fence}${after}`;
  return {
    value: next,
    selStart: before.length + fence.length,
    selEnd: before.length + fence.length,
  };
}
