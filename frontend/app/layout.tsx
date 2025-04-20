import type React from "react";
import { AuthProvider } from "@/components/auth-provider";
import { ClientLayoutShell } from "@/components/ClientLayoutShell";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata = {
  title: "Einstein AI",
  description: "Transform your PDFs into structured learning resources",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ClientLayoutShell>{children}</ClientLayoutShell>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
