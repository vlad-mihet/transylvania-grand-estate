"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type InquiryType = "property" | "developer" | "general";

export interface InquiryContext {
  type: InquiryType;
  entityName?: string;
  entitySlug?: string;
}

interface InquiryModalState {
  isOpen: boolean;
  context: InquiryContext;
  openInquiry: (context: InquiryContext) => void;
  closeInquiry: () => void;
}

const InquiryModalContext = createContext<InquiryModalState | null>(null);

export function InquiryProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<InquiryContext>({ type: "general" });

  const openInquiry = useCallback((ctx: InquiryContext) => {
    setContext(ctx);
    setIsOpen(true);
  }, []);

  const closeInquiry = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <InquiryModalContext.Provider
      value={{ isOpen, context, openInquiry, closeInquiry }}
    >
      {children}
    </InquiryModalContext.Provider>
  );
}

export function useInquiryModal() {
  const ctx = useContext(InquiryModalContext);
  if (!ctx)
    throw new Error("useInquiryModal must be used within InquiryProvider");
  return ctx;
}
