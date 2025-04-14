"use client"

import { Home, BookMarked, User } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const pathname = usePathname()

  // Navigation items for the sidebar
  const navItems = [
    {
      title: "Home",
      icon: Home,
      url: "/",
      isActive: pathname === "/",
    },
    {
      title: "Saved Resources",
      icon: BookMarked,
      url: "/saved",
      isActive: pathname === "/saved",
    },
    {
      title: "Account",
      icon: User,
      url: "/account",
      isActive: pathname === "/account",
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold">PDF Analyzer</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={item.isActive}>
                <Link href={item.url} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
