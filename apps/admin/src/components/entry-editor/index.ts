export {
  EntryLocaleProvider,
  useEntryLocale,
} from "./entry-locale-provider";
export { EntryLocaleSwitcher } from "./entry-locale-switcher";
export { EntryEditorShell } from "./entry-editor-shell";
export {
  EntryOutlineProvider,
  useEntryOutline,
  type OutlineHeading,
} from "./entry-outline-provider";
export { OutlineSidebar } from "./outline-sidebar";
export { useAutosave, type AutosaveState } from "./use-autosave";
export { SaveStatusIndicator } from "./save-status-indicator";
export {
  MetaField,
  MetaSection,
  type MetaFieldProps,
  type MetaSectionProps,
} from "./meta-field";
export { LocalizedInput } from "./localized-input";
export { LocalizedTextarea } from "./localized-textarea";
export { LocalizedTiptapEditor } from "./localized-tiptap-editor";
export { useLocaleCompleteness } from "./use-locale-completeness";
export {
  LOCALE_KEYS,
  LOCALE_LABELS,
  PRIMARY_LOCALE,
  isFilled,
  isLocaleKey,
  type LocaleKey,
  type LocaleStatus,
  type LocaleCompleteness,
  type LocaleErrorCounts,
} from "./types";
export type { LocalizedInputProps } from "./localized-input";
export type { LocalizedTextareaProps } from "./localized-textarea";
export type { LocalizedTiptapEditorProps } from "./localized-tiptap-editor";
export type { EntryEditorShellProps } from "./entry-editor-shell";

// Info-rail cards — compose into EntryEditorShell's `infoRail` slot.
export {
  InfoCard,
  InfoRow,
  StatusCard,
  LocaleMatrixCard,
  ActivityCard,
  ActionsCard,
  ReferencesCard,
  type StatusCardProps,
  type StatusTone,
  type LocaleMatrixCardProps,
  type ActivityCardProps,
  type ActionsCardProps,
  type InfoRailAction,
  type ReferencesCardProps,
  type ReferenceLink,
} from "./info-rail";
