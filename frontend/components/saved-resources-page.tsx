"use client"

import { useState } from "react"
import { Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

// Sample data for saved PDFs and their resources
const initialPdfs = [
  {
    id: "1",
    title: "Machine Learning Fundamentals",
    date: "April 10, 2024",
    resources: [
      {
        id: "r1",
        title: "Introduction to Neural Networks",
        type: "article",
        url: "https://example.com/neural-networks",
      },
      {
        id: "r2",
        title: "Supervised Learning Tutorial",
        type: "video",
        url: "https://example.com/supervised-learning",
      },
    ],
  },
  {
    id: "2",
    title: "Web Development Guide",
    date: "April 8, 2024",
    resources: [
      {
        id: "r3",
        title: "React Hooks Documentation",
        type: "article",
        url: "https://example.com/react-hooks",
      },
      {
        id: "r4",
        title: "CSS Grid Layout Tutorial",
        type: "video",
        url: "https://example.com/css-grid",
      },
    ],
  },
  {
    id: "3",
    title: "Data Structures and Algorithms",
    date: "April 5, 2024",
    resources: [
      {
        id: "r5",
        title: "Binary Trees Implementation",
        type: "code",
        url: "https://example.com/binary-trees",
      },
      {
        id: "r6",
        title: "Dynamic Programming Examples",
        type: "article",
        url: "https://example.com/dynamic-programming",
      },
    ],
  },
]

export function SavedResourcesPage() {
  const [savedPdfs, setSavedPdfs] = useState(initialPdfs)
  const [selectedPdf, setSelectedPdf] = useState<any>(null)
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ pdfId: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Open the resources modal for a PDF
  const handleOpenResources = (pdf: any) => {
    setSelectedPdf(pdf)
    setSelectedResources([])
    setDialogOpen(true)
  }

  // Toggle resource selection
  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId],
    )
  }

  // Remove selected resources
  const removeSelectedResources = () => {
    if (selectedPdf && selectedResources.length > 0) {
      setSavedPdfs((pdfs) =>
        pdfs.map((pdf) =>
          pdf.id === selectedPdf.id
            ? {
                ...pdf,
                resources: pdf.resources.filter((resource) => !selectedResources.includes(resource.id)),
              }
            : pdf,
        ),
      )
      setSelectedResources([])

      // Update the selected PDF object to reflect changes
      setSelectedPdf((prev) => ({
        ...prev,
        resources: prev.resources.filter((resource: any) => !selectedResources.includes(resource.id)),
      }))
    }
  }

  // Delete an entire PDF and its resources
  const deletePdf = () => {
    if (deleteConfirm) {
      setSavedPdfs((pdfs) => pdfs.filter((pdf) => pdf.id !== deleteConfirm.pdfId))
      setDeleteConfirm(null)
      setDialogOpen(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Saved Resources</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {savedPdfs.map((pdf) => (
          <Card
            key={pdf.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleOpenResources(pdf)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    {pdf.title}
                  </CardTitle>
                  <CardDescription>Added on {pdf.date}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-sm text-muted-foreground">{pdf.resources.length} learning resources available</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resources Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedPdf?.title}</DialogTitle>
            <DialogDescription>Resources extracted from this PDF</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedPdf?.resources.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {selectedResources.length} of {selectedPdf?.resources.length} selected
                  </div>
                  {selectedResources.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={removeSelectedResources}>
                      Remove Selected
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedPdf?.resources.map((resource: any) => (
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
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {resource.url}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No resources found for this PDF.</div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={() => setDeleteConfirm({ pdfId: selectedPdf?.id })}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete PDF
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete PDF</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this PDF and all its resources? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deletePdf}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
