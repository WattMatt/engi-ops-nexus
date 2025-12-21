import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Download, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface GroupedPCData {
  bills: {
    id: string;
    bill_number: number;
    bill_name: string;
    sections: {
      id: string;
      section_code: string;
      section_name: string;
      items: any[];
    }[];
  }[];
}

export function PrimeCostManager({ accountId, projectId }: PrimeCostManagerProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PrimeCostItem>>({});
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
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

  // Fetch prime cost items grouped by bill and section
  const { data: groupedPCData } = useQuery({
    queryKey: ["final-account-items-prime-costs-grouped", accountId],
    queryFn: async (): Promise<GroupedPCData> => {
      // Get all bills for this account with ordering
      const { data: bills, error: billsError } = await supabase
        .from("final_account_bills")
        .select("id, bill_number, bill_name")
        .eq("final_account_id", accountId)
        .order("bill_number", { ascending: true });
      
      if (billsError || !bills || bills.length === 0) {
        return { bills: [] };
      }
      
      const billIds = bills.map((b) => b.id);
      
      // Get all sections for these bills with ordering
      const { data: sections, error: sectionsError } = await supabase
        .from("final_account_sections")
        .select("id, section_code, section_name, bill_id, display_order")
        .in("bill_id", billIds)
        .order("display_order", { ascending: true });
      
      if (sectionsError || !sections || sections.length === 0) {
        return { bills: bills.map(b => ({ ...b, sections: [] })) };
      }
      
      const sectionIds = sections.map((s) => s.id);
      
      // Get prime cost items with ordering
      const { data: items, error: itemsError } = await supabase
        .from("final_account_items")
        .select("*")
        .in("section_id", sectionIds)
        .eq("is_prime_cost", true)
        .order("display_order", { ascending: true });
      
      if (itemsError) {
        console.error("Error fetching PC items:", itemsError);
        return { bills: bills.map(b => ({ ...b, sections: [] })) };
      }
      
      // Group items by section
      const itemsBySection = new Map<string, any[]>();
      (items || []).forEach((item) => {
        const existing = itemsBySection.get(item.section_id) || [];
        existing.push(item);
        itemsBySection.set(item.section_id, existing);
      });
      
      // Group sections by bill, only include sections with PC items
      const sectionsByBill = new Map<string, any[]>();
      sections.forEach((section) => {
        const sectionItems = itemsBySection.get(section.id) || [];
        if (sectionItems.length > 0) {
          const existing = sectionsByBill.get(section.bill_id) || [];
          existing.push({
            ...section,
            items: sectionItems,
          });
          sectionsByBill.set(section.bill_id, existing);
        }
      });
      
      // Build final structure, only include bills with PC sections
      const result: GroupedPCData = {
        bills: bills
          .map((bill) => ({
            ...bill,
            sections: sectionsByBill.get(bill.id) || [],
          }))
          .filter((bill) => bill.sections.length > 0),
      };
      
      return result;
    },
  });

  // Fetch BOQ items with prime costs for import (legacy)
  const { data: boqPrimeCosts } = useQuery({
    queryKey: ["boq-prime-costs", projectId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
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

  // Calculate totals from manual prime cost items
  const manualTotals = primeCosts?.reduce(
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

  // Calculate totals from imported prime cost items (from grouped data)
  const importedTotals = (groupedPCData?.bills || []).reduce(
    (acc, bill) => {
      bill.sections.forEach((section) => {
        section.items.forEach((item: any) => {
          const allowance = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
          const actual = Number(item.pc_actual_cost) || 0;
          const paPercent = Number(item.pc_profit_attendance_percent) || 0;
          const paOnAllowance = allowance * (paPercent / 100);
          const paOnActual = actual * (paPercent / 100);
          
          acc.allowanceTotal += allowance;
          acc.actualTotal += actual;
          acc.paAllowanceTotal += paOnAllowance;
          acc.paActualTotal += paOnActual;
          acc.adjustmentTotal += (actual - allowance) + (paOnActual - paOnAllowance);
          acc.itemCount += 1;
        });
      });
      return acc;
    },
    { allowanceTotal: 0, actualTotal: 0, paAllowanceTotal: 0, paActualTotal: 0, adjustmentTotal: 0, itemCount: 0 }
  );

  // Combined totals
  const totals = {
    allowanceTotal: manualTotals.allowanceTotal + importedTotals.allowanceTotal,
    actualTotal: manualTotals.actualTotal + importedTotals.actualTotal,
    paAllowanceTotal: manualTotals.paAllowanceTotal + importedTotals.paAllowanceTotal,
    paActualTotal: manualTotals.paActualTotal + importedTotals.paActualTotal,
    adjustmentTotal: manualTotals.adjustmentTotal + importedTotals.adjustmentTotal,
  };

  const toggleBill = (billId: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedBills(newExpanded);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const totalItemCount = importedTotals.itemCount + (primeCosts?.length || 0);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading prime costs...</div>;
  }

  const hasPCItems = (groupedPCData?.bills?.length || 0) > 0 || (primeCosts?.length || 0) > 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Prime Cost Summary</CardTitle>
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
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Items</p>
              <p className="text-xl font-semibold">{totalItemCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PC Allowance</p>
              <p className="text-xl font-semibold">{formatCurrency(totals.allowanceTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actual Cost</p>
              <p className="text-xl font-semibold">{formatCurrency(totals.actualTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Adjustment</p>
              <p className={`text-xl font-semibold ${totals.adjustmentTotal >= 0 ? 'text-destructive' : 'text-green-600'}`}>
                {totals.adjustmentTotal >= 0 ? "+" : ""}{formatCurrency(totals.adjustmentTotal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasPCItems ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No Prime Cost items yet. Import a BOQ to auto-detect PC items or add manually.</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add PC Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Grouped Bills with Sections */}
          {groupedPCData?.bills.map((bill) => (
            <Collapsible
              key={bill.id}
              open={expandedBills.has(bill.id)}
              onOpenChange={() => toggleBill(bill.id)}
            >
              <Card>
                <CardHeader className="py-3">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors w-full">
                    {expandedBills.has(bill.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold">Bill No. {bill.bill_number} - {bill.bill_name}</span>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {bill.sections.reduce((sum, s) => sum + s.items.length, 0)} PC items
                    </span>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {bill.sections.map((section) => (
                      <Collapsible
                        key={section.id}
                        open={expandedSections.has(section.id)}
                        onOpenChange={() => toggleSection(section.id)}
                        defaultOpen
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger className="flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors w-full">
                            {expandedSections.has(section.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium text-sm">
                              {section.section_code} - {section.section_name}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {section.items.length} items
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[80px]">Code</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right w-[120px]">PC Allowance</TableHead>
                                  <TableHead className="text-right w-[120px]">Actual Cost</TableHead>
                                  <TableHead className="text-right w-[80px]">P&A %</TableHead>
                                  <TableHead className="text-right w-[120px]">Adjustment</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {section.items.map((item: any) => {
                                  const allowance = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
                                  const actual = Number(item.pc_actual_cost) || 0;
                                  const paPercent = Number(item.pc_profit_attendance_percent) || 0;
                                  const adjustment = (actual - allowance) * (1 + paPercent / 100);

                                  return (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-mono text-sm">{item.item_code || "-"}</TableCell>
                                      <TableCell className="max-w-md truncate" title={item.description}>
                                        {item.description}
                                      </TableCell>
                                      <TableCell className="text-right">{formatCurrency(allowance)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(actual)}</TableCell>
                                      <TableCell className="text-right">{paPercent.toFixed(1)}%</TableCell>
                                      <TableCell className={`text-right font-medium ${adjustment >= 0 ? "text-destructive" : "text-green-600"}`}>
                                        {adjustment !== 0 ? (adjustment >= 0 ? "+" : "") + formatCurrency(adjustment) : "-"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}

          {/* Manual Prime Cost Items */}
          {primeCosts && primeCosts.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Manually Added PC Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-[120px]">PC Allowance</TableHead>
                      <TableHead className="text-right w-[120px]">Actual Cost</TableHead>
                      <TableHead className="text-right w-[80px]">P&A %</TableHead>
                      <TableHead className="text-right w-[120px]">Adjustment</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
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
                                className="w-28 text-right"
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
                          <TableCell className="text-right">{paPercent.toFixed(1)}%</TableCell>
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
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

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