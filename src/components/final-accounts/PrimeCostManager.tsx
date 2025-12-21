import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Download } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface PrimeCostManagerProps {
  accountId: string;
  projectId: string;
}

interface PrimeCostItem {
  id: string;
  item_code: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  pc_allowance: number;
  actual_cost: number;
  profit_attendance_percent: number;
  notes: string | null;
  display_order: number;
}

export function PrimeCostManager({ accountId, projectId }: PrimeCostManagerProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PrimeCostItem>>({});
  const [newItem, setNewItem] = useState({
    item_code: "",
    description: "",
    unit: "Sum",
    quantity: 1,
    pc_allowance: 0,
    actual_cost: 0,
    profit_attendance_percent: 0,
    notes: "",
  });

  // Fetch prime cost items
  const { data: primeCosts, isLoading } = useQuery({
    queryKey: ["final-account-prime-costs", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_account_prime_costs")
        .select("*")
        .eq("account_id", accountId)
        .order("display_order");
      if (error) throw error;
      return data as PrimeCostItem[];
    },
  });

  // Fetch BOQ items with prime costs for import
  const { data: boqPrimeCosts } = useQuery({
    queryKey: ["boq-prime-costs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_extracted_items")
        .select(`
          id,
          item_code,
          item_description,
          unit,
          quantity,
          prime_cost,
          profit_percentage,
          upload_id,
          boq_uploads!inner(project_id)
        `)
        .eq("boq_uploads.project_id", projectId)
        .not("prime_cost", "is", null)
        .gt("prime_cost", 0);
      if (error) throw error;
      return data;
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const { error } = await supabase
        .from("final_account_prime_costs")
        .insert({
          account_id: accountId,
          item_code: item.item_code || null,
          description: item.description,
          unit: item.unit || null,
          quantity: item.quantity,
          pc_allowance: item.pc_allowance,
          actual_cost: item.actual_cost,
          profit_attendance_percent: item.profit_attendance_percent,
          notes: item.notes || null,
          display_order: (primeCosts?.length || 0) + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-prime-costs", accountId] });
      toast.success("Prime Cost item added");
      setAddDialogOpen(false);
      setNewItem({
        item_code: "",
        description: "",
        unit: "Sum",
        quantity: 1,
        pc_allowance: 0,
        actual_cost: 0,
        profit_attendance_percent: 0,
        notes: "",
      });
    },
    onError: () => toast.error("Failed to add item"),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<PrimeCostItem> }) => {
      const { error } = await supabase
        .from("final_account_prime_costs")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-prime-costs", accountId] });
      toast.success("Item updated");
      setEditingId(null);
      setEditValues({});
    },
    onError: () => toast.error("Failed to update item"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("final_account_prime_costs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-prime-costs", accountId] });
      toast.success("Item deleted");
    },
    onError: () => toast.error("Failed to delete item"),
  });

  // Import from BOQ
  const importMutation = useMutation({
    mutationFn: async (items: typeof boqPrimeCosts) => {
      if (!items || items.length === 0) return;
      
      const insertItems = items.map((item, index) => ({
        account_id: accountId,
        item_code: item.item_code,
        description: item.item_description,
        unit: item.unit,
        quantity: item.quantity || 1,
        pc_allowance: item.prime_cost || 0,
        actual_cost: 0,
        profit_attendance_percent: item.profit_percentage || 0,
        boq_item_id: item.id,
        display_order: (primeCosts?.length || 0) + index + 1,
      }));

      const { error } = await supabase
        .from("final_account_prime_costs")
        .insert(insertItems);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-prime-costs", accountId] });
      toast.success("Prime Cost items imported from BOQ");
      setImportDialogOpen(false);
    },
    onError: () => toast.error("Failed to import items"),
  });

  const startEditing = (item: PrimeCostItem) => {
    setEditingId(item.id);
    setEditValues({
      actual_cost: item.actual_cost,
      notes: item.notes,
    });
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, values: editValues });
  };

  // Calculate totals
  const totals = primeCosts?.reduce(
    (acc, item) => {
      const allowance = Number(item.pc_allowance) || 0;
      const actual = Number(item.actual_cost) || 0;
      const paPercent = Number(item.profit_attendance_percent) || 0;
      const paOnAllowance = allowance * (paPercent / 100);
      const paOnActual = actual * (paPercent / 100);
      
      return {
        allowanceTotal: acc.allowanceTotal + allowance,
        actualTotal: acc.actualTotal + actual,
        paAllowanceTotal: acc.paAllowanceTotal + paOnAllowance,
        paActualTotal: acc.paActualTotal + paOnActual,
        adjustmentTotal: acc.adjustmentTotal + (actual - allowance) + (paOnActual - paOnAllowance),
      };
    },
    { allowanceTotal: 0, actualTotal: 0, paAllowanceTotal: 0, paActualTotal: 0, adjustmentTotal: 0 }
  ) || { allowanceTotal: 0, actualTotal: 0, paAllowanceTotal: 0, paActualTotal: 0, adjustmentTotal: 0 };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading prime costs...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Prime Cost Items</CardTitle>
          <div className="flex gap-2">
            {boqPrimeCosts && boqPrimeCosts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Import from BOQ
              </Button>
            )}
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add PC Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!primeCosts || primeCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Prime Cost items yet. Add items manually or import from BOQ.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">PC Allowance</TableHead>
                  <TableHead className="text-right">Actual Cost</TableHead>
                  <TableHead className="text-right">P&A %</TableHead>
                  <TableHead className="text-right">P&A on Allowance</TableHead>
                  <TableHead className="text-right">P&A on Actual</TableHead>
                  <TableHead className="text-right">Adjustment</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {primeCosts.map((item) => {
                  const allowance = Number(item.pc_allowance) || 0;
                  const actual = editingId === item.id ? Number(editValues.actual_cost) || 0 : Number(item.actual_cost) || 0;
                  const paPercent = Number(item.profit_attendance_percent) || 0;
                  const paOnAllowance = allowance * (paPercent / 100);
                  const paOnActual = actual * (paPercent / 100);
                  const adjustment = (actual - allowance) + (paOnActual - paOnAllowance);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.item_code || "-"}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(allowance)}</TableCell>
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-32 text-right"
                            value={editValues.actual_cost || 0}
                            onChange={(e) => setEditValues({ ...editValues, actual_cost: parseFloat(e.target.value) || 0 })}
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:underline" 
                            onClick={() => startEditing(item)}
                          >
                            {formatCurrency(actual)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{paPercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(paOnAllowance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(paOnActual)}</TableCell>
                      <TableCell className={`text-right font-medium ${adjustment >= 0 ? "text-destructive" : "text-green-600"}`}>
                        {adjustment >= 0 ? "+" : ""}{formatCurrency(adjustment)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {editingId === item.id ? (
                            <Button variant="ghost" size="icon" onClick={() => saveEdit(item.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>TOTALS</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.allowanceTotal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.actualTotal)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.paAllowanceTotal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.paActualTotal)}</TableCell>
                  <TableCell className={`text-right ${totals.adjustmentTotal >= 0 ? "text-destructive" : "text-green-600"}`}>
                    {totals.adjustmentTotal >= 0 ? "+" : ""}{formatCurrency(totals.adjustmentTotal)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prime Cost Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Code</Label>
                <Input
                  value={newItem.item_code}
                  onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
                  placeholder="e.g., PC1"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder="Sum"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Prime Cost item description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>PC Allowance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.pc_allowance}
                  onChange={(e) => setNewItem({ ...newItem, pc_allowance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.actual_cost}
                  onChange={(e) => setNewItem({ ...newItem, actual_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>P&A %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.profit_attendance_percent}
                  onChange={(e) => setNewItem({ ...newItem, profit_attendance_percent: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(newItem)} disabled={!newItem.description}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Prime Costs from BOQ</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">PC Amount</TableHead>
                  <TableHead className="text-right">P&A %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boqPrimeCosts?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.item_code || "-"}</TableCell>
                    <TableCell>{item.item_description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.prime_cost)}</TableCell>
                    <TableCell className="text-right">{item.profit_percentage || 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => importMutation.mutate(boqPrimeCosts)}>
              Import All ({boqPrimeCosts?.length || 0} items)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}