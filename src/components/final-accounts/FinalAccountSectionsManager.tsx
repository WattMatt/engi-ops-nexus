import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddSectionDialog } from "./AddSectionDialog";
import { FinalAccountItemsTable } from "./FinalAccountItemsTable";
import { formatCurrency } from "@/utils/formatters";

interface FinalAccountSectionsManagerProps {
  billId: string;
  accountId: string;
}

export function FinalAccountSectionsManager({ billId, accountId }: FinalAccountSectionsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["final-account-sections", billId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_account_sections")
        .select("*")
        .eq("bill_id", billId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from("final_account_sections")
        .delete()
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-sections", billId] });
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

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground text-sm">Loading sections...</div>;
  }

  return (
    <div className="space-y-2 pl-4 border-l-2 border-muted">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Sections</span>
        <Button onClick={() => setAddDialogOpen(true)} size="sm" variant="outline">
          <Plus className="h-3 w-3 mr-1" />
          Add Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No sections yet. Add your first section (e.g., Section A - Preliminary & General).
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
                  <span className="font-medium text-sm">
                    Section {section.section_code} - {section.section_name}
                  </span>
                </CollapsibleTrigger>
                <div className="flex items-center gap-4">
                  <div className="flex gap-4 text-xs">
                    <span>
                      <span className="text-muted-foreground mr-1">Contract:</span>
                      <span className="font-medium">{formatCurrency(section.contract_total)}</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground mr-1">Final:</span>
                      <span className="font-medium">{formatCurrency(section.final_total)}</span>
                    </span>
                    <span className={Number(section.variation_total) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      <span className="text-muted-foreground mr-1">Var:</span>
                      <span className="font-medium">{formatCurrency(section.variation_total)}</span>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
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
                      className="h-7 w-7 p-0"
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
                <div className="p-3 border-t">
                  <FinalAccountItemsTable sectionId={section.id} billId={billId} accountId={accountId} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))
      )}

      <AddSectionDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingSection(null);
        }}
        billId={billId}
        accountId={accountId}
        editingSection={editingSection}
        existingSectionCodes={sections.map(s => s.section_code)}
        onSuccess={() => {
          setAddDialogOpen(false);
          setEditingSection(null);
        }}
      />
    </div>
  );
}
