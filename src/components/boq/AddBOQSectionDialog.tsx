import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AddBOQSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  editingSection?: any;
  existingSectionCodes: string[];
  onSuccess: () => void;
}

export function AddBOQSectionDialog({
  open,
  onOpenChange,
  billId,
  editingSection,
  existingSectionCodes,
  onSuccess,
}: AddBOQSectionDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    section_code: "",
    section_name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingSection) {
      setFormData({
        section_code: editingSection.section_code || "",
        section_name: editingSection.section_name || "",
        description: editingSection.description || "",
      });
    } else {
      setFormData({
        section_code: "",
        section_name: "",
        description: "",
      });
    }
  }, [editingSection, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // For new sections, get current max display_order and increment
    // For editing, preserve the existing display_order
    let displayOrder: number;
    if (editingSection) {
      displayOrder = editingSection.display_order || 0;
    } else {
      const { data: sections } = await supabase
        .from("boq_project_sections")
        .select("display_order")
        .eq("bill_id", billId)
        .order("display_order", { ascending: false })
        .limit(1);

      displayOrder = sections && sections.length > 0 
        ? (sections[0].display_order || 0) + 1 
        : 0;
    }

    const sectionData = {
      bill_id: billId,
      section_code: formData.section_code,
      section_name: formData.section_name,
      description: formData.description || null,
      display_order: displayOrder,
    };

    try {
      if (editingSection) {
        const { error } = await supabase
          .from("boq_project_sections")
          .update(sectionData)
          .eq("id", editingSection.id);

        if (error) throw error;
        toast.success("Section updated");
      } else {
        // Check if section code already exists
        if (existingSectionCodes.includes(formData.section_code)) {
          toast.error("Section code already exists");
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from("boq_project_sections")
          .insert(sectionData);

        if (error) throw error;
        toast.success("Section added");
      }

      queryClient.invalidateQueries({ queryKey: ["boq-project-sections", billId] });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save section");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingSection ? "Edit" : "Add"} Section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="section_code">Section Code *</Label>
              <Input
                id="section_code"
                value={formData.section_code}
                onChange={(e) =>
                  setFormData({ ...formData, section_code: e.target.value.toUpperCase() })
                }
                placeholder="e.g., A, B, 1.1, etc."
                required
                disabled={!!editingSection}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section_name">Section Name *</Label>
              <Input
                id="section_name"
                value={formData.section_name}
                onChange={(e) =>
                  setFormData({ ...formData, section_name: e.target.value })
                }
                placeholder="e.g., Preliminaries, Distribution, etc."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description for this section"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingSection ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

