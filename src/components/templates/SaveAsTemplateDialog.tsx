import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, X } from "lucide-react";

interface Bill {
  id: string;
  bill_number: number;
  bill_name: string;
  description?: string;
}

interface Section {
  id: string;
  bill_id: string;
  section_code: string;
  section_name: string;
  description?: string;
}

interface Item {
  id: string;
  section_id: string;
  item_code?: string;
  description: string;
  unit?: string;
  item_type?: string;
  master_material_id?: string;
}

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  sections: Section[];
  items: Item[];
  sourceType: "final_account" | "boq" | "budget";
}

const BUILDING_TYPES = [
  { value: "mall", label: "Shopping Mall" },
  { value: "office", label: "Office Building" },
  { value: "retail", label: "Retail Store" },
  { value: "industrial", label: "Industrial" },
  { value: "residential", label: "Residential" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "other", label: "Other" },
];

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  bills,
  sections,
  items,
  sourceType,
}: SaveAsTemplateDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the template
      const { data: template, error: templateError } = await supabase
        .from("bill_structure_templates")
        .insert({
          name,
          description,
          template_type: sourceType,
          building_type: buildingType || null,
          tags,
          is_global: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template bills
      for (const bill of bills) {
        const { data: templateBill, error: billError } = await supabase
          .from("template_bills")
          .insert({
            template_id: template.id,
            bill_number: bill.bill_number,
            bill_name: bill.bill_name,
            description: bill.description,
            display_order: bill.bill_number,
          })
          .select()
          .single();

        if (billError) throw billError;

        // Get sections for this bill
        const billSections = sections.filter((s) => s.bill_id === bill.id);

        for (let sIdx = 0; sIdx < billSections.length; sIdx++) {
          const section = billSections[sIdx];
          const { data: templateSection, error: sectionError } = await supabase
            .from("template_sections")
            .insert({
              template_bill_id: templateBill.id,
              section_code: section.section_code,
              section_name: section.section_name,
              description: section.description,
              display_order: sIdx,
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          // Get items for this section
          const sectionItems = items.filter((i) => i.section_id === section.id);

          if (sectionItems.length > 0) {
            const templateItems = sectionItems.map((item, idx) => ({
              template_section_id: templateSection.id,
              item_code: item.item_code,
              description: item.description,
              unit: item.unit,
              item_type: item.item_type || "quantity",
              master_material_id: item.master_material_id,
              display_order: idx,
            }));

            const { error: itemsError } = await supabase
              .from("template_items")
              .insert(templateItems);

            if (itemsError) throw itemsError;
          }
        }
      }

      return template;
    },
    onSuccess: () => {
      toast.success("Template saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["bill-structure-templates"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to save template");
      console.error(error);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setBuildingType("");
    setTags([]);
    setTagInput("");
  };

  const totalItems = items.length;
  const totalSections = sections.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Structure to save:</p>
            <p className="text-muted-foreground">
              {bills.length} bill(s) • {totalSections} section(s) • {totalItems} item(s)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Quantities and amounts will not be saved - only the structure
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard Mall Electrical BOQ"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Building Type</Label>
            <Select value={buildingType} onValueChange={setBuildingType}>
              <SelectTrigger>
                <SelectValue placeholder="Select building type (optional)" />
              </SelectTrigger>
              <SelectContent>
                {BUILDING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
