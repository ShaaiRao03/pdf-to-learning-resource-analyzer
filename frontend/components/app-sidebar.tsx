"use client"

import { Home, BookMarked, User, LogOut } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
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
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter();

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

  const handleLogout = async () => {
    // Show a confirmation dialog
    if (window.confirm("Are you sure you want to log out?")) {
      await signOut(auth);
      router.replace("/login");
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <h1 className="text-lg font-semibold">PDF Analyzer</h1>
        </SidebarHeader>
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
        <div className="flex-grow" />
        <SidebarMenu>
          <SidebarMenuItem className="mt-auto pb-6">
            <SidebarMenuButton onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
