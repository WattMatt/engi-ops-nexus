import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileText, Search, Building2, Tag, ChevronRight } from "lucide-react";

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "final_account" | "boq";
  targetId: string; // final_account_id or project_boq_id
  onApply: () => void;
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  onApply,
}: ApplyTemplateDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["bill-structure-templates", targetType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bill_structure_templates")
        .select(`
          *,
          template_bills(
            *,
            template_sections(
              *,
              template_items(*)
            )
          )
        `)
        .eq("template_type", targetType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.tags?.some((tag: string) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("No template selected");

      const template = templates?.find((t) => t.id === selectedTemplate);
      if (!template) throw new Error("Template not found");

      if (targetType === "final_account") {
        // Apply to Final Account
        for (const bill of template.template_bills || []) {
          const { data: newBill, error: billError } = await supabase
            .from("final_account_bills")
            .insert({
              final_account_id: targetId,
              bill_number: bill.bill_number,
              bill_name: bill.bill_name,
              description: bill.description,
            })
            .select()
            .single();

          if (billError) throw billError;

          for (const section of bill.template_sections || []) {
            const { data: newSection, error: sectionError } = await supabase
              .from("final_account_sections")
              .insert({
                bill_id: newBill.id,
                section_code: section.section_code,
                section_name: section.section_name,
                description: section.description,
                display_order: section.display_order,
              })
              .select()
              .single();

            if (sectionError) throw sectionError;

            const items = (section.template_items || []).map((item: any, idx: number) => ({
              section_id: newSection.id,
              item_code: item.item_code,
              description: item.description,
              unit: item.unit,
              item_type: item.item_type,
              master_material_id: item.master_material_id,
              display_order: idx,
              contract_quantity: 0,
              final_quantity: 0,
              supply_rate: 0,
              install_rate: 0,
            }));

            if (items.length > 0) {
              const { error: itemsError } = await supabase
                .from("final_account_items")
                .insert(items);

              if (itemsError) throw itemsError;
            }
          }
        }
      } else {
        // Apply to BOQ
        for (const bill of template.template_bills || []) {
          const { data: newBill, error: billError } = await supabase
            .from("boq_bills")
            .insert({
              project_boq_id: targetId,
              bill_number: bill.bill_number,
              bill_name: bill.bill_name,
              description: bill.description,
            })
            .select()
            .single();

          if (billError) throw billError;

          for (const section of bill.template_sections || []) {
            const { data: newSection, error: sectionError } = await supabase
              .from("boq_project_sections")
              .insert({
                bill_id: newBill.id,
                section_code: section.section_code,
                section_name: section.section_name,
                description: section.description,
                display_order: section.display_order,
              })
              .select()
              .single();

            if (sectionError) throw sectionError;

            const items = (section.template_items || []).map((item: any, idx: number) => ({
              section_id: newSection.id,
              item_code: item.item_code,
              description: item.description,
              unit: item.unit,
              item_type: item.item_type || "quantity",
              master_material_id: item.master_material_id,
              display_order: idx,
              quantity: 0,
              supply_rate: 0,
              install_rate: 0,
            }));

            if (items.length > 0) {
              const { error: itemsError } = await supabase
                .from("boq_items")
                .insert(items);

              if (itemsError) throw itemsError;
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Template applied successfully!");
      queryClient.invalidateQueries({ queryKey: ["final-account"] });
      queryClient.invalidateQueries({ queryKey: ["boq"] });
      onApply();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to apply template");
      console.error(error);
    },
  });

  const selectedTemplateData = templates?.find((t) => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Apply Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredTemplates?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p>No templates found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredTemplates?.map((template) => {
                  const billCount = template.template_bills?.length || 0;
                  const sectionCount = template.template_bills?.reduce(
                    (acc: number, b: any) => acc + (b.template_sections?.length || 0),
                    0
                  ) || 0;
                  const itemCount = template.template_bills?.reduce(
                    (acc: number, b: any) =>
                      acc +
                      (b.template_sections?.reduce(
                        (sAcc: number, s: any) => sAcc + (s.template_items?.length || 0),
                        0
                      ) || 0),
                    0
                  ) || 0;

                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedTemplate === template.id
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{billCount} bills</span>
                            <span>{sectionCount} sections</span>
                            <span>{itemCount} items</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {template.building_type && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Building2 className="h-3 w-3" />
                                {template.building_type}
                              </Badge>
                            )}
                            {template.tags?.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                                <Tag className="h-3 w-3" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            selectedTemplate === template.id
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => applyMutation.mutate()}
            disabled={!selectedTemplate || applyMutation.isPending}
          >
            {applyMutation.isPending ? "Applying..." : "Apply Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
