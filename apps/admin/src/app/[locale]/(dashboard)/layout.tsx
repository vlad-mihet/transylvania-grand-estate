"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Providers } from "@/components/providers";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <Providers>
          <SidebarProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              Skip to content
            </a>
            <div className="flex min-h-screen bg-background">
              <AdminSidebar />
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
        </Providers>
      </AuthGuard>
    </AuthProvider>
  );
}
