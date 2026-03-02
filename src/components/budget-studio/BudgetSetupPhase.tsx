import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectScope, STANDARD_SCOPE_ITEMS } from "@/hooks/useBudgetEngine";

interface Props {
  budgetId: string;
  budget: any;
}

export const BudgetSetupPhase = ({ budgetId, budget }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: scopeItems = [], isLoading } = useProjectScope(budgetId);
  const [baseRate, setBaseRate] = useState(String(budget.base_rate_m2 || 290));
  const [saving, setSaving] = useState(false);

  // Initialize scope items if empty
  useEffect(() => {
    if (!isLoading && scopeItems.length === 0) {
      const initScope = async () => {
        const items = STANDARD_SCOPE_ITEMS.map((name, i) => ({
          budget_id: budgetId,
          item_name: name,
          display_order: i,
        }));
        await supabase.from("project_scope").insert(items);
        queryClient.invalidateQueries({ queryKey: ["project-scope", budgetId] });
      };
      initScope();
    }
  }, [isLoading, scopeItems.length, budgetId, queryClient]);

  const handleSaveBaseRate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("project_budgets")
      .update({ base_rate_m2: parseFloat(baseRate) || 290 })
      .eq("id", budgetId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Base rate updated" });
      queryClient.invalidateQueries({ queryKey: ["project-budget", budgetId] });
    }
  };

  const handleScopeToggle = async (itemId: string, currentStatus: string | null) => {
    const newStatus = currentStatus === "yes" ? "no" : "yes";
    await supabase.from("project_scope").update({ status: newStatus }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["project-scope", budgetId] });
  };

  const handleCommentChange = async (itemId: string, comments: string) => {
    await supabase.from("project_scope").update({ comments }).eq("id", itemId);
  };

  const allAddressed = scopeItems.length === 16 && scopeItems.every((s: any) => s.status !== null);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Setup & Scope</h1>
        <p className="text-muted-foreground">Configure project variables and confirm the scope of works.</p>
      </div>

      {/* Project Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Base Rate (R/m²)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                />
                <Button onClick={handleSaveBaseRate} disabled={saving} size="sm">
                  {saving ? "…" : "Save"}
                </Button>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <p className="text-sm capitalize mt-2 font-medium">{budget.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Sheet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmation Sheet</CardTitle>
          <p className="text-xs text-muted-foreground">
            {allAddressed ? "✅ All items addressed" : `${scopeItems.filter((s: any) => s.status).length} / 16 addressed`}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {scopeItems.map((item: any, idx: number) => (
            <div key={item.id} className="flex items-start gap-4 p-3 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground w-6 mt-1">{idx + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.item_name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${item.status === "yes" ? "text-green-600" : item.status === "no" ? "text-destructive" : "text-muted-foreground"}`}>
                      {item.status === "yes" ? "Yes" : item.status === "no" ? "No" : "Pending"}
                    </span>
                    <Switch
                      checked={item.status === "yes"}
                      onCheckedChange={() => handleScopeToggle(item.id, item.status)}
                    />
                  </div>
                </div>
                {item.status === "no" && (
                  <Textarea
                    placeholder="Reason required…"
                    defaultValue={item.comments || ""}
                    onBlur={(e) => handleCommentChange(item.id, e.target.value)}
                    className="mt-2 text-sm h-16 border-destructive/50"
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
