import { useEffect, useRef, useState } from "react";
import { Viewer } from "@pdfme/ui";
import { Template } from "@pdfme/common";
import { generate } from "@pdfme/generator";
import { text, image, barcodes } from "@pdfme/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Settings2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bindReportDataToTemplate } from "@/utils/bindReportDataToTemplate";

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template;
  reportId: string;
  projectId: string;
  category: "cost_report" | "cable_schedule" | "final_account";
  onCustomize?: () => void;
}

export const PDFPreviewDialog = ({
  open,
  onOpenChange,
  template,
  reportId,
  projectId,
  category,
  onCustomize,
}: PDFPreviewDialogProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [inputs, setInputs] = useState<any[]>([]);

  // Load report data and bind to template
  useEffect(() => {
    const loadData = async () => {
      if (!open) return;
      
      setIsLoading(true);
      try {
        console.log("Loading report data for preview:", { reportId, projectId, category });
        const boundInputs = await bindReportDataToTemplate(
          template,
          reportId,
          projectId,
          category
        );
        console.log("Successfully bound inputs:", boundInputs);
        setInputs(boundInputs);
      } catch (error) {
        console.error("Failed to load report data:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load report data for preview",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [open, template, reportId, projectId, category, toast]);

  // Initialize pdfme viewer
  useEffect(() => {
    if (!containerRef.current || !open || isLoading || inputs.length === 0) return;

    const viewer = new Viewer({
      domContainer: containerRef.current,
      template: template,
      inputs: inputs,
      plugins: {
        text,
        image,
        qrcode: barcodes.qrcode,
      },
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [template, inputs, open, isLoading]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = await generate({
        template,
        inputs,
        plugins: {
          text,
          image,
          qrcode: barcodes.qrcode,
        },
      });

      const blob = new Blob([pdf.buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report_${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>PDF Preview</DialogTitle>
          <DialogDescription>
            Review your report with real data before exporting or customizing
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Loading report data...</p>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="w-full h-full" />
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCustomize}
            disabled={isLoading}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Customize Layout
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={isLoading || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
