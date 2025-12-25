import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Edit, Trash2, Package, ChevronRight, ChevronDown } from "lucide-react";
import { useDbCircuits, useCreateCircuit, useUpdateCircuit, useDeleteCircuit, DbCircuit } from "./hooks/useDistributionBoards";
import { CircuitMaterialsPanel } from "./CircuitMaterialsPanel";
import { cn } from "@/lib/utils";

interface CircuitListProps {
  boardId: string;
  projectId: string;
}

const CIRCUIT_TYPES = [
  { value: "lighting", label: "Lighting" },
  { value: "power", label: "Power" },
  { value: "socket", label: "Socket Outlet" },
  { value: "ac", label: "Air Conditioning" },
  { value: "fan", label: "Fan/Extractor" },
  { value: "geyser", label: "Geyser" },
  { value: "signage", label: "Signage" },
  { value: "emergency", label: "Emergency" },
  { value: "fire", label: "Fire Alarm" },
  { value: "data", label: "Data/Telkom" },
  { value: "other", label: "Other" },
];

export function CircuitList({ boardId, projectId }: CircuitListProps) {
  const { data: circuits = [], isLoading } = useDbCircuits(boardId);
  const createCircuit = useCreateCircuit();
  const updateCircuit = useUpdateCircuit();
  const deleteCircuit = useDeleteCircuit();

  const [expandedCircuit, setExpandedCircuit] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCircuit, setEditingCircuit] = useState<DbCircuit | null>(null);
  const [formData, setFormData] = useState({
    circuit_ref: "",
    circuit_type: "",
    description: "",
    breaker_size: "",
    cable_size: "",
  });

  const resetForm = () => {
    setFormData({
      circuit_ref: "",
      circuit_type: "",
      description: "",
      breaker_size: "",
      cable_size: "",
    });
  };

  const handleCreate = async () => {
    if (!formData.circuit_ref.trim()) return;
    await createCircuit.mutateAsync({
      distribution_board_id: boardId,
      circuit_ref: formData.circuit_ref,
      circuit_type: formData.circuit_type || undefined,
      description: formData.description || undefined,
      breaker_size: formData.breaker_size || undefined,
      cable_size: formData.cable_size || undefined,
    });
    resetForm();
    setShowCreateDialog(false);
  };

  const handleUpdate = async () => {
    if (!editingCircuit || !formData.circuit_ref.trim()) return;
    await updateCircuit.mutateAsync({
      id: editingCircuit.id,
      boardId,
      circuit_ref: formData.circuit_ref,
      circuit_type: formData.circuit_type || undefined,
      description: formData.description || undefined,
      breaker_size: formData.breaker_size || undefined,
      cable_size: formData.cable_size || undefined,
    });
    setEditingCircuit(null);
    resetForm();
  };

  const handleDelete = async (circuit: DbCircuit) => {
    if (confirm(`Delete circuit "${circuit.circuit_ref}" and all its materials?`)) {
      await deleteCircuit.mutateAsync({ id: circuit.id, boardId });
    }
  };

  const openEditDialog = (circuit: DbCircuit) => {
    setEditingCircuit(circuit);
    setFormData({
      circuit_ref: circuit.circuit_ref,
      circuit_type: circuit.circuit_type || "",
      description: circuit.description || "",
      breaker_size: circuit.breaker_size || "",
      cable_size: circuit.cable_size || "",
    });
  };

  if (isLoading) {
    return <div className="py-2 text-sm text-muted-foreground">Loading circuits...</div>;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Circuits</span>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-3 w-3 mr-1" />
              Add Circuit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Circuit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="circuit-ref">Circuit Ref *</Label>
                  <Input
                    id="circuit-ref"
                    placeholder="e.g., L1, P1, AC1"
                    value={formData.circuit_ref}
                    onChange={(e) => setFormData(prev => ({ ...prev, circuit_ref: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="circuit-type">Type</Label>
                  <Select
                    value={formData.circuit_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, circuit_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CIRCUIT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="circuit-desc">Description</Label>
                <Input
                  id="circuit-desc"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="breaker-size">Breaker Size</Label>
                  <Input
                    id="breaker-size"
                    placeholder="e.g., 20A, 32A"
                    value={formData.breaker_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, breaker_size: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="cable-size">Cable Size</Label>
                  <Input
                    id="cable-size"
                    placeholder="e.g., 2.5mm, 4mm"
                    value={formData.cable_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, cable_size: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.circuit_ref.trim() || createCircuit.isPending}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {circuits.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No circuits yet. Add a circuit to assign materials.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Breaker</TableHead>
                <TableHead>Cable</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {circuits.map((circuit) => (
                <>
                  <TableRow
                    key={circuit.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      expandedCircuit === circuit.id && "bg-muted/30"
                    )}
                    onClick={() => setExpandedCircuit(expandedCircuit === circuit.id ? null : circuit.id)}
                  >
                    <TableCell>
                      {expandedCircuit === circuit.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{circuit.circuit_ref}</TableCell>
                    <TableCell className="capitalize">{circuit.circuit_type || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{circuit.description || "-"}</TableCell>
                    <TableCell>{circuit.breaker_size || "-"}</TableCell>
                    <TableCell>{circuit.cable_size || "-"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(circuit); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setExpandedCircuit(circuit.id); }}>
                            <Package className="h-4 w-4 mr-2" />
                            Materials
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(circuit); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedCircuit === circuit.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/20 p-4">
                        <CircuitMaterialsPanel circuitId={circuit.id} projectId={projectId} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCircuit} onOpenChange={(open) => !open && setEditingCircuit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Circuit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-circuit-ref">Circuit Ref *</Label>
                <Input
                  id="edit-circuit-ref"
                  value={formData.circuit_ref}
                  onChange={(e) => setFormData(prev => ({ ...prev, circuit_ref: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-circuit-type">Type</Label>
                <Select
                  value={formData.circuit_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, circuit_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CIRCUIT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-circuit-desc">Description</Label>
              <Input
                id="edit-circuit-desc"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-breaker-size">Breaker Size</Label>
                <Input
                  id="edit-breaker-size"
                  value={formData.breaker_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, breaker_size: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-cable-size">Cable Size</Label>
                <Input
                  id="edit-cable-size"
                  value={formData.cable_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, cable_size: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingCircuit(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.circuit_ref.trim() || updateCircuit.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
