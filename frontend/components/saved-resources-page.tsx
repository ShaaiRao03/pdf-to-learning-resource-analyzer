"use client"

import { useState, useRef } from "react"
import { Trash2, FileText, X, Pencil } from "lucide-react"
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
import { Input } from "@/components/ui/input"

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
        confidence: 0.8,
      },
      {
        id: "r2",
        title: "Supervised Learning Tutorial",
        type: "video",
        url: "https://example.com/supervised-learning",
        confidence: 0.9,
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
        confidence: 0.7,
      },
      {
        id: "r4",
        title: "CSS Grid Layout Tutorial",
        type: "video",
        url: "https://example.com/css-grid",
        confidence: 0.6,
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
        confidence: 0.5,
      },
      {
        id: "r6",
        title: "Dynamic Programming Examples",
        type: "article",
        url: "https://example.com/dynamic-programming",
        confidence: 0.4,
      },
    ],
  },
]

export function SavedResourcesPage() {
  const [savedPdfs, setSavedPdfs] = useState(initialPdfs)
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [selectedResources, setSelectedResources] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [removeSelectedDialogOpen, setRemoveSelectedDialogOpen] = useState(false)
  const [filterText, setFilterText] = useState("")
  const [editingTitleId, setEditingTitleId] = useState(null)
  const [editingTitleValue, setEditingTitleValue] = useState("")
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Open the resources modal for a PDF
  const handleOpenResources = (pdf) => {
    setSelectedPdf(pdf)
    setSelectedResources([])
    setDialogOpen(true)
  }

  // Toggle resource selection
  const toggleResourceSelection = (resourceId) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId],
    )
  }

  // Remove selected resources
  const removeSelectedResources = () => {
    if (selectedPdf && selectedResources.length > 0) {
      setSavedPdfs((pdfs) => {
        const updatedPdfs = pdfs.map((pdf) =>
          pdf.id === selectedPdf.id
            ? {
                ...pdf,
                resources: pdf.resources.filter((resource) => !selectedResources.includes(resource.id)),
              }
            : pdf,
        )
        const remainingResources = selectedPdf.resources.filter((resource) => !selectedResources.includes(resource.id));
        if (remainingResources.length === 0) {
          setDialogOpen(false);
          return updatedPdfs.filter(pdf => pdf.id !== selectedPdf.id);
        } else {
          setSelectedPdf(prev => prev ? { ...prev, resources: remainingResources } : prev);
        }
        return updatedPdfs;
      });
      setSelectedResources([]);
    }
  }

  // Delete an entire PDF and its resources
  const deletePdf = () => {
    if (deleteConfirm) {
      setSavedPdfs((pdfs) => pdfs.filter((pdf) => pdf.id !== deleteConfirm.pdfId))
      setDeleteConfirm(null)
      setDeleteDialogOpen(false)
      setDialogOpen(false)
    }
  }

  // Filter and sort resources by filterText and confidence
  const getFilteredResources = () => {
    if (!selectedPdf) return []
    let filtered = selectedPdf.resources
    if (filterText.trim()) {
      const lower = filterText.trim().toLowerCase()
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(lower) || (r.type && r.type.toLowerCase().includes(lower)),
      )
    }
    // If confidence exists, sort descending
    if (filtered.length && filtered[0].confidence !== undefined) {
      filtered = [...filtered].sort((a, b) => b.confidence - a.confidence)
    }
    return filtered
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Saved Resources</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {savedPdfs.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12 text-lg">No resources exist</div>
        ) : (
          savedPdfs.map((pdf) => (
            <Card
              key={pdf.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
              onClick={() => handleOpenResources(pdf)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  {editingTitleId === pdf.id ? (
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        setSavedPdfs((pdfs) =>
                          pdfs.map((p) => (p.id === pdf.id ? { ...p, title: editingTitleValue } : p)),
                        )
                        setEditingTitleId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setSavedPdfs((pdfs) =>
                            pdfs.map((p) => (p.id === pdf.id ? { ...p, title: editingTitleValue } : p)),
                          )
                          setEditingTitleId(null)
                        }
                      }}
                      className="text-base font-semibold truncate max-w-[48ch] px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="truncate max-w-[48ch] text-base font-semibold cursor-pointer group flex items-center gap-1"
                      title="Click to edit title"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingTitleId(pdf.id)
                        setEditingTitleValue(pdf.title)
                        setTimeout(() => titleInputRef.current?.focus(), 0)
                      }}
                    >
                      {pdf.title}
                      <Pencil className="w-4 h-4 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Added on {pdf.date}</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {pdf.resources.length} learning resource{pdf.resources.length !== 1 ? "s" : ""}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenResources(pdf)
                    }}
                  >
                    View Resources
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Resources Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPdf?.title}</DialogTitle>
            <DialogDescription>Resources extracted from this PDF</DialogDescription>
          </DialogHeader>
          {/* Filter input */}
          <div className="mb-2">
            <Input
              placeholder="Filter resources by title or type..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="py-4">
            {getFilteredResources().length > 0 ? (
              <div
                className={`space-y-4${
                  getFilteredResources().length > 5 ? " max-h-80 overflow-y-auto pr-2" : ""
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {selectedResources.length} of {getFilteredResources().length} selected
                  </div>
                </div>
                <div className="space-y-2">
                  {getFilteredResources().map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-start gap-3 p-3 border rounded-md"
                    >
                      <Checkbox
                        id={`resource-${resource.id}`}
                        checked={selectedResources.includes(resource.id)}
                        onCheckedChange={() => toggleResourceSelection(resource.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`resource-${resource.id}`} className="font-medium cursor-pointer">
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {resource.title}
                            {/* Arrow up-right icon */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4 ml-1 text-blue-500"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17 7l-10 10M17 7H7m10 0v10"
                              />
                            </svg>
                          </a>
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">
                            {resource.type}
                          </Badge>
                          {resource.confidence !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              Confidence: {Math.round(resource.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No resources found for this PDF.
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteConfirm({ pdfId: selectedPdf?.id })
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete PDF
              </Button>
              <Button
                variant="destructive"
                disabled={selectedResources.length === 0}
                onClick={() => setRemoveSelectedDialogOpen(true)}
              >
                Remove Selected
              </Button>
            </div>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Selected Confirmation Dialog */}
      <Dialog open={removeSelectedDialogOpen} onOpenChange={setRemoveSelectedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Selected Resources</DialogTitle>
            <DialogDescription>
              {(() => {
                // Determine if all or only resource(s) are being deleted
                const total = selectedPdf?.resources?.length || 0;
                const sel = selectedResources.length;
                if (sel === total && total > 0) {
                  return 'Deleting this will cause the PDF to be deleted.';
                }
                if (total === 1 && sel === 1) {
                  return 'Deleting this will cause the PDF to be deleted.';
                }
                return 'Are you sure you want to delete the selected resource(s)? This action cannot be undone.';
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveSelectedDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { removeSelectedResources(); setRemoveSelectedDialogOpen(false); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete PDF</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this PDF and all its resources? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirm(null)
                setDeleteDialogOpen(false)
              }}
            >
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
