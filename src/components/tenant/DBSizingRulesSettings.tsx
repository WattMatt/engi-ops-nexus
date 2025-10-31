import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface DBSizingRule {
  id: string;
  min_area: number;
  max_area: number;
  db_size: string;
}

interface DBSizingRulesSettingsProps {
  projectId: string;
}

export const DBSizingRulesSettings = ({ projectId }: DBSizingRulesSettingsProps) => {
  const [rules, setRules] = useState<DBSizingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRule, setNewRule] = useState({
    min_area: "",
    max_area: "",
    db_size: "",
  });

  useEffect(() => {
    loadRules();
  }, [projectId]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from("db_sizing_rules")
        .select("*")
        .eq("project_id", projectId)
        .order("min_area", { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      toast.error("Failed to load DB sizing rules");
    } finally {
      setLoading(false);
    }
  };

  const addRule = async () => {
    if (!newRule.min_area || !newRule.max_area || !newRule.db_size) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("db_sizing_rules")
        .insert([{
          project_id: projectId,
          min_area: parseFloat(newRule.min_area),
          max_area: parseFloat(newRule.max_area),
          db_size: newRule.db_size,
        }]);

      if (error) throw error;
      toast.success("Rule added successfully");
      setNewRule({ min_area: "", max_area: "", db_size: "" });
      loadRules();
    } catch (error: any) {
      toast.error(error.message || "Failed to add rule");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("db_sizing_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Rule deleted successfully");
      loadRules();
    } catch (error: any) {
      toast.error("Failed to delete rule");
    }
  };

  const loadDefaultRules = async () => {
    const defaultRules = [
      { min_area: 0, max_area: 80, db_size: "60A TP" },
      { min_area: 81, max_area: 200, db_size: "80A TP" },
      { min_area: 201, max_area: 300, db_size: "100A TP" },
      { min_area: 301, max_area: 450, db_size: "125A TP" },
      { min_area: 451, max_area: 600, db_size: "160A TP" },
      { min_area: 601, max_area: 1200, db_size: "200A TP" },
    ];

    try {
      const { error } = await supabase
        .from("db_sizing_rules")
        .insert(
          defaultRules.map(rule => ({
            project_id: projectId,
            ...rule,
          }))
        );

      if (error) throw error;
      toast.success("Default rules loaded successfully");
      loadRules();
    } catch (error: any) {
      toast.error(error.message || "Failed to load default rules");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>DB Sizing Rules</CardTitle>
        <CardDescription>
          Configure automatic DB size calculation based on shop area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 && (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">No rules configured yet</p>
            <Button onClick={loadDefaultRules}>
              Load Default Rules
            </Button>
          </div>
        )}

        {rules.length > 0 && (
          <div className="space-y-2">
            <Label>Current Rules</Label>
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2 p-2 border rounded">
                <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                  <span>{rule.min_area}m² - {rule.max_area}m²</span>
                  <span className="font-medium">{rule.db_size}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4 pt-4 border-t">
          <Label>Add New Rule</Label>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label htmlFor="min_area" className="text-xs">Min Area (m²)</Label>
              <Input
                id="min_area"
                type="number"
                step="0.01"
                value={newRule.min_area}
                onChange={(e) => setNewRule({ ...newRule, min_area: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="max_area" className="text-xs">Max Area (m²)</Label>
              <Input
                id="max_area"
                type="number"
                step="0.01"
                value={newRule.max_area}
                onChange={(e) => setNewRule({ ...newRule, max_area: e.target.value })}
                placeholder="80"
              />
            </div>
            <div>
              <Label htmlFor="db_size" className="text-xs">DB Size</Label>
              <Input
                id="db_size"
                value={newRule.db_size}
                onChange={(e) => setNewRule({ ...newRule, db_size: e.target.value })}
                placeholder="60A TP"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addRule} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
