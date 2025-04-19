"use client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useEffect } from "react";
import type React from "react";

export function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const router = useRouter();
  const hideSidebar = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";

  useEffect(() => {
    if (!loading && !user && !hideSidebar) {
      router.replace("/login");
    }
  }, [loading, user, hideSidebar, router]);

  if (loading && !hideSidebar) {
    return null;
  }

  if (hideSidebar) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      {children}
    </SidebarProvider>
  );
}
