import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { COPPER_CABLE_TABLE, ALUMINIUM_CABLE_TABLE } from "@/utils/cableSizing";

interface CableRatesManagerProps {
  projectId: string;
}

interface CableRate {
  id: string;
  cable_type: string;
  cable_size: string;
  supply_rate_per_meter: number;
  install_rate_per_meter: number;
  termination_cost_per_end: number;
}

export const CableRatesManager = ({ projectId }: CableRatesManagerProps) => {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRate, setSelectedRate] = useState<CableRate | null>(null);
  const [formData, setFormData] = useState({
    cable_type: "",
    cable_size: "",
    supply_rate_per_meter: "",
    install_rate_per_meter: "",
    termination_cost_per_end: "",
  });

  const { data: rates, refetch } = useQuery({
    queryKey: ["cable-rates", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_rates")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      
      // Sort numerically by cable size
      const sorted = (data as CableRate[]).sort((a, b) => {
        // Extract numeric value from cable size (e.g., "2.5mm²" -> 2.5)
        const numA = parseFloat(a.cable_size.replace(/[^\d.]/g, ''));
        const numB = parseFloat(b.cable_size.replace(/[^\d.]/g, ''));
        
        // Sort by cable_type first, then by numeric cable size
        if (a.cable_type !== b.cable_type) {
          return a.cable_type.localeCompare(b.cable_type);
        }
        return numA - numB;
      });
      
      return sorted;
    },
    enabled: !!projectId,
  });

  const formatCurrency = (value: number) => `R ${value.toFixed(2)}`;

  const handleAdd = async () => {
    try {
      const { error } = await supabase.from("cable_rates").insert({
        project_id: projectId,
        cable_type: formData.cable_type,
        cable_size: formData.cable_size,
        supply_rate_per_meter: parseFloat(formData.supply_rate_per_meter),
        install_rate_per_meter: parseFloat(formData.install_rate_per_meter),
        termination_cost_per_end: parseFloat(formData.termination_cost_per_end),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cable rate added successfully",
      });

      refetch();
      setShowAddDialog(false);
      setFormData({
        cable_type: "",
        cable_size: "",
        supply_rate_per_meter: "",
        install_rate_per_meter: "",
        termination_cost_per_end: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedRate) return;

    try {
      const { error } = await supabase
        .from("cable_rates")
        .update({
          cable_type: formData.cable_type,
          cable_size: formData.cable_size,
          supply_rate_per_meter: parseFloat(formData.supply_rate_per_meter),
          install_rate_per_meter: parseFloat(formData.install_rate_per_meter),
          termination_cost_per_end: parseFloat(formData.termination_cost_per_end),
        })
        .eq("id", selectedRate.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cable rate updated successfully",
      });

      refetch();
      setShowEditDialog(false);
      setSelectedRate(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedRate) return;

    try {
      const { error } = await supabase
        .from("cable_rates")
        .delete()
        .eq("id", selectedRate.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cable rate deleted successfully",
      });

      refetch();
      setShowDeleteDialog(false);
      setSelectedRate(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (rate: CableRate) => {
    setSelectedRate(rate);
    setFormData({
      cable_type: rate.cable_type,
      cable_size: rate.cable_size,
      supply_rate_per_meter: rate.supply_rate_per_meter.toString(),
      install_rate_per_meter: rate.install_rate_per_meter.toString(),
      termination_cost_per_end: rate.termination_cost_per_end.toString(),
    });
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cable Rates</CardTitle>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!rates || rates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No cable rates configured. Add rates to calculate costs automatically.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cable Type</TableHead>
                    <TableHead>Cable Size</TableHead>
                    <TableHead>Supply Rate (per meter)</TableHead>
                    <TableHead>Install Rate (per meter)</TableHead>
                    <TableHead>Termination Cost (per end)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.cable_type}</TableCell>
                      <TableCell>{rate.cable_size}</TableCell>
                      <TableCell>{formatCurrency(rate.supply_rate_per_meter)}</TableCell>
                      <TableCell>{formatCurrency(rate.install_rate_per_meter)}</TableCell>
                      <TableCell>{formatCurrency(rate.termination_cost_per_end)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(rate)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRate(rate);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cable Rate</DialogTitle>
            <DialogDescription>
              Add a new cable rate for cost calculations
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cable_type">Cable Type</Label>
              <Select
                value={formData.cable_type}
                onValueChange={(value) => setFormData({ ...formData, cable_type: value, cable_size: "" })}
              >
                <SelectTrigger id="cable_type">
                  <SelectValue placeholder="Select cable type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Copper">Copper</SelectItem>
                  <SelectItem value="Aluminium">Aluminium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cable_size">Cable Size</Label>
              <Select
                value={formData.cable_size}
                onValueChange={(value) => setFormData({ ...formData, cable_size: value })}
                disabled={!formData.cable_type}
              >
                <SelectTrigger id="cable_size">
                  <SelectValue placeholder={formData.cable_type ? "Select cable size" : "Select cable type first"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(formData.cable_type === "Copper" ? COPPER_CABLE_TABLE : ALUMINIUM_CABLE_TABLE).map((cable) => (
                    <SelectItem key={cable.size} value={cable.size}>
                      {cable.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supply_rate">Supply Rate (per meter)</Label>
              <Input
                id="supply_rate"
                type="number"
                step="0.01"
                value={formData.supply_rate_per_meter}
                onChange={(e) => setFormData({ ...formData, supply_rate_per_meter: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="install_rate">Install Rate (per meter)</Label>
              <Input
                id="install_rate"
                type="number"
                step="0.01"
                value={formData.install_rate_per_meter}
                onChange={(e) => setFormData({ ...formData, install_rate_per_meter: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="termination_cost">Termination Cost (per end)</Label>
              <Input
                id="termination_cost"
                type="number"
                step="0.01"
                value={formData.termination_cost_per_end}
                onChange={(e) => setFormData({ ...formData, termination_cost_per_end: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Typically 2 terminations per cable run (one at each end)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cable Rate</DialogTitle>
            <DialogDescription>
              Update the cable rate information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_cable_type">Cable Type</Label>
              <Select
                value={formData.cable_type}
                onValueChange={(value) => setFormData({ ...formData, cable_type: value, cable_size: "" })}
              >
                <SelectTrigger id="edit_cable_type">
                  <SelectValue placeholder="Select cable type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Copper">Copper</SelectItem>
                  <SelectItem value="Aluminium">Aluminium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_cable_size">Cable Size</Label>
              <Select
                value={formData.cable_size}
                onValueChange={(value) => setFormData({ ...formData, cable_size: value })}
                disabled={!formData.cable_type}
              >
                <SelectTrigger id="edit_cable_size">
                  <SelectValue placeholder={formData.cable_type ? "Select cable size" : "Select cable type first"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(formData.cable_type === "Copper" ? COPPER_CABLE_TABLE : ALUMINIUM_CABLE_TABLE).map((cable) => (
                    <SelectItem key={cable.size} value={cable.size}>
                      {cable.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_supply_rate">Supply Rate (per meter)</Label>
              <Input
                id="edit_supply_rate"
                type="number"
                step="0.01"
                value={formData.supply_rate_per_meter}
                onChange={(e) => setFormData({ ...formData, supply_rate_per_meter: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_install_rate">Install Rate (per meter)</Label>
              <Input
                id="edit_install_rate"
                type="number"
                step="0.01"
                value={formData.install_rate_per_meter}
                onChange={(e) => setFormData({ ...formData, install_rate_per_meter: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_termination_cost">Termination Cost (per end)</Label>
              <Input
                id="edit_termination_cost"
                type="number"
                step="0.01"
                value={formData.termination_cost_per_end}
                onChange={(e) => setFormData({ ...formData, termination_cost_per_end: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Typically 2 terminations per cable run (one at each end)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Update Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cable Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this cable rate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
