import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";
import { SECTION_TEMPLATES, CATEGORY_LABELS, SectionTemplate } from "./sectionTemplates";

interface QuickSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  existingSectionCodes: string[];
}

export function QuickSetupWizard({
  open,
  onOpenChange,
  billId,
  existingSectionCodes,
}: QuickSetupWizardProps) {
  const queryClient = useQueryClient();
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out already existing sections
  const availableTemplates = SECTION_TEMPLATES.filter(
    (t) => !existingSectionCodes.includes(t.code)
  );

  const groupedTemplates = availableTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, SectionTemplate[]>);

  const toggleSection = (code: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedSections(newSelected);
  };

  const selectAll = () => {
    setSelectedSections(new Set(availableTemplates.map((t) => t.code)));
  };

  const selectNone = () => {
    setSelectedSections(new Set());
  };

  const selectCategory = (category: string) => {
    const categoryCodes = availableTemplates
      .filter((t) => t.category === category)
      .map((t) => t.code);
    const newSelected = new Set(selectedSections);
    categoryCodes.forEach((code) => newSelected.add(code));
    setSelectedSections(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedSections.size === 0) {
      toast.error("Please select at least one section");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create sections for all selected templates
      const sectionsToCreate = Array.from(selectedSections).map((code) => {
        const template = SECTION_TEMPLATES.find((t) => t.code === code)!;
        const displayOrder = code.charCodeAt(0) - 64; // A=1, B=2, etc.
        return {
          bill_id: billId,
          section_code: code,
          section_name: template.name,
          description: template.description || null,
          display_order: displayOrder,
        };
      });

      const { error } = await supabase
        .from("final_account_sections")
        .insert(sectionsToCreate);

      if (error) throw error;

      toast.success(`Created ${sectionsToCreate.length} sections`);
      queryClient.invalidateQueries({ queryKey: ["final-account-sections", billId] });
      onOpenChange(false);
      setSelectedSections(new Set());
    } catch (error: any) {
      toast.error(error.message || "Failed to create sections");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Setup - Add Sections
          </DialogTitle>
          <DialogDescription>
            Select the sections you want to add to this bill. Standard BOQ sections are organized by category.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Clear All
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {(Object.keys(groupedTemplates) as Array<keyof typeof CATEGORY_LABELS>).map((category) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => selectCategory(category)}
                  >
                    Select All
                  </Button>
                </div>
                <div className="space-y-2">
                  {groupedTemplates[category].map((template) => (
                    <div
                      key={template.code}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedSections.has(template.code)
                          ? "bg-primary/5 border-primary/30"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleSection(template.code)}
                    >
                      <Checkbox
                        checked={selectedSections.has(template.code)}
                        onCheckedChange={() => toggleSection(template.code)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label className="font-medium cursor-pointer">
                          Section {template.code} - {template.name}
                        </Label>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {template.description}
                          </p>
                        )}
                        {template.subsections && template.subsections.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-muted-foreground/70">Includes: </span>
                            {template.subsections.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {availableTemplates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                All sections have already been added to this bill.
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {selectedSections.size} section{selectedSections.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || selectedSections.size === 0}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {selectedSections.size} Section{selectedSections.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
