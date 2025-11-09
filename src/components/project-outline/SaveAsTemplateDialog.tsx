import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outline: any;
  sections: any[];
}

interface FormData {
  template_name: string;
  description: string;
  is_default: boolean;
}

export const SaveAsTemplateDialog = ({
  open,
  onOpenChange,
  outline,
  sections,
}: SaveAsTemplateDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormData>();
  const isDefault = watch("is_default");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      // Create template
      const { data: template, error: templateError } = await supabase
        .from("project_outline_templates")
        .insert({
          template_name: data.template_name,
          description: data.description,
          document_title: outline.document_title,
          prepared_by: outline.prepared_by,
          address_line1: outline.address_line1,
          address_line2: outline.address_line2,
          address_line3: outline.address_line3,
          telephone: outline.telephone,
          is_default: data.is_default,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // If this is set as default, unset other defaults
      if (data.is_default) {
        await supabase
          .from("project_outline_templates")
          .update({ is_default: false })
          .neq("id", template.id)
          .eq("created_by", user?.user?.id);
      }

      // Create template sections
      const sectionsToInsert = sections.map((section, index) => ({
        template_id: template.id,
        section_number: section.section_number,
        section_title: section.section_title,
        default_content: section.content || "",
        sort_order: index + 1,
      }));

      const { error: sectionsError } = await supabase
        .from("project_outline_template_sections")
        .insert(sectionsToInsert);

      if (sectionsError) throw sectionsError;

      toast({
        title: "Success",
        description: "Template saved successfully",
      });

      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="template_name">Template Name *</Label>
            <Input
              id="template_name"
              {...register("template_name", { required: true })}
              placeholder="e.g., Standard Electrical Baseline"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe when to use this template..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={isDefault}
              onCheckedChange={(checked) => setValue("is_default", checked as boolean)}
            />
            <Label htmlFor="is_default" className="cursor-pointer">
              Set as default template
            </Label>
          </div>

          <p className="text-sm text-muted-foreground">
            This will save the current document structure ({sections.length} sections) and company details as a reusable template.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
