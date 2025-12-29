import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Link2, Check, AlertCircle } from "lucide-react";

interface MapAllToFinalAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface AggregatedMaterial {
  boq_item_code: string | null;
  description: string;
  unit: string | null;
  total_quantity: number;
  total_cost: number;
  material_ids: string[];
  circuit_ids: string[];
  linked_item_id: string | null;
}

export function MapAllToFinalAccountDialog({ open, onOpenChange, projectId }: MapAllToFinalAccountDialogProps) {
  const queryClient = useQueryClient();
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isMapping, setIsMapping] = useState(false);

  // Fetch all circuit materials for this project (including unassigned/general items)
  const { data: allMaterials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ["all-circuit-materials", projectId],
    queryFn: async () => {
      // Get all distribution boards for this project
      const { data: boards } = await supabase
        .from("distribution_boards")
        .select("id")
        .eq("project_id", projectId);
      
      const boardIds = boards?.map(b => b.id) || [];
      
      // Get all circuits for these boards
      let circuitIds: string[] = [];
      if (boardIds.length > 0) {
        const { data: circuits } = await supabase
          .from("db_circuits")
          .select("id")
          .in("distribution_board_id", boardIds);
        circuitIds = circuits?.map(c => c.id) || [];
      }

      // Get materials assigned to circuits
      let circuitMaterials: any[] = [];
      if (circuitIds.length > 0) {
        const { data: materials } = await supabase
          .from("db_circuit_materials")
          .select("*")
          .in("circuit_id", circuitIds);
        circuitMaterials = materials || [];
      }

      // Get unassigned/general materials for this project (circuit_id is null)
      const { data: unassignedMaterials } = await supabase
        .from("db_circuit_materials")
        .select("*")
        .eq("project_id", projectId)
        .is("circuit_id", null);

      // Combine both sets
      return [...circuitMaterials, ...(unassignedMaterials || [])];
    },
    enabled: open && !!projectId,
  });

  // Fetch final account items for linking (properly filtered by project)
  const { data: finalAccountItems = [], isLoading: loadingFinalItems } = useQuery({
    queryKey: ["final-account-items-for-bulk-linking", projectId],
    queryFn: async (): Promise<Array<{ id: string; item_code: string | null; description: string | null; section_id: string }>> => {
      // Get the final account for this project
      const { data: account } = await supabase
        .from("final_accounts")
        .select("id")
        .eq("project_id", projectId)
        .single();
      
      if (!account) return [];

      // Get all section IDs for this final account
      const sectionQuery: any = supabase.from("final_account_sections").select("id");
      const { data: sections } = await sectionQuery.eq("final_account_id", account.id);
      
      if (!sections || sections.length === 0) return [];

      const sectionIds: string[] = sections.map((s: { id: string }) => s.id);

      // Get all items for these sections
      const itemQuery = supabase.from("final_account_items").select("id, item_code, description, section_id");
      const { data: items } = await itemQuery.in("section_id", sectionIds).order("item_code");
      
      return (items || []) as Array<{ id: string; item_code: string | null; description: string | null; section_id: string }>;
    },
    enabled: open && !!projectId,
  });

  // Aggregate materials by BOQ item code
  const aggregatedMaterials = useMemo(() => {
    const grouped = new Map<string, AggregatedMaterial>();
    
    allMaterials.forEach((m: any) => {
      const key = m.boq_item_code || m.description;
      const existing = grouped.get(key);
      
      if (existing) {
        existing.total_quantity += m.quantity || 0;
        existing.total_cost += m.total_cost || 0;
        existing.material_ids.push(m.id);
        if (!existing.circuit_ids.includes(m.circuit_id)) {
          existing.circuit_ids.push(m.circuit_id);
        }
        if (!existing.linked_item_id && m.final_account_item_id) {
          existing.linked_item_id = m.final_account_item_id;
        }
      } else {
        grouped.set(key, {
          boq_item_code: m.boq_item_code,
          description: m.description,
          unit: m.unit,
          total_quantity: m.quantity || 0,
          total_cost: m.total_cost || 0,
          material_ids: [m.id],
          circuit_ids: [m.circuit_id],
          linked_item_id: m.final_account_item_id,
        });
      }
    });
    
    return Array.from(grouped.values()).sort((a, b) => 
      (a.boq_item_code || 'zzz').localeCompare(b.boq_item_code || 'zzz', undefined, { numeric: true })
    );
  }, [allMaterials]);

  const unmappedMaterials = aggregatedMaterials.filter(m => !m.linked_item_id);
  const mappedMaterials = aggregatedMaterials.filter(m => m.linked_item_id);

  const handleToggleItem = (key: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(key)) {
      newChecked.delete(key);
    } else {
      newChecked.add(key);
    }
    setCheckedItems(newChecked);
  };

  const handleSelectAll = () => {
    if (checkedItems.size === unmappedMaterials.length) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(unmappedMaterials.map(m => m.boq_item_code || m.description)));
    }
  };

  const handleMapSelected = async () => {
    const toMap = unmappedMaterials.filter(m => 
      checkedItems.has(m.boq_item_code || m.description) && 
      selectedMappings[m.boq_item_code || m.description]
    );
    
    if (toMap.length === 0) {
      toast.error("Select items and choose Final Account mappings first");
      return;
    }

    setIsMapping(true);
    try {
      for (const material of toMap) {
        const finalAccountItemId = selectedMappings[material.boq_item_code || material.description];
        
        // Update all materials with this BOQ code
        const { error } = await supabase
          .from("db_circuit_materials")
          .update({ final_account_item_id: finalAccountItemId })
          .in("id", material.material_ids);
        
        if (error) throw error;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["all-circuit-materials"] });
      queryClient.invalidateQueries({ queryKey: ["circuit-materials"] });
      
      toast.success(`Mapped ${toMap.length} item groups to Final Account`);
      setCheckedItems(new Set());
      setSelectedMappings({});
    } catch (error: any) {
      toast.error(error.message || "Failed to map materials");
    } finally {
      setIsMapping(false);
    }
  };

  const formatCurrency = (value: number) => `R ${value.toFixed(2)}`;

  const totalUnmappedCost = unmappedMaterials.reduce((sum, m) => sum + m.total_cost, 0);
  const totalMappedCost = mappedMaterials.reduce((sum, m) => sum + m.total_cost, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Map All Materials to Final Account
          </DialogTitle>
          <DialogDescription>
            Bulk link circuit materials to Final Account items by BOQ code
          </DialogDescription>
        </DialogHeader>

        {loadingMaterials ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : aggregatedMaterials.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No circuit materials found.</p>
            <p className="text-sm">Add materials to circuits first.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-sm text-muted-foreground">Unmapped</div>
                <div className="text-lg font-semibold text-destructive">
                  {unmappedMaterials.length} items • {formatCurrency(totalUnmappedCost)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-sm text-muted-foreground">Already Mapped</div>
                <div className="text-lg font-semibold text-green-600">
                  {mappedMaterials.length} items • {formatCurrency(totalMappedCost)}
                </div>
              </div>
            </div>

            {/* Unmapped Materials Table */}
            {unmappedMaterials.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Unmapped Materials</h4>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {checkedItems.size === unmappedMaterials.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <ScrollArea className="h-[280px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-16">Qty</TableHead>
                        <TableHead className="w-24">Total</TableHead>
                        <TableHead className="w-64">Map to Final Account</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmappedMaterials.map((material) => {
                        const key = material.boq_item_code || material.description;
                        return (
                          <TableRow key={key}>
                            <TableCell>
                              <Checkbox
                                checked={checkedItems.has(key)}
                                onCheckedChange={() => handleToggleItem(key)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {material.boq_item_code || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {material.description}
                              <Badge variant="outline" className="ml-2 text-xs">
                                {material.circuit_ids.length} circuit(s)
                              </Badge>
                            </TableCell>
                            <TableCell>{material.total_quantity.toFixed(1)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(material.total_cost)}</TableCell>
                            <TableCell>
                              <Select
                                value={selectedMappings[key] || ""}
                                onValueChange={(value) => setSelectedMappings(prev => ({ ...prev, [key]: value }))}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select item..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {finalAccountItems.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.item_code} - {item.description?.slice(0, 40)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Mapped Materials (collapsed) */}
            {mappedMaterials.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-green-600 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Already Mapped ({mappedMaterials.length})
                </h4>
                <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
                  {mappedMaterials.map(m => m.boq_item_code || m.description).join(", ")}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleMapSelected} 
            disabled={checkedItems.size === 0 || isMapping}
          >
            {isMapping ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mapping...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Map {checkedItems.size} Selected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
