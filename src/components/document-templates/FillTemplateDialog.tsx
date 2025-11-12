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
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";

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

  const fillMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      // For now, we'll use sample data to test the conversion
      // In a real implementation, you'd fill the Word doc with this data first
      
      // Call the convert-word-to-pdf function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

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

      const result = await response.json();
      return result;
    },
    onSuccess: (result) => {
      toast.success("PDF generated successfully!");
      
      // Download the PDF
      if (result.pdfUrl) {
        window.open(result.pdfUrl, "_blank");
      }
      
      onOpenChange(false);
      setPlaceholderData({});
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate PDF: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fillMutation.mutate(placeholderData);
  };

  // Common placeholder fields for testing
  const sampleFields = [
    { key: "project_name", label: "Project Name", placeholder: "e.g., Segonyana Mall" },
    { key: "client_name", label: "Client Name", placeholder: "e.g., ABC Properties" },
    { key: "report_title", label: "Report Title", placeholder: "e.g., Electrical Design Report" },
    { key: "date", label: "Date", placeholder: "e.g., 2025-01-15" },
    { key: "revision", label: "Revision", placeholder: "e.g., Rev 1" },
    { key: "description", label: "Description", placeholder: "Enter description..." },
  ];

  return (
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

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Placeholder Values</h4>
              <p className="text-sm text-muted-foreground">
                Fill in the values that will replace placeholders in the template. 
                Placeholders in your Word doc should be formatted as: {"{"}placeholder_name{"}"}
              </p>
              
              {sampleFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({"{"}
                      {field.key}
                      {"}"})
                    </span>
                  </Label>
                  {field.key === "description" ? (
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
          </div>

          <div className="flex gap-3 justify-end">
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
  );
}
