import { useState, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  FileText, 
  Loader2, 
  Check, 
  X, 
  AlertCircle,
  Sparkles,
  FolderOpen
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExtractedInvoice {
  file: File;
  fileName: string;
  status: "pending" | "extracting" | "extracted" | "error";
  error?: string;
  data?: {
    invoice_number: string;
    invoice_date: string;
    invoice_month: string;
    client_name: string;
    client_vat_number: string;
    job_name: string;
    amount_excl_vat: number;
    vat_amount: number;
    amount_incl_vat: number;
    claim_number: string;
    notes: string;
  };
  selected: boolean;
  projectId?: string;
}

interface InvoicePDFUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePDFUploader({ open, onOpenChange }: InvoicePDFUploaderProps) {
  const [files, setFiles] = useState<ExtractedInvoice[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["invoice-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("project_name");
      if (error) throw error;
      return data;
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter(f => f.type === "application/pdf");
    
    if (pdfFiles.length !== selectedFiles.length) {
      toast.warning("Some files were skipped - only PDF files are accepted");
    }

    const newFiles: ExtractedInvoice[] = pdfFiles.map(file => ({
      file,
      fileName: file.name,
      status: "pending",
      selected: true,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(f => f.type === "application/pdf");
    
    if (pdfFiles.length !== droppedFiles.length) {
      toast.warning("Some files were skipped - only PDF files are accepted");
    }

    const newFiles: ExtractedInvoice[] = pdfFiles.map(file => ({
      file,
      fileName: file.name,
      status: "pending",
      selected: true,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const extractInvoiceData = async (file: File): Promise<ExtractedInvoice["data"]> => {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Add timeout to prevent stuck requests (60 second timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const { data, error } = await supabase.functions.invoke("extract-invoice-pdf", {
        body: { pdfBase64: base64, fileName: file.name },
      });

      clearTimeout(timeoutId);

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction failed - no data returned");

      return data.data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error("Extraction timed out after 60 seconds");
      }
      throw err;
    }
  };

  // Smart matching: find project by job name similarity
  const findMatchingProject = (jobName: string): string | undefined => {
    if (!jobName || projects.length === 0) return undefined;
    
    const normalizedJobName = jobName.toLowerCase().trim();
    
    // First try exact match on project name
    const exactMatch = projects.find(p => 
      p.project_name.toLowerCase().trim() === normalizedJobName
    );
    if (exactMatch) return exactMatch.id;
    
    // Extract base project name (remove suffixes like "- AUDIT REPORT", "- ELECTRICAL INSTALLATION")
    const baseJobName = normalizedJobName
      .replace(/\s*-\s*(audit report|electrical installation|pv installation|electricall installation).*$/i, '')
      .trim();
    
    // Try matching on base name
    const baseMatch = projects.find(p => {
      const projectBase = p.project_name.toLowerCase().trim();
      return projectBase === baseJobName || 
             projectBase.includes(baseJobName) || 
             baseJobName.includes(projectBase);
    });
    if (baseMatch) return baseMatch.id;
    
    // Try partial word matching (at least 2 significant words match)
    const jobWords = baseJobName.split(/\s+/).filter(w => w.length > 2);
    let bestMatch: { project: typeof projects[0]; score: number } | null = null;
    
    for (const project of projects) {
      const projectWords = project.project_name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matchingWords = jobWords.filter(jw => 
        projectWords.some(pw => pw.includes(jw) || jw.includes(pw))
      );
      const score = matchingWords.length;
      
      if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { project, score };
      }
    }
    
    return bestMatch?.project.id;
  };

  const handleExtractAll = async () => {
    // Capture pending file indices at the start
    const pendingIndices: number[] = [];
    files.forEach((f, idx) => {
      if (f.status === "pending") pendingIndices.push(idx);
    });

    if (pendingIndices.length === 0) {
      toast.info("No pending files to process");
      return;
    }

    const batchTotal = pendingIndices.length;
    setIsProcessing(true);
    setProcessedCount(0);
    setTotalToProcess(batchTotal);
    
    let processed = 0;
    let successCount = 0;
    let matchedCount = 0;

    for (const fileIndex of pendingIndices) {
      // Get fresh file reference from state
      const currentFile = files[fileIndex];
      if (!currentFile || currentFile.status !== "pending") {
        processed++;
        setProcessedCount(processed);
        continue;
      }

      // Mark as extracting
      setFiles(prev => prev.map((f, idx) => 
        idx === fileIndex ? { ...f, status: "extracting" } : f
      ));

      try {
        const data = await extractInvoiceData(currentFile.file);
        // Auto-match to project based on job name
        const matchedProjectId = findMatchingProject(data?.job_name || "");
        
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, status: "extracted", data, projectId: matchedProjectId } : f
        ));
        
        successCount++;
        if (matchedProjectId) matchedCount++;
      } catch (error: any) {
        console.error(`Error extracting ${currentFile.fileName}:`, error);
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, status: "error", error: error.message || "Unknown error" } : f
        ));
      }

      processed++;
      setProcessedCount(processed);
      
      // Small delay between requests to avoid rate limiting
      if (processed < batchTotal) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    
    if (successCount > 0) {
      toast.success(`AI extraction complete: ${successCount}/${batchTotal} succeeded. ${matchedCount} auto-matched to projects.`);
    } else {
      toast.error(`Extraction failed for all ${batchTotal} files. Check the errors.`);
    }
  };

  const toggleFileSelection = (index: number) => {
    setFiles(prev => prev.map((f, idx) => 
      idx === index ? { ...f, selected: !f.selected } : f
    ));
  };

  const toggleSelectAll = () => {
    const extractedFiles = files.filter(f => f.status === "extracted");
    const allSelected = extractedFiles.every(f => f.selected);
    setFiles(prev => prev.map(f => 
      f.status === "extracted" ? { ...f, selected: !allSelected } : f
    ));
  };

  const updateFileProject = (index: number, projectId: string) => {
    setFiles(prev => prev.map((f, idx) => 
      idx === index ? { ...f, projectId: projectId === "none" ? undefined : projectId } : f
    ));
  };

  const applyDefaultProject = () => {
    if (!defaultProjectId) return;
    setFiles(prev => prev.map(f => 
      f.status === "extracted" && !f.projectId 
        ? { ...f, projectId: defaultProjectId === "none" ? undefined : defaultProjectId } 
        : f
    ));
    toast.success("Default project applied to unassigned invoices");
  };

  const handleSave = async () => {
    const selectedFiles = files.filter(f => f.selected && f.status === "extracted" && f.data);
    if (selectedFiles.length === 0) {
      toast.error("No extracted invoices selected");
      return;
    }

    setIsSaving(true);

    try {
      for (const file of selectedFiles) {
        if (!file.data) continue;

        // Upload PDF to storage organized by month
        const month = file.data.invoice_month || format(new Date(), "yyyy-MM");
        const filePath = `${month}/${file.data.invoice_number || Date.now()}_${file.fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("invoice-pdfs")
          .upload(filePath, file.file, { upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          // Continue even if upload fails - still save the extracted data
        }

        // Calculate VAT amount if not provided (15% South African VAT)
        let vatAmount = file.data.vat_amount;
        if (!vatAmount && file.data.amount_excl_vat && file.data.amount_incl_vat) {
          vatAmount = file.data.amount_incl_vat - file.data.amount_excl_vat;
        } else if (!vatAmount && file.data.amount_incl_vat) {
          vatAmount = file.data.amount_incl_vat * 0.15 / 1.15;
        } else if (!vatAmount && file.data.amount_excl_vat) {
          vatAmount = file.data.amount_excl_vat * 0.15;
        }

        // Insert invoice record
        const { error: insertError } = await supabase
          .from("invoice_history")
          .insert({
            invoice_number: file.data.invoice_number || `UNKNOWN-${Date.now()}`,
            invoice_date: file.data.invoice_date || null,
            invoice_month: file.data.invoice_month || format(new Date(), "yyyy-MM"),
            job_name: file.data.job_name || file.fileName,
            client_details: file.data.client_name || null,
            vat_number: file.data.client_vat_number || null,
            amount_excl_vat: file.data.amount_excl_vat || null,
            vat_amount: vatAmount ? Math.round(vatAmount * 100) / 100 : null,
            amount_incl_vat: file.data.amount_incl_vat || null,
            project_id: file.projectId || null,
            pdf_file_path: filePath,
            extracted_by_ai: true,
            notes: file.data.claim_number 
              ? `Claim: ${file.data.claim_number}${file.data.notes ? `. ${file.data.notes}` : ""}`
              : file.data.notes || null,
          });

        if (insertError) throw insertError;
      }

      toast.success(`${selectedFiles.length} invoice(s) imported successfully`);
      queryClient.invalidateQueries({ queryKey: ["invoice-history"] });
      onOpenChange(false);
      setFiles([]);
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return "-";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const pendingCount = files.filter(f => f.status === "pending").length;
  const extractedCount = files.filter(f => f.status === "extracted").length;
  const errorCount = files.filter(f => f.status === "error").length;
  const selectedCount = files.filter(f => f.selected && f.status === "extracted").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Invoice PDF Extractor
          </DialogTitle>
          <DialogDescription>
            Upload PDF invoices and let AI extract the data automatically. Files will be stored organized by month.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Upload Area */}
          {files.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("pdf-upload")?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Drop PDF invoices here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <Input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <>
              {/* Status Bar */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="outline">{files.length} files</Badge>
                  {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
                  {extractedCount > 0 && <Badge className="bg-green-500">{extractedCount} extracted</Badge>}
                  {errorCount > 0 && <Badge variant="destructive">{errorCount} errors</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("pdf-upload-more")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                  <Input
                    id="pdf-upload-more"
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    size="sm"
                    onClick={handleExtractAll}
                    disabled={isProcessing || pendingCount === 0}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Extract All ({pendingCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Progress */}
              {isProcessing && totalToProcess > 0 && (
                <div className="space-y-2">
                  <Progress value={(processedCount / totalToProcess) * 100} />
                  <p className="text-sm text-muted-foreground text-center">
                    Processing {processedCount} of {totalToProcess} files...
                  </p>
                </div>
              )}

              {/* Default Project Assignment */}
              {extractedCount > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <Label className="whitespace-nowrap">Assign to project:</Label>
                  <Select value={defaultProjectId} onValueChange={setDefaultProjectId}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select default project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={applyDefaultProject} disabled={!defaultProjectId}>
                    Apply to Unassigned
                  </Button>
                </div>
              )}

              {/* File List */}
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox 
                          checked={extractedCount > 0 && files.filter(f => f.status === "extracted").every(f => f.selected)}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>File / Invoice</TableHead>
                      <TableHead>Job Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file, index) => (
                      <TableRow key={index} className={file.status === "error" ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={file.selected}
                            onCheckedChange={() => toggleFileSelection(index)}
                            disabled={file.status !== "extracted"}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium truncate max-w-[200px]">
                                {file.data?.invoice_number || file.fileName}
                              </p>
                              {file.data?.invoice_number && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {file.fileName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="truncate max-w-[200px] block">
                            {file.data?.job_name || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {file.data?.invoice_date || "-"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(file.data?.amount_incl_vat)}
                        </TableCell>
                        <TableCell>
                          {file.status === "extracted" ? (
                            <Select 
                              value={file.projectId || "none"} 
                              onValueChange={(v) => updateFileProject(index, v)}
                            >
                              <SelectTrigger className="h-8 w-[150px]">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No project</SelectItem>
                                {projects.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {file.status === "pending" && (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                            {file.status === "extracting" && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                            {file.status === "extracted" && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                            {file.status === "error" && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <span className="text-xs text-destructive truncate max-w-[100px]" title={file.error}>
                                  {file.error}
                                </span>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setFiles([]); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || selectedCount === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4 mr-2" />
                Import {selectedCount} Invoice(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
