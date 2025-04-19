"use client"

import { useState, useRef } from "react"
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
import { auth } from "@/lib/firebase";
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Resource type for extracted resources
interface ExtractedResource {
  id: string;
  title: string;
  type: string;
  url: string;
  confidence: number;
  firestoreId?: string;
  uniqueId?: string;
}

export function MainContent() {
  const router = useRouter()
  const [fileSelected, setFileSelected] = useState(false)
  const [fileName, setFileName] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [extractedResources, setExtractedResources] = useState<ExtractedResource[]>([])
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pdfUuid, setPdfUuid] = useState<string | null>(null);
  const [savingResources, setSavingResources] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: ensure resource is always an array
  function ensureArray(val: any) {
    if (Array.isArray(val)) return val;
    if (val === undefined || val === null) return [];
    return [val];
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File size must be less than 5MB.");
      return;
    }
    setFileSelected(true);
    setFileName(file.name);
    setSelectedFile(file);
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File size must be less than 5MB.");
      return;
    }
    setFileSelected(true);
    setFileName(file.name);
    setSelectedFile(file);
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // Analyze PDF (calls backend)
  const analyzePDF = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setShowResults(false);
    setExtractedResources([]);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const idToken = await user.getIdToken();

      // Generate a UUID for this upload
      const newPdfUuid = uuidv4();
      setPdfUuid(newPdfUuid); // Save UUID to state

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("uuid", newPdfUuid);
      
      const res = await fetch("http://localhost:8000/api/analyze-pdf", {
        method: "POST",
        headers: {
          "x-firebase-token": idToken,
        },
        body: formData,
      });
      const data = await res.json();
      console.log("API response:", data);
      setIsAnalyzing(false);
      if (!data.success) {
        alert(data.message || "Failed to analyze PDF");
        return;
      }
      
      // Handle missing or unexpected structure
      const resources = [];
      const resourceMap = data.analysis && data.analysis.resources ? data.analysis.resources : {};
      for (const art of ensureArray(resourceMap.articles)) {
        resources.push({
          id: art.id || art.url || art.title,
          title: art.title,
          type: "article",
          url: art.url,
          confidence: typeof art.confidence === "number" ? art.confidence : (typeof art.score === "number" ? art.score : 1.0),
        });
      }
      for (const vid of ensureArray(resourceMap.videos)) {
        resources.push({
          id: vid.id || vid.url || vid.title,
          title: vid.title,
          type: "video",
          url: vid.url,
          confidence: typeof vid.confidence === "number" ? vid.confidence : (typeof vid.score === "number" ? vid.score : 1.0),
        });
      }
      for (const course of ensureArray(resourceMap.courses)) {
        resources.push({
          id: course.id || course.url || course.title,
          title: course.title,
          type: "course",
          url: course.url,
          confidence: typeof course.confidence === "number" ? course.confidence : (typeof course.score === "number" ? course.score : 1.0),
        });
      }
      // Sort resources from high to low confidence
      resources.sort((a, b) => b.confidence - a.confidence);
      setExtractedResources(resources);
      setShowResults(true);
    } catch (err) {
      setIsAnalyzing(false);
      alert("Error analyzing PDF");
    }
  };

  // Toggle resource selection
  const toggleResourceSelection = (resourceId) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId],
    )
  }

  // Select all resources button handler
  const handleSelectAllResources = () => {
    setSelectedResources(extractedResources.map(r => r.id));
  };

  // Save selected resources
  const saveSelectedResources = async () => {
    setSavingResources(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const uid = user.uid;
      if (!pdfUuid) throw new Error("No PDF UUID found");
      if (!fileName) throw new Error("No PDF title found");
      if (selectedResources.length === 0) throw new Error("No resources selected");

      const db = getFirestore();
      // Create the PDF document with title
      const pdfDocRef = doc(db, "users", uid, "pdfs", pdfUuid);
      await setDoc(pdfDocRef, {
        title: fileName
      });

      // Save each selected resource to a new document, and include a unique id (not the url) inside the document
      const resourcesCollectionRef = collection(db, "users", uid, "pdfs", pdfUuid, "resources");
      for (const resource of extractedResources.filter((r) => selectedResources.includes(r.id))) {
        const resourceDocRef = doc(resourcesCollectionRef);
        const uniqueResourceId = uuidv4();
        await setDoc(resourceDocRef, { ...resource, uniqueId: uniqueResourceId, firestoreId: resourceDocRef.id });
      }

      setShowResults(false); // Hide results window/modal after save
      setFileSelected(false);
      setFileName("");
      setSelectedResources([]);
      setSelectedFile(null);

      alert("Resources saved successfully!");
    } catch (err) {
      alert("Failed to save resources: " + (err.message || err));
    } finally {
      setSavingResources(false);
    }
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
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <p className="text-sm text-muted-foreground">Drag and drop your PDF here, or click to browse</p>
              {fileSelected && (
                <div className="mt-2 flex items-center gap-2 justify-center">
                  <span className="text-sm font-medium">{fileName}</span>
                  <button
                    type="button"
                    aria-label="Remove PDF"
                    className="ml-1 p-1 rounded-full hover:bg-red-100 text-red-500 transition"
                    onClick={async (e) => {
                      e.stopPropagation();
                      // Call backend to delete the PDF if a file is selected
                      if (fileSelected && fileName) {
                        try {
                          const user = auth.currentUser;
                          if (!user) throw new Error("User not authenticated");
                          const idToken = await user.getIdToken();
                          const res = await fetch("http://localhost:8000/api/delete_pdf", {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              "x-firebase-token": idToken,
                            },
                            body: JSON.stringify({ filename: fileName, uuid: pdfUuid }),
                          });
                        } catch (err) {
                          alert(err);
                        }
                      }
                      setFileSelected(false);
                      setFileName("");
                      setSelectedFile(null);
                      setExtractedResources([]);
                      setSelectedResources([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-4">
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
              <Button
                size="lg"
                variant="outline"
                disabled={extractedResources.length === 0 || !fileSelected}
                onClick={() => setShowResults(true)}
              >
                View Resources
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-2xl">
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

              {extractedResources && extractedResources.length > 0 && (
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="secondary" onClick={handleSelectAllResources}>
                    Select All Resources
                  </Button>
                </div>
              )}

              {/* Scrollable resource list if more than 5 */}
              <div className={`space-y-2${extractedResources.length > 5 ? ' max-h-80 overflow-y-auto pr-2' : ''}`}>
                {extractedResources.map((resource) => (
                  <div key={resource.id} className="flex items-start gap-3 p-3 border rounded-md">
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
                          {/* Arrow up-right icon for external link */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 ml-1 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-10 10M17 7H7m10 0v10" /></svg>
                        </a>
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize">
                          {resource.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Confidence: {Math.round(resource.confidence * 100)}%
                        </span>
                      </div>
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
            <Button size="lg" disabled={selectedResources.length === 0 || savingResources} onClick={saveSelectedResources}>
              {savingResources ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : "Save Resources"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  )
}
