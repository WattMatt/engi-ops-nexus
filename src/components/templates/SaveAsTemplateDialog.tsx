import { useState, useMemo, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Save, X, ChevronDown, ChevronRight } from "lucide-react";

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
  
  // Selection state
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());

  // Initialize selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBillIds(new Set(bills.map(b => b.id)));
      setSelectedSectionIds(new Set(sections.map(s => s.id)));
      setExpandedBills(new Set(bills.map(b => b.id)));
    }
  }, [open, bills, sections]);

  // Get sections for a specific bill
  const getSectionsForBill = (billId: string) => {
    return sections.filter(s => s.bill_id === billId);
  };

  // Get items for a specific section
  const getItemsForSection = (sectionId: string) => {
    return items.filter(i => i.section_id === sectionId);
  };

  // Check if all sections in a bill are selected
  const isBillFullySelected = (billId: string) => {
    const billSections = getSectionsForBill(billId);
    return billSections.length > 0 && billSections.every(s => selectedSectionIds.has(s.id));
  };

  // Check if some (but not all) sections in a bill are selected
  const isBillPartiallySelected = (billId: string) => {
    const billSections = getSectionsForBill(billId);
    const selectedCount = billSections.filter(s => selectedSectionIds.has(s.id)).length;
    return selectedCount > 0 && selectedCount < billSections.length;
  };

  // Toggle bill selection
  const toggleBill = (billId: string, checked: boolean) => {
    const billSections = getSectionsForBill(billId);
    
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(billId);
      } else {
        next.delete(billId);
      }
      return next;
    });

    setSelectedSectionIds(prev => {
      const next = new Set(prev);
      billSections.forEach(section => {
        if (checked) {
          next.add(section.id);
        } else {
          next.delete(section.id);
        }
      });
      return next;
    });
  };

  // Toggle section selection
  const toggleSection = (sectionId: string, billId: string, checked: boolean) => {
    setSelectedSectionIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }
      return next;
    });

    // Update bill selection based on section state
    const billSections = getSectionsForBill(billId);
    const willHaveSelected = billSections.some(s => 
      s.id === sectionId ? checked : selectedSectionIds.has(s.id)
    );

    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (willHaveSelected) {
        next.add(billId);
      } else {
        next.delete(billId);
      }
      return next;
    });
  };

  // Toggle expand/collapse bill
  const toggleExpanded = (billId: string) => {
    setExpandedBills(prev => {
      const next = new Set(prev);
      if (next.has(billId)) {
        next.delete(billId);
      } else {
        next.add(billId);
      }
      return next;
    });
  };

  // Select/Deselect all
  const selectAll = () => {
    setSelectedBillIds(new Set(bills.map(b => b.id)));
    setSelectedSectionIds(new Set(sections.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedBillIds(new Set());
    setSelectedSectionIds(new Set());
  };

  const isAllSelected = selectedBillIds.size === bills.length && selectedSectionIds.size === sections.length;

  // Calculate selected counts
  const selectedStats = useMemo(() => {
    const selectedBillCount = selectedBillIds.size;
    const selectedSectionCount = selectedSectionIds.size;
    const selectedItemCount = items.filter(i => selectedSectionIds.has(i.section_id)).length;
    return { selectedBillCount, selectedSectionCount, selectedItemCount };
  }, [selectedBillIds, selectedSectionIds, items]);

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

      // Only process selected bills
      const selectedBills = bills.filter(b => selectedBillIds.has(b.id));

      // Create template bills
      for (const bill of selectedBills) {
        // Check if bill has any selected sections
        const billSections = getSectionsForBill(bill.id).filter(s => selectedSectionIds.has(s.id));
        if (billSections.length === 0) continue;

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
          const sectionItems = getItemsForSection(section.id);

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
    setSelectedBillIds(new Set());
    setSelectedSectionIds(new Set());
  };

  const hasSelection = selectedSectionIds.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Sections to Include</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={isAllSelected ? deselectAll : selectAll}
                className="text-xs h-7"
              >
                {isAllSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <ScrollArea className="h-48 border rounded-md p-2">
              <div className="space-y-1">
                {bills.map((bill) => {
                  const billSections = getSectionsForBill(bill.id);
                  const isExpanded = expandedBills.has(bill.id);
                  const isFullySelected = isBillFullySelected(bill.id);
                  const isPartiallySelected = isBillPartiallySelected(bill.id);
                  const selectedSectionCount = billSections.filter(s => selectedSectionIds.has(s.id)).length;

                  return (
                    <Collapsible
                      key={bill.id}
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(bill.id)}
                    >
                      <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Checkbox
                          checked={isFullySelected}
                          ref={(el) => {
                            if (el && isPartiallySelected) {
                              (el as HTMLButtonElement).dataset.state = "indeterminate";
                            }
                          }}
                          onCheckedChange={(checked) => toggleBill(bill.id, checked as boolean)}
                        />
                        <span className="text-sm font-medium flex-1">
                          Bill {bill.bill_number} - {bill.bill_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {selectedSectionCount}/{billSections.length}
                        </Badge>
                      </div>
                      <CollapsibleContent>
                        <div className="ml-10 space-y-1 mt-1">
                          {billSections.map((section) => {
                            const itemCount = getItemsForSection(section.id).length;
                            return (
                              <div
                                key={section.id}
                                className={`flex items-center gap-2 py-1 px-2 rounded ${
                                  selectedSectionIds.has(section.id) ? "" : "opacity-50"
                                }`}
                              >
                                <Checkbox
                                  checked={selectedSectionIds.has(section.id)}
                                  onCheckedChange={(checked) =>
                                    toggleSection(section.id, bill.id, checked as boolean)
                                  }
                                />
                                <span className="text-sm flex-1">
                                  {section.section_code} - {section.section_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {itemCount} items
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Selected structure:</p>
            <p className="text-muted-foreground">
              {selectedStats.selectedBillCount} of {bills.length} bill(s) • {selectedStats.selectedSectionCount} of {sections.length} section(s) • {selectedStats.selectedItemCount} item(s)
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
            disabled={!name.trim() || !hasSelection || saveMutation.isPending}
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
