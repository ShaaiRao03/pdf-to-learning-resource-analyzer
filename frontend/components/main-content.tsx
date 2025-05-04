"use client"

import { useState, useRef, useEffect } from "react"
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
import { Input } from "@/components/ui/input"; 
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"; 
import { auth } from "@/lib/firebase";
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { logFrontendAction } from "@/lib/logUserAction";
import { toast } from "@/hooks/use-toast";

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
  const { userName } = useAuth();
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pdfUuid, setPdfUuid] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem('pdfUuid');
    }
    return null;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false)
  const [extractedResources, setExtractedResources] = useState<ExtractedResource[]>([])
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [savingResources, setSavingResources] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedType, setSelectedType] = useState<string>("__ALL__");
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [haltingProcessing, setHaltingProcessing] = useState(false);
  const pendingUpload = useRef<null | (() => void)>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile) {
      setFileName(selectedFile.name);
    } else {
      setFileName("");
    }
  }, [selectedFile]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (pdfUuid) {
        window.sessionStorage.setItem('pdfUuid', pdfUuid);
      } else {
        window.sessionStorage.removeItem('pdfUuid');
      }
    }
  }, [pdfUuid]);

  // Helper: ensure resource is always an array
  function ensureArray(val: any) {
    if (Array.isArray(val)) return val;
    if (val === undefined || val === null) return [];
    return [val];
  }

  // Handle file selection
  const handleFileSelect = (e) => {
  logFrontendAction({
    actionType: 'PDF FILE SELECTION',
    component: 'MainContent',
    level: 'info',
    details: { eventType: 'input', time: new Date().toISOString() }
  });
    const file = e.target.files?.[0];
    if (!file) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.type !== "application/pdf") {
      toast({
        title: "File type error",
        description: "Only PDF files are allowed.",
        variant: "destructive",
        duration: 3000
      });
      setTimeout(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 100);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File size error",
        description: "File size must be less than 5MB.",
        variant: "destructive",
        duration: 3000
      });
      setTimeout(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 100);
      return;
    }
    setFileSelected(true);
