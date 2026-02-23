import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccentButtonProps
  extends React.ComponentProps<"button"> {
  accentVariant?: "solid" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export function AccentButton({
  accentVariant = "solid",
  className,
  children,
  ...props
}: AccentButtonProps) {
  return (
    <Button
      className={cn(
        "font-medium tracking-[0.02em] text-sm rounded-[2px] transition-all duration-500 ease-luxury",
        accentVariant === "solid" &&
          "bg-copper text-background border border-copper shadow-sm hover:bg-copper-light hover:border-copper-light hover:shadow-[0_6px_24px_-6px_rgba(196,127,90,0.35)] hover:-translate-y-px",
        accentVariant === "outline" &&
          "border border-copper/30 text-copper bg-transparent hover:border-copper hover:bg-copper/[0.04]",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
