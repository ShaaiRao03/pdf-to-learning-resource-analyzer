import { SavedResourcesPage } from "@/components/saved-resources-page"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

export default function SavedResources() {
  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-4 border-b px-6">
        <SidebarTrigger className="-ml-2" />
        <h2 className="text-lg font-semibold">PDF to Learning Resource Analyzer</h2>
      </header>
      <SavedResourcesPage />
    </SidebarInset>
  )
}