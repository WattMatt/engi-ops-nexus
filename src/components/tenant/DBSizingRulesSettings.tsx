import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DBSizingRule {
  id: string;
  min_area: number;
  max_area: number;
  db_size: string;
  category: string;
}

interface DBSizingRulesSettingsProps {
  projectId: string;
}

export const DBSizingRulesSettings = ({ projectId }: DBSizingRulesSettingsProps) => {
  const [rules, setRules] = useState<DBSizingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("standard");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    min_area: string;
    max_area: string;
    db_size: string;
  }>({
    min_area: "",
    max_area: "",
    db_size: "",
  });
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
        .order("category", { ascending: true })
        .order("min_area", { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      toast.error("Failed to load DB sizing rules");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (rule: DBSizingRule) => {
    setEditingId(rule.id);
    setEditForm({
      min_area: rule.min_area.toString(),
      max_area: rule.max_area.toString(),
      db_size: rule.db_size,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ min_area: "", max_area: "", db_size: "" });
  };

  const adjustAdjacentRanges = async (
    updatedRule: DBSizingRule,
    newMinArea: number,
    newMaxArea: number
  ) => {
    const categoryRules = rules
      .filter(r => r.category === activeCategory && r.id !== updatedRule.id)
      .sort((a, b) => a.min_area - b.min_area);

    const updates: Array<{ id: string; min_area: number; max_area: number }> = [];

    // Find rule immediately before (if exists)
    const previousRule = categoryRules.find(r => r.max_area < newMinArea);
    if (previousRule && previousRule.max_area !== newMinArea - 1) {
      updates.push({
        id: previousRule.id,
        min_area: previousRule.min_area,
        max_area: newMinArea - 1,
      });
    }

    // Find rule immediately after (if exists)
    const nextRule = categoryRules.find(r => r.min_area > newMaxArea);
    if (nextRule && nextRule.min_area !== newMaxArea + 1) {
      updates.push({
        id: nextRule.id,
        min_area: newMaxArea + 1,
        max_area: nextRule.max_area,
      });
    }

    // Apply all updates
    for (const update of updates) {
      const { error } = await supabase
        .from("db_sizing_rules")
        .update({
          min_area: update.min_area,
          max_area: update.max_area,
        })
        .eq("id", update.id);

      if (error) throw error;
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.min_area || !editForm.max_area || !editForm.db_size) {
      toast.error("Please fill in all fields");
      return;
    }

    const newMinArea = parseFloat(editForm.min_area);
    const newMaxArea = parseFloat(editForm.max_area);

    if (newMinArea >= newMaxArea) {
      toast.error("Min area must be less than max area");
      return;
    }

    try {
      const currentRule = rules.find(r => r.id === editingId);
      if (!currentRule) return;

      // Update the current rule
      const { error: updateError } = await supabase
        .from("db_sizing_rules")
        .update({
          min_area: newMinArea,
          max_area: newMaxArea,
          db_size: editForm.db_size,
        })
        .eq("id", editingId);

      if (updateError) throw updateError;

      // Adjust adjacent ranges
      await adjustAdjacentRanges(currentRule, newMinArea, newMaxArea);

      toast.success("Rule updated and adjacent ranges adjusted");
      cancelEdit();
      loadRules();
    } catch (error: any) {
      toast.error(error.message || "Failed to update rule");
    }
  };

  const addRule = async () => {
    if (!newRule.min_area || !newRule.max_area || !newRule.db_size) {
      toast.error("Please fill in all fields");
      return;
    }

    const minArea = parseFloat(newRule.min_area);
    const maxArea = parseFloat(newRule.max_area);

    if (minArea >= maxArea) {
      toast.error("Min area must be less than max area");
      return;
    }

    try {
      const { error } = await supabase
        .from("db_sizing_rules")
        .insert([{
          project_id: projectId,
          min_area: minArea,
          max_area: maxArea,
          db_size: newRule.db_size,
          category: activeCategory,
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
            category: activeCategory,
            ...rule,
          }))
        );

      if (error) throw error;
      toast.success(`Default rules loaded for ${activeCategory}`);
      loadRules();
    } catch (error: any) {
      toast.error(error.message || "Failed to load default rules");
    }
  };

  const filteredRules = rules.filter(rule => rule.category === activeCategory);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>DB Sizing Rules</CardTitle>
        <CardDescription>
          Configure automatic DB size calculation. Edit ranges to auto-adjust adjacent rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="fast_food">Fast Food</TabsTrigger>
            <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
            <TabsTrigger value="national">National</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeCategory} className="space-y-4 mt-4">
            {filteredRules.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No rules configured for {activeCategory.replace('_', ' ')}</p>
                <Button onClick={loadDefaultRules}>
                  Load Default Rules
                </Button>
              </div>
            )}

            {filteredRules.length > 0 && (
              <div className="space-y-2">
                <Label>Current Rules for {activeCategory.replace('_', ' ')}</Label>
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2 p-2 border rounded">
                    {editingId === rule.id ? (
                      <>
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.min_area}
                            onChange={(e) => setEditForm({ ...editForm, min_area: e.target.value })}
                            placeholder="Min"
                            className="h-8"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.max_area}
                            onChange={(e) => setEditForm({ ...editForm, max_area: e.target.value })}
                            placeholder="Max"
                            className="h-8"
                          />
                          <Input
                            value={editForm.db_size}
                            onChange={(e) => setEditForm({ ...editForm, db_size: e.target.value })}
                            placeholder="DB Size"
                            className="h-8"
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={saveEdit}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                          <span>{rule.min_area}m² - {rule.max_area}m²</span>
                          <span className="font-medium">{rule.db_size}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
