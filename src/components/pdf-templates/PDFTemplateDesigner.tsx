import { useEffect, useRef, useState } from "react";
import { Designer } from "@pdfme/ui";
import { Template } from "@pdfme/common";
import { text, image, barcodes } from "@pdfme/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Download, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PDFTemplateDesignerProps {
  templateId?: string;
  category: string;
  projectId: string;
  onSave?: (templateId: string) => void;
}

const getBlankTemplate = (): Template => ({
  basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
  schemas: [
    [
      {
        name: "title",
        type: "text",
        position: { x: 20, y: 20 },
        width: 170,
        height: 10,
        fontSize: 20,
        fontColor: "#000000",
      },
    ],
  ],
});

export const PDFTemplateDesigner = ({
  templateId,
  category,
  projectId,
  onSave,
}: PDFTemplateDesignerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<Designer | null>(null);
  const { toast } = useToast();
  
  const [template, setTemplate] = useState<Template>(getBlankTemplate());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load existing template if templateId provided
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) return;

      const { data, error } = await supabase
        .from("pdf_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load template",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setTemplate(data.template_json as Template);
        setTemplateName(data.name);
        setTemplateDescription(data.description || "");
      }
    };

    loadTemplate();
  }, [templateId, toast]);

  // Initialize pdfme designer
  useEffect(() => {
    if (!containerRef.current) return;

    const designer = new Designer({
      domContainer: containerRef.current,
      template: template,
      plugins: {
        text,
        image,
        qrcode: barcodes.qrcode,
      },
    });

    designerRef.current = designer;

    // Save template changes
    designer.onChangeTemplate((updatedTemplate) => {
      setTemplate(updatedTemplate);
    });

    return () => {
      designer.destroy();
      designerRef.current = null;
    };
  }, []);

  // Update template when loaded
  useEffect(() => {
    if (designerRef.current && template) {
      designerRef.current.updateTemplate(template);
    }
  }, [template]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const templateData = {
        name: templateName,
        description: templateDescription,
        template_json: template as any, // Cast to any for JSONB storage
        category,
        project_id: projectId,
        created_by: user.id,
      };

      if (templateId) {
        // Update existing template
        const { error } = await supabase
          .from("pdf_templates")
          .update(templateData)
          .eq("id", templateId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Template updated successfully",
        });
      } else {
        // Create new template
        const { data, error } = await supabase
          .from("pdf_templates")
          .insert([templateData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Template created successfully",
        });

        if (data && onSave) {
          onSave(data.id);
        }
      }

      setShowSaveDialog(false);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportTemplate = () => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `template_${Date.now()}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleImportTemplate = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedTemplate = JSON.parse(event.target?.result as string);
          setTemplate(importedTemplate);
          toast({
            title: "Success",
            description: "Template imported successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Invalid template file",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div>
          <h2 className="text-xl font-semibold">PDF Template Designer</h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop elements to design your PDF template
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportTemplate}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowSaveDialog(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 bg-muted/30" />

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save PDF Template</DialogTitle>
            <DialogDescription>
              Give your template a name and description
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Executive Summary Template"
              />
            </div>

            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
