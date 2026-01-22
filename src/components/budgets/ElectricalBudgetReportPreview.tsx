import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, X, FileText, Calendar, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ElectricalBudgetReport {
  id: string;
  budget_id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  revision: string;
  generated_at: string;
  notes?: string;
}

interface ElectricalBudgetReportPreviewProps {
  report: ElectricalBudgetReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storageBucket?: string;
}

export const ElectricalBudgetReportPreview = ({
  report,
  open,
  onOpenChange,
  storageBucket = "budget-reports",
}: ElectricalBudgetReportPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && report?.file_path) {
      loadPreview();
    } else {
      setPreviewUrl(null);
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [open, report?.file_path]);

  const loadPreview = async () => {
    if (!report?.file_path) return;

    setLoading(true);
    try {
      console.log('[Preview] Loading PDF from:', report.file_path);
      
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);

      if (error) {
        console.error('[Preview] Storage error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data received from storage');
      }

      console.log('[Preview] Downloaded blob:', data.size, 'bytes, type:', data.type);
      
      // Create blob URL with explicit PDF type
      const pdfBlob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      console.log('[Preview] Created blob URL:', url);
      setPreviewUrl(url);
    } catch (error) {
      console.error("Failed to load preview:", error);
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Could not load the PDF preview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!report?.file_path) return;

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `${report.file_name} downloaded successfully`,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Budget Report Preview
          </DialogTitle>
          <DialogDescription>
            Preview and download your generated budget report
          </DialogDescription>
        </DialogHeader>

        {/* Report Info Badges */}
        {report && (
          <div className="flex flex-wrap gap-2 py-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Rev {report.revision}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(report.generated_at), "dd MMM yyyy HH:mm")}
            </Badge>
            <Badge variant="secondary">
              {formatFileSize(report.file_size)}
            </Badge>
          </div>
        )}

        {/* Preview Area */}
        <div className="flex-1 min-h-[500px] border rounded-lg bg-muted/30 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          ) : previewUrl ? (
            <object
              data={`${previewUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="w-full h-full"
              title="Budget Report Preview"
            >
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <FileText className="h-16 w-16 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground text-center">
                  PDF preview not supported in your browser.
                </p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            </object>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No report to preview
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!report || downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
