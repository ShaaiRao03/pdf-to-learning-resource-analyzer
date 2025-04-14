import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import "./globals.css"

export const metadata = {
  title: "PDF to Learning Resource Analyzer",
  description: "Transform your PDFs into structured learning resources",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <AppSidebar />
          {children}
        </SidebarProvider>
      </body>
    </html>
  )
}
