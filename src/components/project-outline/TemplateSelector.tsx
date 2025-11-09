import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Settings } from "lucide-react";
import { useState } from "react";
import { ManageTemplatesDialog } from "./ManageTemplatesDialog";

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string | null) => void;
}

export const TemplateSelector = ({ selectedTemplateId, onTemplateSelect }: TemplateSelectorProps) => {
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const { data: templates, refetch } = useQuery({
    queryKey: ["project-outline-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_outline_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("template_name");

      if (error) throw error;
      return data;
    },
  });

  const defaultTemplate = templates?.find(t => t.is_default);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Use Template (Optional)</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setManageDialogOpen(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Templates
        </Button>
      </div>
      
      <Select
        value={selectedTemplateId || ""}
        onValueChange={(value) => onTemplateSelect(value || null)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Start from scratch or select a template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Start from scratch
            </div>
          </SelectItem>
          {templates?.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center justify-between w-full">
                <span>{template.template_name}</span>
                {template.is_default && (
                  <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedTemplateId && templates && (
        <p className="text-sm text-muted-foreground">
          {templates.find(t => t.id === selectedTemplateId)?.description || "Template selected"}
        </p>
      )}

      <ManageTemplatesDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        onTemplatesChange={() => refetch()}
      />
    </div>
  );
};
