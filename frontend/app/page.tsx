"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { MainContent } from "@/components/main-content";

export default function Home() {
  const { user, loading, userName } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) return null; // Don't render sidebar or content until auth is loaded
  if (!user) return null; // Don't render content for unauthenticated

  return (
    <>
      <MainContent />
    </>
  );
}
