"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { usePermissions } from "@/components/auth/auth-provider";
import { useRouter } from "@/i18n/navigation";
import { isPathAllowedForAgent } from "@/lib/agent-paths";
import {
  COMMAND_ACTIONS,
  type CommandAction,
  type CommandGroup,
} from "@/components/command-palette/actions";
import {
  DynamicActionsProvider,
  useDynamicActions,
} from "@/components/command-palette/dynamic-actions-context";
import { Kbd } from "@/components/shared/mono";
import { cn } from "@tge/utils";

interface PaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo<PaletteContextValue>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
    }),
    [open],
  );
  return (
    <PaletteContext.Provider value={value}>
      <DynamicActionsProvider>
        {children}
        <CommandPalette />
      </DynamicActionsProvider>
    </PaletteContext.Provider>
  );
}

export function useCommandPalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx)
    throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return ctx;
}

const GROUP_ORDER: CommandGroup[] = [
  "context",
  "navigate",
  "create",
  "finance",
  "system",
];

function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { can, role } = usePermissions();
  const t = useTranslations("CommandPalette");

  // Global ⌘K / Ctrl+K toggle. Listens regardless of focused element, matching
  // the YC-style everywhere-available palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isModK =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === "k" || e.key === "K");
      if (isModK) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const dynamic = useDynamicActions();

  const actions = useMemo<CommandAction[]>(() => {
    // Static actions come first in the merged list, then dynamic. The
    // GROUP_ORDER below floats the `context` group to the top regardless,
    // so contextual entries (e.g. lessons of the current course) lead.
    return [...COMMAND_ACTIONS, ...dynamic].filter((a) => {
      // Permission gate.
      if (a.requires && !can(a.requires)) return false;
      // Reachability gate for AGENT — read perms (e.g. `inquiry.read`,
      // `property.read`) cross roles, but the bare admin list pages those
      // entries link to are blocked by AuthGuard's allowlist. Hiding the
      // unreachable items prevents the palette → /403 dead-end the user
      // would otherwise hit. AGENT-specific entries (My Listings / My
      // Inquiries / Profile) are gated on `agent.read-self` and remain
      // visible because their hrefs ARE in AGENT_ALLOWED_PREFIXES.
      if (role === "AGENT" && !isPathAllowedForAgent(a.href)) return false;
      return true;
    });
  }, [can, role, dynamic]);

  const grouped = useMemo(() => {
    const map = new Map<CommandGroup, CommandAction[]>();
    for (const a of actions) {
      const list = map.get(a.group) ?? [];
      list.push(a);
      map.set(a.group, list);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g)!,
    }));
  }, [actions]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      // Next intl navigation typed route — cast is safe since hrefs are the
      // same typed template literals the sidebar uses.
      router.push(href as Parameters<typeof router.push>[0]);
    },
    [router, setOpen],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className={cn(
        "fixed left-1/2 top-[15vh] z-50 w-[min(90vw,560px)] -translate-x-1/2 overflow-hidden rounded-md border border-border bg-popover shadow-2xl",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      )}
      overlayClassName="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
      shouldFilter
      loop
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Command.Input
          placeholder={t("placeholder")}
          className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Kbd>esc</Kbd>
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </Command.Empty>

        {grouped.map(({ group, items }) => (
          <Command.Group
            key={group}
            heading={t(`groups.${group}`)}
            className="[&_[cmdk-group-heading]]:mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {items.map((action) => {
              const Icon = action.icon;
              // Inline `label` wins for dynamic, data-driven entries (lesson
              // titles, etc.); fall back to the i18n registry for static actions.
              const label = action.label ?? t(`actions.${action.id}`);
              return (
                <Command.Item
                  key={action.id}
                  value={`${label} ${(action.keywords ?? []).join(" ")}`}
                  onSelect={() => go(action.href)}
                  className="group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground transition-colors aria-selected:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-aria-selected:text-copper" />
                  <span className="flex-1 truncate">{label}</span>
                  {action.shortcut && <Kbd>{action.shortcut}</Kbd>}
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
