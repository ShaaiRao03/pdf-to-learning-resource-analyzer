"use client";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SavedResourcesPage } from "@/components/saved-resources-page";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";


export default function SavedResources() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { userName } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) return null;
  if (!user) return null;

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-4 border-b px-6">
        <SidebarTrigger className="-ml-2" />
        <h2 className="text-lg font-semibold">{`Welcome${userName ? ", " + userName : ""}`}</h2>
      </header>
      <SavedResourcesPage />
    </SidebarInset>
  );
}