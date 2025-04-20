"use client"

import { useState, useRef, useEffect } from "react"
import { Trash2, FileText, X, Pencil, Loader2 } from "lucide-react"
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
import { auth } from "@/lib/firebase";
import { getFirestore, collection, doc, getDocs, deleteDoc } from "firebase/firestore"
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { toast } from "@/hooks/use-toast";

export function SavedResourcesPage() {
  const [savedPdfs, setSavedPdfs] = useState([])
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [selectedResources, setSelectedResources] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [removeSelectedDialogOpen, setRemoveSelectedDialogOpen] = useState(false)
  const [filterText, setFilterText] = useState("")
  const [finalDeleteDialogOpen, setFinalDeleteDialogOpen] = useState(false);
  const [pendingDeletePdfId, setPendingDeletePdfId] = useState(null);
  const [pendingDeletePdfStoragePath, setPendingDeletePdfStoragePath] = useState(null);
  const [isDeletingPdf, setIsDeletingPdf] = useState(false);
  const [isDeletingResources, setIsDeletingResources] = useState(false);
  const [showDeleteLastResourceDialog, setShowDeleteLastResourceDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) { setIsLoading(false); return; }
      const db = getFirestore();
      const pdfsCol = collection(db, "users", user.uid, "pdfs");
      const pdfsSnap = await getDocs(pdfsCol);
      const pdfs = [];
      for (const pdfDoc of pdfsSnap.docs) {
        const pdfData = pdfDoc.data();
        // Fetch resources subcollection
        const resourcesCol = collection(db, "users", user.uid, "pdfs", pdfDoc.id, "resources");
        const resourcesSnap = await getDocs(resourcesCol);
        const resources = resourcesSnap.docs.map(doc => ({
          ...doc.data(),
          id: doc.id, // always Firestore doc ID
          firestoreId: doc.id // explicit for deletion
        }));
        pdfs.push({ id: pdfDoc.id, ...pdfData, resources });
      }
      setSavedPdfs(pdfs);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Open the resources modal for a PDF
  const handleOpenResources = (pdf) => {
    setSelectedPdf(pdf)
    setSelectedResources([])
    setDialogOpen(true)
  }

  // When user selects a resource, store its Firestore document id (resource.id)
  const toggleResourceSelection = (resourceId) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId],
    );
  };

  // Delete a PDF and all its resources from Firestore
  const handleDeletePdf = async (pdfId) => {
    setIsDeletingPdf(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const db = getFirestore();
      // Delete all resources in the subcollection
      const resourcesCol = collection(db, "users", user.uid, "pdfs", pdfId, "resources");
      const resourcesSnap = await getDocs(resourcesCol);
      for (const resourceDoc of resourcesSnap.docs) {
        await deleteDoc(resourceDoc.ref);
      }
      // Delete the PDF document itself
      await deleteDoc(doc(db, "users", user.uid, "pdfs", pdfId));
      setSavedPdfs((pdfs) => pdfs.filter((pdf) => pdf.id !== pdfId));
      setSelectedPdf(null);
      setDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete PDF: " + (err && typeof err === 'object' && 'message' in err ? err.message : String(err)),
        variant: "destructive"
      });
    } finally {
      setIsDeletingPdf(false);
      setFinalDeleteDialogOpen(false);
      setPendingDeletePdfId(null);
    }
  };

  // Helper to delete PDF in both Firestore, Cloud Storage, and backend API
  const deletePdfCompletely = async (pdfId, storagePath, fileName) => {
    setIsDeletingPdf(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const idToken = await user.getIdToken();
      const db = getFirestore();
      // Delete all resources under this PDF
      const resourcesCol = collection(db, "users", user.uid, "pdfs", pdfId, "resources");
      const resourcesSnap = await getDocs(resourcesCol);
      for (const docSnap of resourcesSnap.docs) {
        await deleteDoc(doc(db, "users", user.uid, "pdfs", pdfId, "resources", docSnap.id));
      }
      // Delete the PDF document itself
      await deleteDoc(doc(db, "users", user.uid, "pdfs", pdfId));
      // Delete from Cloud Storage if path provided
      if (storagePath) {
        const storage = getStorage();
        const fileRef = storageRef(storage, storagePath);
        await deleteObject(fileRef);
      }
      // Call backend API to delete PDF (send uuid and filename as JSON in DELETE body, include firebase token)
      try {
        await fetch("http://localhost:8000/api/delete-pdf", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-firebase-token": idToken,
          },
          body: JSON.stringify({ uuid: pdfId, filename: fileName }),
        });
      } catch (apiErr) {
        // Optionally log or notify API error, but do not block UI
        console.error("Backend API PDF delete failed", apiErr);
      }
      setSavedPdfs((pdfs) => pdfs.filter((pdf) => pdf.id !== pdfId));
      setSelectedPdf(null);
      setDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete PDF: " + (err && typeof err === 'object' && 'message' in err ? err.message : String(err)),
        variant: "destructive"
      });
    } finally {
      setIsDeletingPdf(false);
      setFinalDeleteDialogOpen(false);
      setShowDeleteLastResourceDialog(false);
    }
  };

  // Delete selected resources from a PDF
  const handleDeleteSelectedResources = async () => {
    if (!selectedPdf || selectedResources.length === 0) return;
    const total = selectedPdf.resources.length;
    const sel = selectedResources.length;
    // If user is deleting all resources, show loader and keep dialog open until done
    if (sel === total && total > 0) {
      setIsDeletingPdf(true);
      try {
        await deletePdfCompletely(selectedPdf.id, selectedPdf.storagePath || selectedPdf.filePath || null, selectedPdf.title || selectedPdf.fileName || "");
      } finally {
        setIsDeletingPdf(false);
        setRemoveSelectedDialogOpen(false);
      }
      return;
    }
    setIsDeletingResources(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const db = getFirestore();
      // Use the Firestore document id (resource.firestoreId) for deletion
      const resourcesToDelete = selectedPdf.resources.filter(r => selectedResources.includes(r.id));
      for (const resource of resourcesToDelete) {
        const firestoreId = resource.firestoreId || resource.id;
        await deleteDoc(doc(db, "users", user.uid, "pdfs", selectedPdf.id, "resources", firestoreId));
      }
      setSavedPdfs((pdfs) => pdfs.map((pdf) =>
        pdf.id === selectedPdf.id
          ? { ...pdf, resources: pdf.resources.filter((r) => !selectedResources.includes(r.id)) }
          : pdf
      ));
      const remainingResources = selectedPdf.resources.filter((r) => !selectedResources.includes(r.id));
      setSelectedPdf((prev) => prev ? { ...prev, resources: remainingResources } : prev);
      setDialogOpen(true);
      setSelectedResources([]);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete resources: " + (err && typeof err === 'object' && 'message' in err ? err.message : String(err)),
        variant: "destructive"
      });
    } finally {
      setIsDeletingResources(false);
      setRemoveSelectedDialogOpen(false);
    }
  };

  // Select all resources button handler
  const handleSelectAllResources = () => {
    if (!selectedPdf) return;
    setSelectedResources(selectedPdf.resources.map(r => r.id));
  };

  // Deselect all resources button handler
  const handleDeselectAllResources = () => {
    setSelectedResources([]);
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 mr-2 text-muted-foreground" />
        <span>Loading resources...</span>
      </div>
    );
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
                  <span
                    className="truncate max-w-[48ch] text-base font-semibold group flex items-center gap-1"
                  >
                    {pdf.title}
                  </span>
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
          {/* Filtering and Select All/Deselect All controls side by side */}
          <div className="flex items-center gap-2 mb-2">
            <Input
              type="text"
              placeholder="Filter resources..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="max-w-xs"
            />
            {selectedPdf && selectedPdf.resources && selectedPdf.resources.length > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={handleSelectAllResources}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={handleDeselectAllResources}>
                  Deselect All
                </Button>
              </>
            )}
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
                  setPendingDeletePdfId(selectedPdf?.id); 
                  setPendingDeletePdfStoragePath(selectedPdf?.storagePath || selectedPdf?.filePath || null);
                  setFinalDeleteDialogOpen(true);
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
                const total = selectedPdf?.resources?.length || 0;
                const sel = selectedResources.length;
                if (sel === total && total > 0) {
                  return 'Are you sure you want to delete all resources and the entire PDF? This will also delete the file from cloud storage.';
                }
                if (total === 1 && sel === 1) {
                  return 'Deleting the last resource will delete the entire PDF. Do you want to continue?';
                }
                return 'Are you sure you want to delete the selected resource(s)? This action cannot be undone.';
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveSelectedDialogOpen(false)} disabled={isDeletingResources || isDeletingPdf}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelectedResources} disabled={isDeletingResources || isDeletingPdf}>
              {(isDeletingPdf && selectedResources.length === (selectedPdf?.resources?.length || 0))
                ? (<><Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> Deleting...</>)
                : (isDeletingResources ? (<><Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> Deleting...</>) : "Delete")}
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
            <Button variant="destructive" onClick={() => { setPendingDeletePdfId(deleteConfirm.pdfId); setPendingDeletePdfStoragePath(deleteConfirm.storagePath); setFinalDeleteDialogOpen(true); setDeleteDialogOpen(false); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Delete Confirmation Dialog */}
      <Dialog open={finalDeleteDialogOpen} onOpenChange={setFinalDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the PDF and all its saved resources from your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalDeleteDialogOpen(false)} disabled={isDeletingPdf}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              deletePdfCompletely(pendingDeletePdfId, pendingDeletePdfStoragePath, selectedPdf?.title || selectedPdf?.fileName || "");
            }} disabled={isDeletingPdf}>
              {isDeletingPdf ? (<><Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> Deleting...</>) : "Yes, delete PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Last Resource => Delete PDF Dialog */}
      <Dialog open={showDeleteLastResourceDialog} onOpenChange={setShowDeleteLastResourceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete PDF?</DialogTitle>
            <DialogDescription>
              This will delete the entire PDF and all its data from your account, including the file in cloud storage. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteLastResourceDialog(false)} disabled={isDeletingPdf}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deletePdfCompletely(pendingDeletePdfId, pendingDeletePdfStoragePath, selectedPdf?.title || selectedPdf?.fileName || "")} disabled={isDeletingPdf}>
              {isDeletingPdf ? (<><Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> Deleting PDF...</>) : "Yes, delete PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
