import * as React from "react";
import { Button } from "../ui/button";
import { cn } from "@tge/utils";

interface AccentButtonProps
  extends React.ComponentProps<"button"> {
  // "splash" mirrors the SplashOverlay "Intră" CTA — minimal cream-tinted
  // outline that copper-glows on hover. Used by the hero and nav primary
  // actions so the entry-page aesthetic carries into the live header.
  accentVariant?: "solid" | "outline" | "splash";
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
        "font-medium tracking-[0.02em] text-sm rounded-md transition-all duration-500 ease-luxury",
        accentVariant === "solid" &&
          "bg-copper text-background border border-copper shadow-sm hover:bg-copper-light hover:border-copper-light hover:shadow-[0_6px_24px_-6px_rgba(196,127,90,0.35)] hover:-translate-y-px",
        accentVariant === "outline" &&
          "border border-copper/30 text-copper bg-transparent hover:border-copper hover:bg-copper/[0.04]",
        accentVariant === "splash" &&
          "font-normal uppercase tracking-[0.3em] text-xs rounded-none border border-cream/15 text-cream/80 bg-transparent backdrop-blur-sm duration-700 hover:text-cream hover:border-copper/40 hover:shadow-[0_0_30px_-8px_rgba(196,127,90,0.25)]",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
