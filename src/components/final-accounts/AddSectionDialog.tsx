import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  accountId: string;
  editingSection?: any;
  existingSectionCodes: string[];
  onSuccess: () => void;
}

const SECTION_TEMPLATES = [
  { code: "A", name: "Preliminary & General" },
  { code: "B", name: "Medium Voltage Equipment" },
  { code: "C", name: "LV Cable & Distribution" },
  { code: "D", name: "Containment & Wiring" },
  { code: "E", name: "Light Switches & Lighting" },
  { code: "F", name: "External Works" },
  { code: "G", name: "Mall Interior" },
  { code: "H", name: "Office Areas" },
  { code: "I", name: "Additional Areas" },
  { code: "J", name: "Back of House" },
  { code: "K", name: "External/Parking" },
  { code: "L", name: "Fire Detection" },
  { code: "M", name: "CCTV & Security" },
  { code: "N", name: "Access Control" },
  { code: "O", name: "UPS & Standby Power" },
];

export function AddSectionDialog({
  open,
  onOpenChange,
  billId,
  accountId,
  editingSection,
  existingSectionCodes,
  onSuccess,
}: AddSectionDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    section_code: "",
    section_name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTemplates = SECTION_TEMPLATES.filter(
    t => !existingSectionCodes.includes(t.code) || editingSection?.section_code === t.code
  );

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

  const handleTemplateSelect = (code: string) => {
    const template = SECTION_TEMPLATES.find(t => t.code === code);
    if (template) {
      setFormData({
        ...formData,
        section_code: template.code,
        section_name: template.name,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const displayOrder = formData.section_code.charCodeAt(0) - 64; // A=1, B=2, etc.

    const sectionData = {
      bill_id: billId,
      section_code: formData.section_code.toUpperCase(),
      section_name: formData.section_name,
      description: formData.description || null,
      display_order: displayOrder,
    };

    try {
      if (editingSection) {
        const { error } = await supabase
          .from("final_account_sections")
          .update(sectionData)
          .eq("id", editingSection.id);

        if (error) throw error;
        toast.success("Section updated");
      } else {
        const { error } = await supabase
          .from("final_account_sections")
          .insert(sectionData);

        if (error) throw error;
        toast.success("Section added");
      }

      queryClient.invalidateQueries({ queryKey: ["final-account-sections", billId] });
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
          {!editingSection && availableTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>Quick Select Template</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section template..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      Section {template.code} - {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="section_code">Code *</Label>
              <Input
                id="section_code"
                value={formData.section_code}
                onChange={(e) =>
                  setFormData({ ...formData, section_code: e.target.value.toUpperCase() })
                }
                placeholder="A"
                maxLength={2}
                required
              />
            </div>
            <div className="space-y-2 col-span-3">
              <Label htmlFor="section_name">Section Name *</Label>
              <Input
                id="section_name"
                value={formData.section_name}
                onChange={(e) =>
                  setFormData({ ...formData, section_name: e.target.value })
                }
                placeholder="e.g., Preliminary & General"
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