setSelectedFile(file);
setPdfUuid(null);
logFrontendAction({
  actionType: 'PDF SELECTED',
  component: 'MainContent',
  level: 'info',
  details: { fileName: file.name, fileSize: file.size }
});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle drag and drop
  const handleDrop = (e) => {
  logFrontendAction({
    actionType: 'PDF FILE SELECTION',
    component: 'MainContent',
    level: 'info',
    details: { eventType: 'drop', time: new Date().toISOString() }
  });
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.type !== "application/pdf") {
      toast({
        title: "File type error",
        description: "Only PDF files are allowed.",
        variant: "destructive",
        duration: 3000
      });
      setTimeout(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 100);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File size error",
        description: "File size must be less than 5MB.",
        variant: "destructive",
        duration: 3000
      });
      setTimeout(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 100);
      return;
    }
    setFileSelected(true);
    setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // Analyze PDF (calls backend)
  const analyzePDF = async () => {
  logFrontendAction({
    actionType: 'PDF UPLOAD ATTEMPT',
    component: 'MainContent',
    level: 'info',
    details: { fileName: selectedFile?.name, fileSize: selectedFile?.size }
  });
    if (!selectedFile) return;
    setIsAnalyzing(true);
setShowResults(false);
setExtractedResources([]);
logFrontendAction({
  actionType: 'ANALYSIS START',
  component: 'MainContent',
  level: 'info',
  details: { fileName: selectedFile?.name, fileSize: selectedFile?.size }
});
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const idToken = await user.getIdToken();

      // Generate a UUID for this upload
      const newPdfUuid = uuidv4();
      setPdfUuid(newPdfUuid);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('pdfUuid', newPdfUuid);
      }
      
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("uuid", newPdfUuid);

      await fetch("http://localhost:8000/api/analyze-pdf", {
        method: "POST",
        headers: {
          "x-firebase-token": idToken,
        },
        body: formData,
      });

      // Poll for status
      const pollStatus = async (uuid) => {
        while (true) {
          const res = await fetch(`http://localhost:8000/api/analyze-pdf-status/${uuid}`, {
            headers: { "x-firebase-token": idToken },
          });
          const data = await res.json();
          if (data.status === "done") {
            const resourceMap = data.result.analysis.resources;
            // Normalize resources to always be arrays
            const ensureArray = (x) => Array.isArray(x) ? x : (x ? [x] : []);
            const resources = [];
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
            resources.sort((a, b) => b.confidence - a.confidence);
            setExtractedResources(resources);
setShowResults(true);
setIsAnalyzing(false);
logFrontendAction({
  actionType: 'ANALYSIS SUCCESS',
  component: 'MainContent',
  level: 'info',
  details: { fileName: selectedFile?.name, resourceCount: resources.length }
});
break;
          } else if (data.status === "failed" || data.status === "cancelled") {
            toast({
  title: "Processing Status",
  description: data.error || "Processing failed/cancelled",
  variant: "destructive",
  duration: 3000
});
logFrontendAction({
  actionType: 'ANALYSIS FAILURE',
  component: 'MainContent',
  level: 'error',
  details: { fileName: selectedFile?.name, error: data.error }
});
setIsAnalyzing(false);
break;
          }
          await new Promise(r => setTimeout(r, 2000)); // poll every 2 seconds
        }
      };
      pollStatus(newPdfUuid);
    } catch (err) {
      setIsAnalyzing(false);
logFrontendAction({
  actionType: 'ANALYSIS FAILURE',
  component: 'MainContent',
  level: 'error',
  details: { fileName: selectedFile?.name, error: err?.message }
});
toast({
  title: "Error",
  description: "Error analyzing PDF",
  variant: "destructive",
  duration: 3000
});
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
    // setSelectedResources(extractedResources.map(r => r.id));
    setSelectedResources(
      extractedResources
        .filter(resource => selectedType === "__ALL__" || resource.type === selectedType)
        .filter(resource => resource.title.toLowerCase().includes(filterText.toLowerCase()))
        .map(r => r.id)
    );
  };

  // Deselect all resources button handler
  const handleDeselectAllResources = () => {
    setSelectedResources([]);
  };

  // Save selected resources
  const saveSelectedResources = async () => {
  logFrontendAction({
    actionType: 'SAVE RESOURCES',
    component: 'MainContent',
    level: 'info',
    details: { pdfUuid, fileName, selectedCount: selectedResources.length }
  });
  setSavingResources(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      if (!pdfUuid) throw new Error("No PDF UUID found");
      if (!fileName) throw new Error("No PDF title found");
      if (selectedResources.length === 0) throw new Error("No resources selected");
      
      const db = getFirestore();
      
      // 1. Create/update the parent PDF document
      const pdfDocRef = doc(db, "users", user.uid, "pdfs", pdfUuid);
      await setDoc(pdfDocRef, { title: fileName, uuid: pdfUuid });
      
      // 2. Save each selected resource
      const batch = [];
      for (const resourceId of selectedResources) {
        const resource = extractedResources.find(r => r.id === resourceId);
        if (!resource) continue;
        const resourceRef = doc(collection(db, "users", user.uid, "pdfs", pdfUuid, "resources"));
        // Overwrite id to Firestore doc ID
        const resourceWithId = { ...resource, id: resourceRef.id };
        batch.push(setDoc(resourceRef, resourceWithId));
      }
      await Promise.all(batch);
      setFileSelected(false);
      setFileName("");
      setSelectedResources([]);
      setSelectedFile(null);
      setShowResults(false); // Close the saved resource modal after saving
      toast({
        title: "Success",
        description: "Resources saved successfully!",
        variant: "default",
        duration: 3000
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save resources: " + (err && typeof err === 'object' && 'message' in err ? err.message : String(err)),
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setSavingResources(false);
    }
  }

  const clearUploadState = () => {
    setFileSelected(false);
    setFileName("");
    setPdfUuid(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('pdfUuid');
    }
    setSelectedFile(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-4 border-b px-6">
        <SidebarTrigger className="-ml-2" />
        <h2 className="text-lg font-semibold">{`Welcome${userName ? ", " + userName : ""}`}</h2>
      </header>
      <div className="flex-1 p-6">
        <div className="rounded-lg border border-border p-8 text-center">
          <h3 className="text-xl font-medium mb-4">Upload a PDF to analyze</h3>
          <p className="text-muted-foreground mb-6">Transform your PDFs into structured learning resources</p>
          <div className="flex flex-col items-center">
            <div
              className={`w-full max-w-md p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center mb-6 ${isAnalyzing ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:border-primary/50 transition-colors'}`}
              onClick={() => {
                if (isAnalyzing) return; // Prevent click
                document.getElementById("pdf-upload")?.click();
              }}
              onDrop={isAnalyzing ? undefined : handleDrop}
              onDragOver={isAnalyzing ? undefined : handleDragOver}
              style={{ opacity: isAnalyzing ? 0.6 : 1 }}
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
                          if (user) {
                            const idToken = await user.getIdToken();
                            await fetch("http://localhost:8000/api/delete-pdf", {
                              method: "DELETE",
                              headers: {
                                "Content-Type": "application/json",
                                "x-firebase-token": idToken,
                              },
                              body: JSON.stringify({ filename: fileName, uuid: pdfUuid }),
                            });
                          }
                        } catch (err) {
                          toast({
                            title: "Error",
                            description: err && typeof err === 'object' && 'message' in err ? err.message : String(err),
                            variant: "destructive",
                            duration: 3000
                          });
                        }
                      }
                      clearUploadState();
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
                  haltingProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Halting process...
                    </>
                  ) : (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing your request...
                    </>
                  )
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
              {/* Cancel Processing Button */}
              <Button
                size="lg"
                variant="destructive"
                disabled={!isAnalyzing || haltingProcessing}
                onClick={async () => {
                  if (!pdfUuid) return;
                  setHaltingProcessing(true);
                  try {
                    const user = auth.currentUser;
                    if (user) {
                      const idToken = await user.getIdToken();
                      const resp = await fetch("http://localhost:8000/api/halt_pdf_process", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-firebase-token": idToken,
                        },
                        body: JSON.stringify({ uuid: pdfUuid }),
                      });
                      if (!resp.ok) throw new Error("Failed to halt processing");
                      console.log("Processing cancelled");
                    }
                  } catch (err) {
                    toast({
                      title: "Error",
                      description: "Failed to cancel processing",
                      variant: "destructive",
                      duration: 3000
                    });
                  } finally {
                    setHaltingProcessing(false);
                  }
                }}
              >
                {haltingProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Processing"
                )}
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
              <div className="flex items-center gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Search by title..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Types</SelectItem>
                    {Array.from(new Set(extractedResources.map(r => r.type).filter(Boolean))).map(type => (
                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {extractedResources && extractedResources.length > 0 && (
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

              {/* Scrollable resource list if more than 5 */}
              <div className={`space-y-2${extractedResources.length > 5 ? ' max-h-80 overflow-y-auto pr-2' : ''}`}>
                {extractedResources
  .filter(resource => resource.title.toLowerCase().includes(filterText.toLowerCase()))
  .filter(resource => selectedType === "__ALL__" || resource.type === selectedType)
  .map((resource) => (
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

      {/* Upload confirmation dialog */}
      {showUploadConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
            <p className="mb-4">A PDF is currently being processed. Are you sure you want to upload a new PDF? This will stop the current process.</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowUploadConfirm(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-500 text-white" onClick={async () => {
                setShowUploadConfirm(false);
                // Request backend to halt previous process if possible
                if (pdfUuid) {
                  try {
                    const user = auth.currentUser;
                    if (user) {
                      const idToken = await user.getIdToken();
                      await fetch("http://localhost:8000/api/halt_pdf_process", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-firebase-token": idToken,
                        },
                        body: JSON.stringify({ uuid: pdfUuid }),
                      });
                    }
                  } catch (e) {
                    // Optionally log or ignore
                  }
                }
                clearUploadState();
                if (fileInputRef.current) fileInputRef.current.value = "";
                if (pendingUpload.current) {
                  pendingUpload.current();
                  pendingUpload.current = null;
                }
              }}>Upload New PDF</button>
            </div>
          </div>
        </div>
      )}
    </SidebarInset>
  )
}
