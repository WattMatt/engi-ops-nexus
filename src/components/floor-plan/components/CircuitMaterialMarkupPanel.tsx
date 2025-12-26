import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  useDistributionBoards, 
  useDbCircuits,
  useCircuitMaterials,
  useCreateCircuitMaterial,
  useUpdateCircuitMaterial,
  useDeleteCircuitMaterial,
  DbCircuit 
} from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { 
  Zap, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Package,
  Trash2,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CircuitMaterialMarkupPanelProps {
  projectId: string;
  onClose: () => void;
  onMaterialAdded?: (circuitId: string, description: string) => void;
}

// Sub-component to show circuits for a board
function BoardCircuits({ 
  boardId, 
  projectId,
  selectedCircuitId,
  onSelectCircuit 
}: { 
  boardId: string; 
  projectId: string;
  selectedCircuitId: string | null;
  onSelectCircuit: (circuit: DbCircuit | null) => void;
}) {
  const { data: circuits = [], isLoading } = useDbCircuits(boardId);

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2 px-4">Loading circuits...</div>;
  }

  if (circuits.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2 px-4">
        No circuits in this DB
      </div>
    );
  }

  return (
    <div className="space-y-1 py-2 px-2">
      {circuits.map((circuit) => (
        <button
          key={circuit.id}
          onClick={() => onSelectCircuit(selectedCircuitId === circuit.id ? null : circuit)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
            selectedCircuitId === circuit.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{circuit.circuit_ref}</span>
            <Badge variant="outline" className={cn(
              "text-xs",
              selectedCircuitId === circuit.id && "border-primary-foreground/50 text-primary-foreground"
            )}>
              {circuit.circuit_type}
            </Badge>
          </div>
          {circuit.description && (
            <p className={cn(
              "text-xs mt-0.5 truncate",
              selectedCircuitId === circuit.id ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {circuit.description}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}

// Sub-component to show materials for selected circuit
function CircuitMaterialsList({ 
  circuitId,
  projectId 
}: { 
  circuitId: string;
  projectId: string;
}) {
  const { data: materials = [], isLoading } = useCircuitMaterials(circuitId);
  const createMaterial = useCreateCircuitMaterial();
  const deleteMaterial = useDeleteCircuitMaterial();
  const [newMaterial, setNewMaterial] = useState({ description: '', quantity: '1', unit: 'No' });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddMaterial = async () => {
    if (!newMaterial.description.trim()) return;
    
    try {
      await createMaterial.mutateAsync({
        circuit_id: circuitId,
        description: newMaterial.description,
        quantity: parseFloat(newMaterial.quantity) || 1,
        unit: newMaterial.unit || 'No',
      });
      setNewMaterial({ description: '', quantity: '1', unit: 'No' });
      setShowAddForm(false);
      toast.success('Material added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add material');
    }
  };

  const handleDelete = async (materialId: string) => {
    try {
      await deleteMaterial.mutateAsync({ id: materialId, circuitId });
      toast.success('Material removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove material');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {materials.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No materials assigned yet
        </p>
      ) : (
        <div className="space-y-1">
          {materials.map((material) => (
            <div 
              key={material.id} 
              className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/50 text-sm"
            >
              <div className="flex-1 min-w-0">
                <span className="truncate block">{material.description}</span>
                <span className="text-xs text-muted-foreground">
                  {material.quantity} {material.unit}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(material.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="space-y-2 p-2 rounded-lg bg-muted/30 border border-border">
          <Input
            placeholder="Material description"
            value={newMaterial.description}
            onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Qty"
              value={newMaterial.quantity}
              onChange={(e) => setNewMaterial(prev => ({ ...prev, quantity: e.target.value }))}
              className="h-8 text-sm w-20"
            />
            <Input
              placeholder="Unit"
              value={newMaterial.unit}
              onChange={(e) => setNewMaterial(prev => ({ ...prev, unit: e.target.value }))}
              className="h-8 text-sm w-20"
            />
            <Button 
              size="sm" 
              className="h-8"
              onClick={handleAddMaterial}
              disabled={!newMaterial.description.trim() || createMaterial.isPending}
            >
              Add
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className="h-8"
              onClick={() => setShowAddForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      )}
    </div>
  );
}

export function CircuitMaterialMarkupPanel({ projectId, onClose, onMaterialAdded }: CircuitMaterialMarkupPanelProps) {
  const { data: boards = [], isLoading } = useDistributionBoards(projectId);
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  const [selectedCircuit, setSelectedCircuit] = useState<DbCircuit | null>(null);

  const toggleBoard = (id: string) => {
    const newExpanded = new Set(expandedBoards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedBoards(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Circuit Materials</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left: Circuit List */}
        <div className="w-1/2 border-r border-border overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">SELECT CIRCUIT</span>
          </div>
          <ScrollArea className="flex-1">
            {boards.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No distribution boards found.</p>
                <p className="text-xs mt-1">Create DBs and circuits first.</p>
              </div>
            ) : (
              <div className="py-2">
                {boards.map((board) => (
                  <Collapsible 
                    key={board.id} 
                    open={expandedBoards.has(board.id)}
                    onOpenChange={() => toggleBoard(board.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors",
                        expandedBoards.has(board.id) && "bg-muted/30"
                      )}>
                        {expandedBoards.has(board.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{board.name}</span>
                        {board.location && (
                          <span className="text-xs text-muted-foreground">— {board.location}</span>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <BoardCircuits 
                        boardId={board.id} 
                        projectId={projectId}
                        selectedCircuitId={selectedCircuit?.id || null}
                        onSelectCircuit={setSelectedCircuit}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Materials for selected circuit */}
        <div className="w-1/2 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">
              {selectedCircuit ? `MATERIALS: ${selectedCircuit.circuit_ref}` : 'MATERIALS'}
            </span>
          </div>
          <ScrollArea className="flex-1 p-3">
            {selectedCircuit ? (
              <CircuitMaterialsList 
                circuitId={selectedCircuit.id} 
                projectId={projectId}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm text-center">Select a circuit to view and add materials</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
