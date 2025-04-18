"use client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import type React from "react";

export function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const router = useRouter();
  const hideSidebar = pathname === "/login" || pathname === "/signup";

  if (loading && !hideSidebar) {
    return null;
  }

  if (hideSidebar) {
    return <>{children}</>;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      {children}
    </SidebarProvider>
  );
}
