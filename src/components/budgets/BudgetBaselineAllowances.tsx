import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save, Edit2, X, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface BudgetBaselineAllowancesProps {
  budgetId: string;
  initialValue?: string | null;
  onUpdate?: () => void;
}

export const BudgetBaselineAllowances = ({ 
  budgetId, 
  initialValue,
  onUpdate 
}: BudgetBaselineAllowancesProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialValue || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setContent(initialValue || "");
  }, [initialValue]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("electrical_budgets")
        .update({ baseline_allowances: content || null })
        .eq("id", budgetId);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Baseline allowances updated successfully",
      });
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error saving baseline allowances:", error);
      toast({
        title: "Error",
        description: "Failed to save baseline allowances",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(initialValue || "");
    setIsEditing(false);
  };

  const hasContent = content.trim().length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Baseline Allowances
                {hasContent && (
                  <Badge variant="secondary" className="ml-2">
                    Populated
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Define the baseline allowances and assumptions used for this budget estimate.
                This information will be included in the budget report.
              </CardDescription>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Enter baseline allowances and assumptions, for example:

• Lighting: 12 W/m² allowance for general areas
• Small Power: 25 W/m² for office spaces
• HVAC Electrical: Based on 150 W/m² cooling load
• Future Expansion: 15% spare capacity included
• Cable Lengths: Based on preliminary layout drawings
• Distribution: One DB per 500m² floor area assumed`}
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex items-center gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : hasContent ? (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground bg-muted/50 p-4 rounded-lg border">
                {content}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No baseline allowances defined yet.</p>
              <p className="text-sm">Click "Edit" to add the allowances and assumptions for this budget.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasContent && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">Report Ready</p>
                <p className="text-muted-foreground">
                  These baseline allowances will be included in the budget report when exported.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
