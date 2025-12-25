import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateCircuitMaterial, DbCircuitMaterial } from "./hooks/useDistributionBoards";
import { toast } from "sonner";

interface LinkToFinalAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: DbCircuitMaterial;
  projectId: string;
}

export function LinkToFinalAccountDialog({ open, onOpenChange, material, projectId }: LinkToFinalAccountDialogProps) {
  const updateMaterial = useUpdateCircuitMaterial();
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  const { data: finalAccountItems = [] } = useQuery({
    queryKey: ["final-account-items-for-linking", projectId],
    queryFn: async () => {
      const { data: account } = await supabase
        .from("final_accounts")
        .select("id")
        .eq("project_id", projectId)
        .single();
      
      if (!account) return [];

      const { data: items } = await supabase
        .from("final_account_items")
        .select("id, item_code, description, section_id")
        .order("item_code");
      
      return items || [];
    },
    enabled: open && !!projectId,
  });

  const handleLink = async () => {
    if (!selectedItemId) return;
    await updateMaterial.mutateAsync({
      id: material.id,
      circuitId: material.circuit_id,
      final_account_item_id: selectedItemId,
    });
    toast.success("Linked to Final Account");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to Final Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Link "{material.description}" to a Final Account item
          </p>
          <div>
            <Label>Final Account Item</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item..." />
              </SelectTrigger>
              <SelectContent>
                {finalAccountItems.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item_code} - {item.description?.slice(0, 50)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleLink} disabled={!selectedItemId || updateMaterial.isPending}>
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
