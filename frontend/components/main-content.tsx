"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

// Mock data
const sampleExtractedResources = [
  {
    id: "r1",
    title: "Introduction to Machine Learning",
    type: "article",
    url: "https://example.com/intro-ml",
    confidence: 0.92,
  },
  {
    id: "r2",
    title: "Neural Networks Explained",
    type: "video",
    url: "https://example.com/neural-networks",
    confidence: 0.85,
  },
  {
    id: "r3",
    title: "Supervised vs Unsupervised Learning",
    type: "article",
    url: "https://example.com/learning-types",
    confidence: 0.78,
  },
  {
    id: "r4",
    title: "Python Code for Decision Trees",
    type: "code",
    url: "https://example.com/decision-trees",
    confidence: 0.88,
  },
]

export function MainContent() {
  const router = useRouter()
  const [fileSelected, setFileSelected] = useState(false)
  const [fileName, setFileName] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [extractedResources, setExtractedResources] = useState([])
  const [selectedResources, setSelectedResources] = useState([])

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setFileSelected(true)
      setFileName(file.name)
    }
  }

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type === "application/pdf") {
      setFileSelected(true)
      setFileName(file.name)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // Analyze PDF
  const analyzePDF = () => {
    setIsAnalyzing(true)

    // Simulate API call with timeout
    setTimeout(() => {
      setIsAnalyzing(false)
      setExtractedResources(sampleExtractedResources)
      setShowResults(true)
    }, 2000)
  }

  // Toggle resource selection
  const toggleResourceSelection = (resourceId) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId],
    )
  }

  // Save selected resources
  const saveSelectedResources = () => {
   
    console.log("Saving resources:", selectedResources)

    setShowResults(false)

    // Reset states
    setFileSelected(false)
    setFileName("")
    setSelectedResources([])

    alert("Resources saved successfully!")
  }

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
              onClick={() => document.getElementById("pdf-upload").click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <p className="text-sm text-muted-foreground">Drag and drop your PDF here, or click to browse</p>
              {fileSelected && <p className="mt-2 text-sm font-medium">{fileName} selected</p>}
            </div>

            <Button size="lg" className="px-8" disabled={!fileSelected || isAnalyzing} onClick={analyzePDF}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing your request...
                </>
              ) : (
                "Analyze PDF"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extracted Resources</DialogTitle>
            <DialogDescription>
              We found the following resources in your PDF. Select the ones you want to save.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedResources.length} of {extractedResources.length} selected
                </div>
              </div>

              <div className="space-y-2">
                {extractedResources.map((resource) => (
                  <div key={resource.id} className="flex items-start gap-3 p-3 border rounded-md">
                    <Checkbox
                      id={`resource-${resource.id}`}
                      checked={selectedResources.includes(resource.id)}
                      onCheckedChange={() => toggleResourceSelection(resource.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`resource-${resource.id}`} className="font-medium cursor-pointer">
                        {resource.title}
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize">
                          {resource.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Confidence: {Math.round(resource.confidence * 100)}%
                        </span>
                      </div>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate block mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {resource.url}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setShowResults(false)}>
              Cancel
            </Button>
            <Button onClick={saveSelectedResources} disabled={selectedResources.length === 0}>
              Save Selected Resources
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  )
}
