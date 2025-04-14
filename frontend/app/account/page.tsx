import { AccountPage } from "@/components/account-page"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

export default function Account() {
  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-4 border-b px-6">
        <SidebarTrigger className="-ml-2" />
        <h2 className="text-lg font-semibold">PDF to Learning Resource Analyzer</h2>
      </header>
      <AccountPage />
    </SidebarInset>
  )
}
