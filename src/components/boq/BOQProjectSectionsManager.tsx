import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, Trash2, Pencil, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddBOQSectionDialog } from "./AddBOQSectionDialog";
import { BOQItemsSpreadsheetTable } from "./BOQItemsSpreadsheetTable";
import { BOQSectionTemplatePicker } from "./BOQSectionTemplatePicker";
import { formatCurrency } from "@/utils/formatters";

interface BOQProjectSectionsManagerProps {
  billId: string;
  boqId: string;
}

interface SectionTemplate {
  id: string;
  section_code: string;
  section_name: string;
  description: string | null;
  category: string | null;
  display_order: number;
}

interface ItemTemplate {
  id: string;
  section_template_id: string;
  item_code: string;
  description: string;
  item_type: string;
  unit: string | null;
  default_quantity: number | null;
  default_supply_rate: number | null;
  default_install_rate: number | null;
  default_percentage: number | null;
  reference_item_code: string | null;
  display_order: number;
}

export function BOQProjectSectionsManager({ billId, boqId }: BOQProjectSectionsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["boq-project-sections", billId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_project_sections")
        .select("*")
        .eq("bill_id", billId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      
      // Sort sections numerically (e.g., A, B, C, 1.2, 1.3, etc.)
      return (data || []).sort((a, b) => {
        const aParts = a.section_code.split('.').map((p: string) => {
          const num = parseFloat(p);
          return isNaN(num) ? p : num;
        });
        const bParts = b.section_code.split('.').map((p: string) => {
          const num = parseFloat(p);
          return isNaN(num) ? p : num;
        });
        
        const maxLength = Math.max(aParts.length, bParts.length);
        for (let i = 0; i < maxLength; i++) {
          const aVal = aParts[i];
          const bVal = bParts[i];
          
          // Handle missing parts: if one is missing, treat it as 0 for numeric comparison
          // or empty string for string comparison
          if (aVal === undefined && bVal === undefined) {
            continue;
          }
          
          if (aVal === undefined) {
            // a is shorter, so it should come first if b is numeric, or compare as strings
            if (typeof bVal === 'number') {
              return -1; // Shorter numeric codes come first (e.g., "1" before "1.2")
            }
            return String('').localeCompare(String(bVal));
          }
          
          if (bVal === undefined) {
            // b is shorter
            if (typeof aVal === 'number') {
              return 1; // Shorter numeric codes come first
            }
            return String(aVal).localeCompare(String(''));
          }
          
          // Both values exist, compare them
          if (aVal !== bVal) {
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return aVal - bVal;
            }
            return String(aVal).localeCompare(String(bVal));
          }
        }
        return 0; // Codes are identical
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from("boq_project_sections")
        .delete()
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-project-sections", billId] });
      queryClient.invalidateQueries({ queryKey: ["boq-bills", boqId] });
      toast.success("Section deleted");
    },
    onError: () => {
      toast.error("Failed to delete section");
    },
  });

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Memoize existing section codes to prevent unnecessary re-renders in child component
  const existingSectionCodes = useMemo(() => {
    return sections.map(s => s.section_code);
  }, [sections]);

  const handleSelectTemplate = async (template: SectionTemplate) => {
    // Insert section only (no items)
    try {
      const { data: existingSections } = await supabase
        .from("boq_project_sections")
        .select("display_order")
        .eq("bill_id", billId)
        .order("display_order", { ascending: false })
        .limit(1);
      
      const displayOrder = existingSections && existingSections.length > 0 
        ? (existingSections[0].display_order || 0) + 1 
        : 0;

      const { error } = await supabase
        .from("boq_project_sections")
        .insert({
          bill_id: billId,
          section_code: template.section_code,
          section_name: template.section_name,
          description: template.description,
          display_order: displayOrder,
        });

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["boq-project-sections", billId] });
      toast.success(`Section ${template.section_code} added`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add section");
    }
  };

  const handleInsertWithItems = async (template: SectionTemplate, items: ItemTemplate[]) => {
    try {
      // Get max display order
      const { data: existingSections } = await supabase
        .from("boq_project_sections")
        .select("display_order")
        .eq("bill_id", billId)
        .order("display_order", { ascending: false })
        .limit(1);
      
      const displayOrder = existingSections && existingSections.length > 0 
        ? (existingSections[0].display_order || 0) + 1 
        : 0;

      // Insert section
      const { data: newSection, error: sectionError } = await supabase
        .from("boq_project_sections")
        .insert({
          bill_id: billId,
          section_code: template.section_code,
          section_name: template.section_name,
          description: template.description,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (sectionError) throw sectionError;

      // Insert items if any selected
      if (items.length > 0) {
        // First pass: insert all items and collect their IDs by item_code
        const itemCodeToId: Record<string, string> = {};
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemData: any = {
            section_id: newSection.id,
            item_code: item.item_code,
            description: item.description,
            item_type: item.item_type,
            unit: item.unit || (item.item_type === 'percentage' ? '%' : 'Sum'),
            quantity: item.default_quantity || 0,
            supply_rate: item.default_supply_rate || 0,
            install_rate: item.default_install_rate || 0,
            percentage_value: item.default_percentage,
            display_order: i,
          };

          const { data: insertedItem, error: itemError } = await supabase
            .from("boq_items")
            .insert(itemData)
            .select()
            .single();

          if (itemError) {
            console.error("Error inserting item:", itemError);
            continue;
          }

          itemCodeToId[item.item_code] = insertedItem.id;
        }

        // Second pass: update percentage items with reference_item_id
        for (const item of items) {
          if (item.item_type === 'percentage' && item.reference_item_code) {
            const referenceId = itemCodeToId[item.reference_item_code];
            const itemId = itemCodeToId[item.item_code];
            
            if (referenceId && itemId) {
              await supabase
                .from("boq_items")
                .update({ reference_item_id: referenceId })
                .eq("id", itemId);
            }
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["boq-project-sections", billId] });
      queryClient.invalidateQueries({ queryKey: ["boq-items"] });
      toast.success(`Section ${template.section_code} added with ${items.length} items`);
      
      // Expand the new section
      setExpandedSections(prev => new Set([...prev, newSection.id]));
    } catch (error: any) {
      toast.error(error.message || "Failed to add section with items");
    }
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground text-sm">Loading sections...</div>;
  }

  return (
    <div className="space-y-2 pl-4 border-l-2 border-muted">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Sections</span>
        <div className="flex gap-2">
          <Button onClick={() => setTemplatePickerOpen(true)} size="sm" variant="outline">
            <FolderOpen className="h-3 w-3 mr-1" />
            From Template
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} size="sm" variant="outline">
            <Plus className="h-3 w-3 mr-1" />
            Add Section
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No sections yet. Add a section to start adding items.
        </p>
      ) : (
        sections.map((section) => (
          <Collapsible
            key={section.id}
            open={expandedSections.has(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <div className="border rounded-lg">
              <div className="flex items-center justify-between p-3 bg-muted/30">
                <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {section.section_code} - {section.section_name}
                  </span>
                </CollapsibleTrigger>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Total: <span className="font-medium">{formatCurrency(section.total_amount)}</span>
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSection(section);
                        setAddDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this section and all its items?')) {
                          deleteMutation.mutate(section.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <CollapsibleContent>
                <div className="p-4">
                  <BOQItemsSpreadsheetTable sectionId={section.id} billId={billId} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))
      )}

      <AddBOQSectionDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingSection(null);
        }}
        billId={billId}
        editingSection={editingSection}
        existingSectionCodes={existingSectionCodes}
        onSuccess={() => {
          setAddDialogOpen(false);
          setEditingSection(null);
        }}
      />

      <BOQSectionTemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelectTemplate={handleSelectTemplate}
        onInsertWithItems={handleInsertWithItems}
      />
    </div>
  );
}

