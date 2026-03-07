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
            <div className="flex min-h-screen">
              <AdminSidebar />
              <div className="flex flex-1 flex-col lg:pl-64">
                <AdminHeader />
                <main className="flex-1 p-4 lg:p-6">
                  <div className="mx-auto w-full max-w-[1800px]">
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
