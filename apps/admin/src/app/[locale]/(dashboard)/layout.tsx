"use client";

import { usePathname } from "@/i18n/navigation";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Providers } from "@/components/providers";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { BrandContextProvider } from "@/components/layout/brand-context-provider";
import { AcademyWorkspaceSidebar } from "@/modules/academy/components/workspace-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // When inside `/academy/**`, the Academy workspace sidebar replaces the
  // global admin sidebar — the user has "entered" a dedicated module with
  // its own chrome instead of a tab sitting inside the admin universe.
  const isAcademyWorkspace = pathname.startsWith("/academy");

  return (
    <AuthProvider>
      <AuthGuard>
        <Providers>
          <BrandContextProvider>
          <SidebarProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              Skip to content
            </a>
            <div className="flex min-h-screen bg-background">
              {isAcademyWorkspace ? (
                <AcademyWorkspaceSidebar />
              ) : (
                <AdminSidebar />
              )}
              <div className="flex flex-1 flex-col lg:pl-60">
                <AdminHeader />
                <main
                  id="main"
                  className="flex-1 px-4 py-5 lg:px-6 lg:py-6"
                >
                  <div className="mx-auto flex w-full max-w-[1440px] flex-col">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
          </BrandContextProvider>
        </Providers>
      </AuthGuard>
    </AuthProvider>
  );
}
