"use client"

import { useState } from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function MainContent() {
  const [fileSelected, setFileSelected] = useState(false)

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-4 border-b px-6">
        <SidebarTrigger className="-ml-2" />
        <h2 className="text-lg font-semibold">PDF to Learning Resource Analyzer</h2>
      </header>
      <div className="flex-1 p-6">
        <div className="rounded-lg border border-border p-8 text-center">
          <h3 className="text-xl font-medium mb-4">Upload a PDF to analyze</h3>
          <p className="text-muted-foreground mb-6">Transform your PDFs into structured learning resources</p>
          <div className="flex flex-col items-center">
            <div
              className="w-full max-w-md p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center mb-6 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setFileSelected(true)}
            >
              <p className="text-sm text-muted-foreground">Drag and drop your PDF here, or click to browse</p>
              {fileSelected && <p className="mt-2 text-sm font-medium">example-document.pdf selected</p>}
            </div>

            <Button size="lg" className="px-8" disabled={!fileSelected} onClick={() => alert("Analyzing PDF...")}>
              Analyze PDF
            </Button>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}
