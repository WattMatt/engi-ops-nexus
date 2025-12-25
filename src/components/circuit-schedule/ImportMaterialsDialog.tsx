import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBulkCreateCircuitMaterials } from "./hooks/useDistributionBoards";

interface ImportMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circuitId: string;
  projectId: string;
}

export function ImportMaterialsDialog({ open, onOpenChange, circuitId, projectId }: ImportMaterialsDialogProps) {
  const bulkCreate = useBulkCreateCircuitMaterials();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: masterMaterials = [] } = useQuery({
    queryKey: ["master-materials-for-import"],
    queryFn: async () => {
      const { data } = await supabase
        .from("master_materials")
        .select("id, item_code, description, unit, supply_rate, install_rate")
        .order("item_code");
      return data || [];
    },
    enabled: open,
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleImport = async () => {
    const materials = masterMaterials
      .filter((m: any) => selected.has(m.id))
      .map((m: any) => ({
        circuit_id: circuitId,
        master_material_id: m.id,
        boq_item_code: m.item_code || undefined,
        description: m.description,
        unit: m.unit || undefined,
        quantity: 0,
        supply_rate: m.supply_rate || 0,
        install_rate: m.install_rate || 0,
      }));
    
    if (materials.length > 0) {
      await bulkCreate.mutateAsync(materials);
    }
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Master Materials</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {masterMaterials.map((material: any) => (
              <div
                key={material.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                onClick={() => toggleSelect(material.id)}
              >
                <Checkbox checked={selected.has(material.id)} />
                <div className="flex-1">
                  <span className="font-mono text-xs mr-2">{material.item_code}</span>
                  <span className="text-sm">{material.description}</span>
                </div>
                <span className="text-xs text-muted-foreground">{material.unit}</span>
              </div>
            ))}
            {masterMaterials.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No master materials found</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={selected.size === 0 || bulkCreate.isPending}>
            Import {selected.size} Materials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
