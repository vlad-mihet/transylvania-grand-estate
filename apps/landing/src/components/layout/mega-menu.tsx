"use client";

import { useRef, useEffect } from "react";
import { Link } from "@tge/i18n/navigation";
import { cn } from "@tge/utils";

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MegaMenu({ isOpen, onClose, children }: MegaMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div
      ref={ref}
      data-open={isOpen}
      className={cn(
        "absolute top-full left-0 right-0 bg-background/98 backdrop-blur-lg border-b border-copper/15 shadow-2xl transition-all duration-500 ease-luxury overflow-hidden",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-1 pointer-events-none"
      )}
    >
      {/* Decorative copper accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-copper/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </div>
    </div>
  );
}

interface MegaMenuColumnProps {
  title: string;
  children: React.ReactNode;
}

export function MegaMenuColumn({ title, children }: MegaMenuColumnProps) {
  return (
    <div>
      <h3 className="mega-menu-title text-[11px] font-serif font-semibold uppercase tracking-[0.2em] text-copper/70 mb-6">
        {title}
      </h3>
      <div className="mega-menu-items flex flex-col gap-2.5">
        {children}
      </div>
    </div>
  );
}

interface MegaMenuLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function MegaMenuLink({ href, children, onClick }: MegaMenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-[14px] text-cream/60 hover:text-cream cursor-pointer py-1"
    >
      {children}
    </Link>
  );
}
