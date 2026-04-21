import type { ReactNode } from "react";
import { cn } from "@tge/utils";

interface DetailViewProps {
  children: ReactNode;
  className?: string;
}

export function DetailView({ children, className }: DetailViewProps) {
  return (
    <div
      className={cn(
        "w-full space-y-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
