import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generate } from "@pdfme/generator";
import { Template } from "@pdfme/common";
import { text, image, barcodes } from "@pdfme/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";

interface TemplateExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: any;
  projectId: string;
}

export const TemplateExportDialog = ({
  open,
  onOpenChange,
  report,
  projectId,
}: TemplateExportDialogProps) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["pdf-templates", projectId, "cost_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_templates")
        .select("*")
        .eq("project_id", projectId)
        .eq("category", "cost_report")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const mapReportDataToTemplate = (template: Template): any[] => {
    // Map cost report data to template inputs
    // This is a simple mapping - you can extend this based on your template fields
    return [
      {
        title: report.report_name || "Cost Report",
        report_number: report.report_number || "",
        project_name: report.projects?.name || "",
        date: format(new Date(), "dd MMMM yyyy"),
        // Add more mappings based on your template schema
      },
    ];
  };

  const handleExport = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const template = templates?.find((t) => t.id === selectedTemplate);
      if (!template) throw new Error("Template not found");

      const inputs = mapReportDataToTemplate(template.template_json as Template);

      const pdf = await generate({
        template: template.template_json as Template,
        inputs,
        plugins: {
          text,
          image,
          qrcode: barcodes.qrcode,
        },
      });

      // Download PDF
      const blob = new Blob([pdf.buffer], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.report_name}_${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF generated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export with Template</DialogTitle>
          <DialogDescription>
            Select a PDF template to generate your cost report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading templates...
            </div>
          ) : templates && templates.length > 0 ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{template.name}</span>
                          {template.is_default && (
                            <span className="text-xs text-muted-foreground">(Default)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2">Template Info</h4>
                  <p className="text-sm text-muted-foreground">
                    {templates.find((t) => t.id === selectedTemplate)?.description ||
                      "No description"}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No templates found. Create a template first.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  window.open(`/dashboard/pdf-templates/${projectId}`, "_blank");
                }}
              >
                Create Template
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedTemplate || isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Generating..." : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
