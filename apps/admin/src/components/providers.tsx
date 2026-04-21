"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { TooltipProvider } from "@tge/ui";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette";
import { KeyboardShortcutsProvider } from "@/components/command-palette/keyboard-shortcuts";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <NuqsAdapter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={200}>
            <CommandPaletteProvider>
              <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
            </CommandPaletteProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </NuqsAdapter>
    </ThemeProvider>
  );
}
