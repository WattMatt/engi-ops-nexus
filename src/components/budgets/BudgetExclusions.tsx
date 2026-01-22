import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, Save, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BudgetExclusionsProps {
  budgetId: string;
  initialValue: string | null;
  onUpdate: () => void;
}

export const BudgetExclusions = ({ budgetId, initialValue, onUpdate }: BudgetExclusionsProps) => {
  const [content, setContent] = useState(initialValue || "");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(initialValue || "");
    setHasChanges(false);
  }, [initialValue]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(value !== (initialValue || ""));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("electrical_budgets")
        .update({ exclusions: content || null })
        .eq("id", budgetId);

      if (error) throw error;

      toast.success("Exclusions saved successfully");
      setHasChanges(false);
      onUpdate();
    } catch (error) {
      console.error("Error saving exclusions:", error);
      toast.error("Failed to save exclusions");
    } finally {
      setIsSaving(false);
    }
  };

  const placeholderText = `List items explicitly excluded from this budget estimate:

• Structural works and building modifications
• HVAC electrical connections (by mechanical contractor)
• IT infrastructure and data cabling
• Specialized medical equipment connections
• Temporary power during construction
• Removal of existing installations
• Civil works for cable trenches
• Builder's work in connection
• Professional fees and permits
• Escalation costs beyond [date]`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Budget Exclusions</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-warning flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Unsaved changes
              </span>
            )}
            <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Document items that are explicitly <strong>not included</strong> in this budget estimate. 
          These exclusions will appear at the end of the budget report.
        </p>
        
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={placeholderText}
          className="min-h-[300px] font-mono text-sm"
        />

        {content && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>This section will be displayed prominently at the end of the budget report.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
