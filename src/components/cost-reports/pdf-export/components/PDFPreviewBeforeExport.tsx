import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ChevronLeft, ChevronRight, Check, Loader2, ChevronDown, ChevronUp, Cloud } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ComplianceReport } from "@/utils/pdfComplianceChecker";
import { ComplianceScoreBadge } from "@/components/pdf/ComplianceScoreBadge";
import { ComplianceChecklist } from "@/components/pdf/ComplianceChecklist";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropboxSaveButton } from "@/components/storage/DropboxSaveButton";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewBeforeExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  fileName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  complianceReport?: ComplianceReport;
}

export function PDFPreviewBeforeExport({
  open,
  onOpenChange,
  pdfBlob,
  fileName,
  onConfirm,
  onCancel,
  isSaving = false,
  complianceReport,
}: PDFPreviewBeforeExportProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [complianceOpen, setComplianceOpen] = useState(false);

  // Create and clean up blob URL when blob changes
  useEffect(() => {
    if (pdfBlob && open) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    } else {
      setPdfUrl(null);
    }
  }, [pdfBlob, open]);

  // Reset page number when dialog opens
  useEffect(() => {
    if (open) {
      setPageNumber(1);
      setNumPages(0);
    }
  }, [open]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handleDownloadPreview = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PREVIEW_${fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !isSaving) {
        handleCancel();
      }
    }}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate max-w-[300px]">Preview: {fileName}</span>
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                Not saved yet
              </span>
              {complianceReport && (
                <ComplianceScoreBadge score={complianceReport.overallScore} />
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadPreview}
              disabled={!pdfBlob}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Preview
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Compliance Panel */}
        {complianceReport && (
          <Collapsible open={complianceOpen} onOpenChange={setComplianceOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between px-3 py-2 h-auto"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Standards Compliance</span>
                  <span className="text-muted-foreground">
                    ({complianceReport.passedCount}/{complianceReport.results.length} passed)
                  </span>
                </span>
                {complianceOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 mb-2">
                <ComplianceChecklist results={complianceReport.results} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex-1 overflow-auto rounded-lg border bg-muted flex flex-col items-center p-4 min-h-0">
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <p className="text-destructive">Failed to load PDF preview</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                width={Math.min(800, window.innerWidth - 100)}
              />
            </Document>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {numPages > 1 && (
            <div className="flex items-center gap-4 mt-4 p-2 bg-background rounded-lg border sticky bottom-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageNumber(page => Math.max(1, page - 1))}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          <DropboxSaveButton
            fileContent={pdfBlob}
            filename={fileName}
            contentType="application/pdf"
            disabled={!pdfBlob}
            buttonText="Save to Dropbox"
          />
          
          <Button
            onClick={handleConfirm}
            disabled={isSaving || !pdfBlob}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save & Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
