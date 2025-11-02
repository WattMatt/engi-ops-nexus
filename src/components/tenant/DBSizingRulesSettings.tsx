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
  db_size_allowance: string;
  db_size_scope_of_work: string | null;
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
    db_size_allowance: string;
    db_size_scope_of_work: string;
  }>({
    min_area: "",
    max_area: "",
    db_size_allowance: "",
    db_size_scope_of_work: "",
  });
  const [newRule, setNewRule] = useState({
    min_area: "",
    max_area: "",
    db_size_allowance: "",
    db_size_scope_of_work: "",
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
      db_size_allowance: rule.db_size_allowance,
      db_size_scope_of_work: rule.db_size_scope_of_work || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ min_area: "", max_area: "", db_size_allowance: "", db_size_scope_of_work: "" });
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
    const isFixedSizeCategory = ['fast_food', 'restaurant'].includes(activeCategory);
    
    if (!editForm.db_size_allowance) {
      toast.error("Please fill in DB Allowance");
      return;
    }
    
    if (!isFixedSizeCategory && (!editForm.min_area || !editForm.max_area)) {
      toast.error("Please fill in area range");
      return;
    }

    // Use different dummy ranges for fixed size categories to avoid constraint conflicts
    let newMinArea, newMaxArea;
    if (activeCategory === 'fast_food') {
      newMinArea = 0;
      newMaxArea = 999998;
    } else if (activeCategory === 'restaurant') {
      newMinArea = 1000000;
      newMaxArea = 1999999;
    } else {
      newMinArea = parseFloat(editForm.min_area);
      newMaxArea = parseFloat(editForm.max_area);
    }

    if (!isFixedSizeCategory && newMinArea >= newMaxArea) {
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
          db_size_allowance: editForm.db_size_allowance,
          db_size_scope_of_work: editForm.db_size_scope_of_work || null,
        })
        .eq("id", editingId);

      if (updateError) throw updateError;

      // Only adjust adjacent ranges for standard category
      if (!isFixedSizeCategory) {
        await adjustAdjacentRanges(currentRule, newMinArea, newMaxArea);
      }

      toast.success("Rule updated successfully");
      cancelEdit();
      loadRules();
    } catch (error: any) {
      toast.error(error.message || "Failed to update rule");
    }
  };

  const addRule = async () => {
    // For fast_food and restaurant, area is not applicable - just need DB size
    const isFixedSizeCategory = ['fast_food', 'restaurant'].includes(activeCategory);
    
    if (!newRule.db_size_allowance) {
      toast.error("Please fill in DB Allowance");
      return;
    }
    
    if (!isFixedSizeCategory && (!newRule.min_area || !newRule.max_area)) {
      toast.error("Please fill in area range for standard category");
      return;
    }

    // Use different dummy ranges for fixed size categories to avoid constraint conflicts
    let minArea, maxArea;
    if (activeCategory === 'fast_food') {
      minArea = 0;
      maxArea = 999998;
    } else if (activeCategory === 'restaurant') {
      minArea = 1000000;
      maxArea = 1999999;
    } else {
      minArea = parseFloat(newRule.min_area);
      maxArea = parseFloat(newRule.max_area);
    }

    if (!isFixedSizeCategory && minArea >= maxArea) {
      toast.error("Min area must be less than max area");
      return;
    }

    try {
      // For fixed size categories, check if rule already exists and update instead of insert
      if (isFixedSizeCategory) {
        const existingRule = rules.find(r => r.category === activeCategory);
        
        if (existingRule) {
          // Update existing rule
          const { error } = await supabase
            .from("db_sizing_rules")
            .update({
              db_size_allowance: newRule.db_size_allowance,
              db_size_scope_of_work: newRule.db_size_scope_of_work || null,
            })
            .eq("id", existingRule.id);

          if (error) throw error;
          toast.success("Rule updated successfully");
        } else {
          // Insert new rule
          const { error } = await supabase
            .from("db_sizing_rules")
            .insert([{
              project_id: projectId,
              min_area: minArea,
              max_area: maxArea,
              db_size_allowance: newRule.db_size_allowance,
              db_size_scope_of_work: newRule.db_size_scope_of_work || null,
              category: activeCategory,
            }]);

          if (error) throw error;
          toast.success("Rule added successfully");
        }
      } else {
        // Standard category - insert new rule
        const { error } = await supabase
          .from("db_sizing_rules")
          .insert([{
            project_id: projectId,
            min_area: minArea,
            max_area: maxArea,
            db_size_allowance: newRule.db_size_allowance,
            db_size_scope_of_work: newRule.db_size_scope_of_work || null,
            category: activeCategory,
          }]);

        if (error) throw error;
        toast.success("Rule added successfully");
      }
      
      setNewRule({ min_area: "", max_area: "", db_size_allowance: "", db_size_scope_of_work: "" });
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
      { min_area: 0, max_area: 80, db_size_allowance: "60A TP" },
      { min_area: 81, max_area: 200, db_size_allowance: "80A TP" },
      { min_area: 201, max_area: 300, db_size_allowance: "100A TP" },
      { min_area: 301, max_area: 450, db_size_allowance: "125A TP" },
      { min_area: 451, max_area: 600, db_size_allowance: "160A TP" },
      { min_area: 601, max_area: 1200, db_size_allowance: "200A TP" },
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
          Standard: Configure area-based ranges. Fast Food & Restaurant: Set fixed DB size (area not applicable). National: Manual entry per tenant.
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
                <div className="flex items-center justify-between">
                  <Label>Current Rules for {activeCategory.replace('_', ' ')}</Label>
                  {['fast_food', 'restaurant'].includes(activeCategory) && filteredRules.length > 0 && (
                    <p className="text-xs text-muted-foreground">Only one fixed size allowed per category</p>
                  )}
                </div>
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2 p-2 border rounded">
                     {editingId === rule.id ? (
                      <>
                        <div className={`flex-1 grid gap-2 ${['fast_food', 'restaurant'].includes(activeCategory) ? 'grid-cols-2' : 'grid-cols-4'}`}>
                          {!['fast_food', 'restaurant'].includes(activeCategory) && (
                            <>
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
                            </>
                          )}
                          <Input
                            value={editForm.db_size_allowance}
                            onChange={(e) => setEditForm({ ...editForm, db_size_allowance: e.target.value })}
                            placeholder="Allowance"
                            className="h-8"
                          />
                          <Input
                            value={editForm.db_size_scope_of_work}
                            onChange={(e) => setEditForm({ ...editForm, db_size_scope_of_work: e.target.value })}
                            placeholder="Scope of Work"
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
                        <div className={`flex-1 grid gap-2 text-sm ${['fast_food', 'restaurant'].includes(activeCategory) ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {!['fast_food', 'restaurant'].includes(activeCategory) && (
                            <span>{rule.min_area}m² - {rule.max_area}m²</span>
                          )}
                          <span className="font-medium">{rule.db_size_allowance}</span>
                          <span className="font-medium text-muted-foreground">{rule.db_size_scope_of_work || "-"}</span>
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
              <Label>
                {['fast_food', 'restaurant'].includes(activeCategory) && filteredRules.length > 0 
                  ? 'Update Fixed DB Size' 
                  : 'Add New Rule'}
              </Label>
              {['fast_food', 'restaurant'].includes(activeCategory) ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="db_size_allowance" className="text-xs">DB Allowance *</Label>
                    <Input
                      id="db_size_allowance"
                      value={newRule.db_size_allowance}
                      onChange={(e) => setNewRule({ ...newRule, db_size_allowance: e.target.value })}
                      placeholder="60A TP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="db_size_scope_of_work" className="text-xs">DB Scope of Work</Label>
                    <Input
                      id="db_size_scope_of_work"
                      value={newRule.db_size_scope_of_work}
                      onChange={(e) => setNewRule({ ...newRule, db_size_scope_of_work: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addRule} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      {filteredRules.length > 0 ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <Label htmlFor="min_area" className="text-xs">Min Area (m²) *</Label>
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
                    <Label htmlFor="max_area" className="text-xs">Max Area (m²) *</Label>
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
                    <Label htmlFor="db_size_allowance" className="text-xs">DB Allowance *</Label>
                    <Input
                      id="db_size_allowance"
                      value={newRule.db_size_allowance}
                      onChange={(e) => setNewRule({ ...newRule, db_size_allowance: e.target.value })}
                      placeholder="60A TP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="db_size_scope_of_work" className="text-xs">DB Scope of Work</Label>
                    <Input
                      id="db_size_scope_of_work"
                      value={newRule.db_size_scope_of_work}
                      onChange={(e) => setNewRule({ ...newRule, db_size_scope_of_work: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addRule} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
