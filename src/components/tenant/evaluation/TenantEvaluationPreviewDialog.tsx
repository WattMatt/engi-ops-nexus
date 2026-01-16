import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
}

interface TenantEvaluation {
  id: string;
  tenant_id: string;
  evaluation_date: string;
  evaluated_by: string;
  revision: number;
  status: string;
}

interface TenantEvaluationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: TenantEvaluation;
  tenant: Tenant;
  projectName: string;
}

export function TenantEvaluationPreviewDialog({
  open,
  onOpenChange,
  evaluation,
  tenant,
  projectName,
}: TenantEvaluationPreviewDialogProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch saved report
  const { data: report, isLoading } = useQuery({
    queryKey: ["tenant-evaluation-report", evaluation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_evaluation_reports")
        .select("*")
        .eq("evaluation_id", evaluation.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: open,
  });

  // Load PDF URL when report is found
  const { isLoading: isLoadingPdf } = useQuery({
    queryKey: ["tenant-evaluation-pdf-url", report?.file_path],
    queryFn: async () => {
      if (!report?.file_path) return null;
      
      const { data } = supabase.storage
        .from("tenant-evaluation-reports")
        .getPublicUrl(report.file_path);
      
      setPdfUrl(data.publicUrl + `?t=${Date.now()}`);
      return data.publicUrl;
    },
    enabled: !!report?.file_path,
  });

  const handleDownload = async () => {
    if (!report?.file_path) return;
    
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("tenant-evaluation-reports")
        .download(report.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.report_name || `evaluation-${tenant.shop_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Report downloaded");
    } catch (error: any) {
      toast.error(`Failed to download: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "approved":
        return <Badge className="bg-blue-500">Approved</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evaluation Report - {tenant.shop_number}
              <span className="text-muted-foreground ml-2">Rev {evaluation.revision}</span>
              {getStatusBadge(evaluation.status)}
            </DialogTitle>
            {report && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {projectName} • {tenant.shop_name} • Evaluated by {evaluation.evaluated_by} on{" "}
            {format(new Date(evaluation.evaluation_date), "dd MMMM yyyy")}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 rounded-lg border bg-muted/30">
          <div className="p-4 flex flex-col items-center">
            {isLoading || isLoadingPdf ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading report...</span>
              </div>
            ) : !report ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No Report Generated</h3>
                <p className="text-muted-foreground mt-2">
                  This evaluation has not been saved with a generated report yet.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Edit the evaluation and click "Save & Generate Report" to create the PDF.
                </p>
              </div>
            ) : pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error("PDF load error:", error);
                  toast.error("Failed to load PDF preview");
                }}
                loading={
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                }
              >
                {Array.from(new Array(numPages || 1), (_, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={700}
                    className="mb-4 shadow-lg"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                ))}
              </Document>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
