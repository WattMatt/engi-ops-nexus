import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, Trash2, Pencil, Zap, Send } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddSectionDialog } from "./AddSectionDialog";
import { FinalAccountItemsTable } from "./FinalAccountItemsTable";
import { QuickSetupWizard } from "./QuickSetupWizard";
import { LineShopsManager } from "./LineShopsManager";
import { SendForReviewDialog } from "./SendForReviewDialog";
import { SectionReviewStatusBadge } from "./SectionReviewStatusBadge";
import { formatCurrency } from "@/utils/formatters";

interface FinalAccountSectionsManagerProps {
  billId: string;
  accountId: string;
}

export function FinalAccountSectionsManager({ billId, accountId }: FinalAccountSectionsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [reviewDialogSection, setReviewDialogSection] = useState<any>(null);
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

  // Check if a section is Line Shops (Section E)
  const isLineShopsSection = (sectionCode: string) => sectionCode === "E";

  return (
    <div className="space-y-2 pl-4 border-l-2 border-muted">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Sections</span>
        <div className="flex gap-2">
          <Button onClick={() => setQuickSetupOpen(true)} size="sm" variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            Quick Setup
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} size="sm" variant="outline">
            <Plus className="h-3 w-3 mr-1" />
            Add Section
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No sections yet. Use Quick Setup to add standard BOQ sections, or add individually.
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
                  <SectionReviewStatusBadge status={section.review_status} />
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
                      title="Send for Review"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewDialogSection(section);
                      }}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
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
                  {isLineShopsSection(section.section_code) ? (
                    <LineShopsManager sectionId={section.id} billId={billId} accountId={accountId} />
                  ) : (
                    <FinalAccountItemsTable sectionId={section.id} billId={billId} accountId={accountId} />
                  )}
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

      <QuickSetupWizard
        open={quickSetupOpen}
        onOpenChange={setQuickSetupOpen}
        billId={billId}
        existingSectionCodes={sections.map(s => s.section_code)}
      />

      {reviewDialogSection && (
        <SendForReviewDialog
          open={!!reviewDialogSection}
          onOpenChange={(open) => !open && setReviewDialogSection(null)}
          sectionId={reviewDialogSection.id}
          sectionName={`${reviewDialogSection.section_code} - ${reviewDialogSection.section_name}`}
          accountId={accountId}
        />
      )}
    </div>
  );
}
