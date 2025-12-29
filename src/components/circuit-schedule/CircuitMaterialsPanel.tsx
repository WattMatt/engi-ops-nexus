import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Link2, Unlink, FileSpreadsheet } from "lucide-react";
import { useCircuitMaterials, useCreateCircuitMaterial, useUpdateCircuitMaterial, useDeleteCircuitMaterial, DbCircuitMaterial } from "./hooks/useDistributionBoards";
import { LinkToFinalAccountDialog } from "./LinkToFinalAccountDialog";
import { ImportMaterialsDialog } from "./ImportMaterialsDialog";

interface CircuitMaterialsPanelProps {
  circuitId: string;
  projectId: string;
}

export function CircuitMaterialsPanel({ circuitId, projectId }: CircuitMaterialsPanelProps) {
  const { data: materials = [], isLoading } = useCircuitMaterials(circuitId, { projectId });
  const createMaterial = useCreateCircuitMaterial();
  const updateMaterial = useUpdateCircuitMaterial();
  const deleteMaterial = useDeleteCircuitMaterial();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [linkingMaterial, setLinkingMaterial] = useState<DbCircuitMaterial | null>(null);
  const [formData, setFormData] = useState({
    boq_item_code: "",
    description: "",
    unit: "",
    quantity: "",
    supply_rate: "",
    install_rate: "",
  });

  const resetForm = () => {
    setFormData({
      boq_item_code: "",
      description: "",
      unit: "",
      quantity: "",
      supply_rate: "",
      install_rate: "",
    });
  };

  const handleCreate = async () => {
    if (!formData.description.trim()) return;
    await createMaterial.mutateAsync({
      circuit_id: circuitId,
      boq_item_code: formData.boq_item_code || undefined,
      description: formData.description,
      unit: formData.unit || undefined,
      quantity: parseFloat(formData.quantity) || 0,
      supply_rate: parseFloat(formData.supply_rate) || 0,
      install_rate: parseFloat(formData.install_rate) || 0,
    });
    resetForm();
    setShowAddDialog(false);
  };

  const handleDelete = async (material: DbCircuitMaterial) => {
    if (confirm("Delete this material?")) {
      await deleteMaterial.mutateAsync({ id: material.id, circuitId });
    }
  };

  const handleQuantityChange = async (material: DbCircuitMaterial, newQty: string) => {
    const qty = parseFloat(newQty);
    if (!isNaN(qty) && qty >= 0) {
      await updateMaterial.mutateAsync({
        id: material.id,
        circuitId,
        quantity: qty,
      });
    }
  };

  const handleUnlink = async (material: DbCircuitMaterial) => {
    await updateMaterial.mutateAsync({
      id: material.id,
      circuitId,
      final_account_item_id: null,
    });
  };

  const formatCurrency = (value: number) => {
    return `R ${value.toFixed(2)}`;
  };

  const totalCost = materials.reduce((sum, m) => sum + (m.total_cost || 0), 0);

  if (isLoading) {
    return <div className="py-2 text-sm text-muted-foreground">Loading materials...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Circuit Materials</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            Import
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3 w-3 mr-1" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Material</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="boq-code">BoQ Item Code</Label>
                    <Input
                      id="boq-code"
                      placeholder="e.g., D1.1, D2.1"
                      value={formData.boq_item_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, boq_item_code: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      placeholder="e.g., m, No"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="mat-desc">Description *</Label>
                  <Input
                    id="mat-desc"
                    placeholder="Material description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supply-rate">Supply Rate</Label>
                    <Input
                      id="supply-rate"
                      type="number"
                      placeholder="0.00"
                      value={formData.supply_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, supply_rate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="install-rate">Install Rate</Label>
                    <Input
                      id="install-rate"
                      type="number"
                      placeholder="0.00"
                      value={formData.install_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, install_rate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!formData.description.trim() || createMaterial.isPending}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground border rounded-lg">
          No materials assigned. Add materials or import from master library.
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-16">Unit</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-24">Supply</TableHead>
                  <TableHead className="w-24">Install</TableHead>
                  <TableHead className="w-24">Total</TableHead>
                  <TableHead className="w-20">Final A/C</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-mono text-xs">
                      {material.boq_item_code || "-"}
                    </TableCell>
                    <TableCell className="text-sm">{material.description}</TableCell>
                    <TableCell>{material.unit || "-"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-16"
                        value={material.quantity}
                        onChange={(e) => handleQuantityChange(material, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(material.supply_rate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(material.install_rate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(material.total_cost)}</TableCell>
                    <TableCell>
                      {material.final_account_item_id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600"
                          title="Unlink from Final Account"
                          onClick={() => handleUnlink(material)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Link to Final Account"
                          onClick={() => setLinkingMaterial(material)}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(material)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <div className="text-sm font-medium">
              Total: <span className="text-primary">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </>
      )}

      {/* Import Materials Dialog */}
      <ImportMaterialsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        circuitId={circuitId}
        projectId={projectId}
      />

      {/* Link to Final Account Dialog */}
      {linkingMaterial && (
        <LinkToFinalAccountDialog
          open={!!linkingMaterial}
          onOpenChange={(open) => !open && setLinkingMaterial(null)}
          material={linkingMaterial}
          projectId={projectId}
        />
      )}
    </div>
  );
}
