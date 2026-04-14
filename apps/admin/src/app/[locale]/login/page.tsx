"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { LoginForm } from "@/components/auth/login-form";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("Login");

  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        {/* Left: Dark branded panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#141418] p-12 text-cream">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-copper" />
            <div>
              <span className="font-serif text-base font-semibold tracking-[0.03em]">
                Transylvania
              </span>
              <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-copper/70 font-medium">
                Grand Estate
              </span>
            </div>
          </div>
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-[0.02em] text-cream leading-relaxed whitespace-pre-line">
              {t("heroTitle")}
            </h2>
            <div className="mt-4 h-px w-16 bg-copper/30" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-cream/30">
            {t("adminDashboard")}
          </p>
        </div>

        {/* Right: Login form */}
        <div className="flex flex-1 items-center justify-center bg-background p-8">
          <div className="w-full max-w-sm space-y-8">
            {/* Mobile brand header */}
            <div className="lg:hidden flex flex-col items-center">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-copper" />
                <span className="font-serif text-base font-semibold tracking-[0.03em]">
                  Transylvania
                  <span className="ml-1.5 text-[10px] uppercase tracking-[0.2em] text-copper/70 font-medium">
                    Grand Estate
                  </span>
                </span>
              </div>
              <div className="mt-4 h-px w-12 bg-copper/30" />
            </div>
            <div className="text-center lg:text-left">
              <h1 className="font-serif text-2xl font-semibold tracking-[0.01em]">
                {t("welcome")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>
            <LoginForm />
            <div className="divider-copper" />
            <p className="text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50">
              Transylvania Grand Estate &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
