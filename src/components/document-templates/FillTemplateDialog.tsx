import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FileText, Loader2, Download, CheckCircle2 } from "lucide-react";
import { PDFPreviewDialog } from "./PDFPreviewDialog";

interface FillTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
}

export function FillTemplateDialog({
  open,
  onOpenChange,
  template,
}: FillTemplateDialogProps) {
  const [placeholderData, setPlaceholderData] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<{ url: string; fileName: string } | null>(null);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const fillMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      setProcessingStep("Downloading template...");
      setProgress(20);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStep("Filling placeholders...");
      setProgress(40);
      
      // Call the convert-word-to-pdf function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      setProcessingStep("Converting to PDF...");
      setProgress(60);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-word-to-pdf`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateUrl: template.file_url,
            templateId: template.id,
            placeholderData: data,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Conversion failed");
      }

      setProgress(80);

      const result = await response.json();
      
      setProcessingStep("Finalizing...");
      setProgress(100);
      
      return result;
    },
    onSuccess: (result) => {
      toast.success("PDF generated successfully!");
      
      // Show preview dialog
      if (result.pdfUrl) {
        setGeneratedPdf({
          url: result.pdfUrl,
          fileName: result.fileName || "document.pdf",
        });
        setShowPreview(true);
      }
      
      onOpenChange(false);
      setPlaceholderData({});
      setProcessingStep("");
      setProgress(0);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate PDF: ${error.message}`);
      setProcessingStep("");
      setProgress(0);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fillMutation.mutate(placeholderData);
  };

  // Common placeholder fields organized by section
  const fieldSections = [
    {
      title: "Report Details",
      fields: [
        { key: "project_name", label: "Project Name", placeholder: "e.g., Segonyana Mall" },
        { key: "client_name", label: "Client Name", placeholder: "e.g., ABC Properties" },
        { key: "report_title", label: "Report Title", placeholder: "e.g., Electrical Design Report" },
        { key: "date", label: "Date", placeholder: "e.g., Wednesday, November 12, 2025" },
        { key: "revision", label: "Revision", placeholder: "e.g., Rev 0" },
      ]
    },
    {
      title: "Prepared For (Client)",
      fields: [
        { key: "prepared_for_company", label: "Company Name", placeholder: "e.g., Super Quality Properties (PTY) LTD" },
        { key: "prepared_for_address", label: "Address", placeholder: "e.g., 1st Avenue 122, Germiston Glen\nTel: 011 826 3400" },
        { key: "prepared_for_contact", label: "Contact Person", placeholder: "e.g., Contact: Mr. Kosatha Meyer" },
      ]
    },
    {
      title: "Prepared By (Your Company)",
      fields: [
        { key: "prepared_by_company", label: "Company Name", placeholder: "e.g., WM ELECTRICAL CONSULTING ELECTRICAL ENGINEERS (PTY) LTD" },
        { key: "prepared_by_address", label: "Address", placeholder: "e.g., Reg No: 2016/034799/07\nBuilding 14\nTel: 087 700 2560" },
        { key: "prepared_by_contact", label: "Contact Person", placeholder: "e.g., Email: support@wmeng.co.za" },
      ]
    }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fill Template: {template?.name}
          </DialogTitle>
          <DialogDescription>
            Enter values for the template placeholders. Use format: {"{"}placeholder_name{"}"} in your Word document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Template Information</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Type:</strong> {template?.template_type}</p>
                <p><strong>File:</strong> {template?.file_name}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Placeholder Values</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Fill in the values that will replace placeholders in the template. 
                  Placeholders in your Word doc should be formatted as: {"{"}placeholder_name{"}"}
                </p>
              </div>
              
              {fieldSections.map((section) => (
                <div key={section.title} className="space-y-4">
                  <h5 className="text-sm font-semibold border-b pb-2">{section.title}</h5>
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>
                        {field.label}
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({"{"}
                          {field.key}
                          {"}"})
                        </span>
                      </Label>
                      {field.key.includes("address") || field.key.includes("contact") ? (
                        <Textarea
                          id={field.key}
                          placeholder={field.placeholder}
                          value={placeholderData[field.key] || ""}
                          onChange={(e) =>
                            setPlaceholderData((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={field.key}
                          placeholder={field.placeholder}
                          value={placeholderData[field.key] || ""}
                          onChange={(e) =>
                            setPlaceholderData((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {fillMutation.isPending && (
            <div className="space-y-4 p-6 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{processingStep}</p>
                  <Progress value={progress} className="h-2 mt-2" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div className={`flex items-center gap-1 ${progress >= 20 ? 'text-primary' : ''}`}>
                  {progress >= 20 ? <CheckCircle2 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  <span>Download</span>
                </div>
                <div className={`flex items-center gap-1 ${progress >= 40 ? 'text-primary' : ''}`}>
                  {progress >= 40 ? <CheckCircle2 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  <span>Fill Data</span>
                </div>
                <div className={`flex items-center gap-1 ${progress >= 60 ? 'text-primary' : ''}`}>
                  {progress >= 60 ? <CheckCircle2 className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                  <span>Convert</span>
                </div>
                <div className={`flex items-center gap-1 ${progress >= 100 ? 'text-primary' : ''}`}>
                  {progress >= 100 ? <CheckCircle2 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3 opacity-30" />}
                  <span>Complete</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setPlaceholderData({});
              }}
              disabled={fillMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={fillMutation.isPending}>
              {fillMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate PDF
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {generatedPdf && (
      <PDFPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        pdfUrl={generatedPdf.url}
        fileName={generatedPdf.fileName}
      />
    )}
    </>
  );
}
