import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, CircuitBoard, Zap, Package, X, Radio, ArrowRight, Trash2, CheckSquare, Square, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  useDistributionBoards, 
  useDbCircuits, 
  useCircuitMaterials,
  useDeleteCircuitMaterial,
  useReassignCircuitMaterial,
  useCreateDistributionBoard,
  useCreateCircuit,
  DbCircuit,
} from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { cn } from '@/lib/utils';

interface CircuitScheduleRightPanelProps {
  projectId: string;
  floorPlanId?: string;
  selectedCircuit: DbCircuit | null;
  onSelectCircuit: (circuit: DbCircuit | null) => void;
  onClose: () => void;
}

// Collect all circuits for reassignment dropdown
const useAllCircuits = (projectId: string) => {
  const { data: boards } = useDistributionBoards(projectId);
  const [allCircuits, setAllCircuits] = useState<DbCircuit[]>([]);
  
  // We'll use a simpler approach - return boards and let component fetch circuits
  return { boards: boards || [] };
};

// Sub-component to display circuits for a distribution board
const BoardCircuits: React.FC<{
  boardId: string;
  selectedCircuit: DbCircuit | null;
  onSelectCircuit: (circuit: DbCircuit | null) => void;
}> = ({ boardId, selectedCircuit, onSelectCircuit }) => {
  const { data: circuits, isLoading } = useDbCircuits(boardId);

  if (isLoading) {
    return <div className="pl-6 py-2 text-xs text-muted-foreground">Loading circuits...</div>;
  }

  if (!circuits || circuits.length === 0) {
    return <div className="pl-6 py-2 text-xs text-muted-foreground italic">No circuits</div>;
  }

  return (
    <div className="pl-4 space-y-1">
      {circuits.map((circuit) => {
        const isSelected = selectedCircuit?.id === circuit.id;
        return (
          <button
            key={circuit.id}
            onClick={() => onSelectCircuit(isSelected ? null : circuit)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent text-foreground"
            )}
          >
            <Radio 
              className={cn(
                "h-4 w-4 flex-shrink-0",
                isSelected ? "text-primary-foreground" : "text-muted-foreground"
              )} 
            />
            <div className="flex-grow min-w-0">
              <div className="font-medium truncate">{circuit.circuit_ref}</div>
              {circuit.description && (
                <div className={cn(
                  "text-xs truncate",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {circuit.description}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Sub-component to show materials for selected circuit with reassignment
const CircuitMaterialsList: React.FC<{ 
  circuitId: string; 
  projectId: string;
  allBoards: Array<{ id: string; name: string }>;
}> = ({ circuitId, projectId, allBoards }) => {
  const { data: materials, isLoading } = useCircuitMaterials(circuitId, { projectId });
  const deleteMaterial = useDeleteCircuitMaterial();
  const reassignMaterial = useReassignCircuitMaterial();
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [reassignTarget, setReassignTarget] = useState<string>('');
  
  // Fetch all circuits from all boards for the reassignment dropdown
  const [allCircuits, setAllCircuits] = useState<DbCircuit[]>([]);
  
  // Collect circuits from each board using direct fetch
  useEffect(() => {
    const fetchCircuits = async () => {
      const circuits: DbCircuit[] = [];
      for (const board of allBoards) {
        try {
          const { data } = await (supabase as any)
            .from('db_circuits')
            .select('*')
            .eq('board_id', board.id)
            .order('circuit_ref');
          if (data) {
            circuits.push(...data);
          }
        } catch (e) {
          console.error('Error fetching circuits:', e);
        }
      }
      setAllCircuits(circuits);
    };
    if (allBoards.length > 0) {
      fetchCircuits();
    }
  }, [allBoards]);

  const toggleMaterial = (id: string) => {
    setSelectedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Patterns for consumable items to exclude from display
  const EXCLUDED_MATERIAL_PATTERNS = ['cable tie', 'cable saddle', 'cable clip', 'cable identification marker'];
  
  const getFilteredMaterials = () => {
    return materials?.filter(m => {
      const desc = m.description?.toLowerCase() || '';
      return !EXCLUDED_MATERIAL_PATTERNS.some(pattern => desc.includes(pattern));
    }) || [];
  };

  const toggleAll = () => {
    const filtered = getFilteredMaterials();
    if (filtered.length === 0) return;
    if (selectedMaterials.size === filtered.length) {
      setSelectedMaterials(new Set());
    } else {
      setSelectedMaterials(new Set(filtered.map(m => m.id)));
    }
  };

  const handleBulkReassign = async () => {
    if (!reassignTarget || selectedMaterials.size === 0) return;
    
    for (const materialId of selectedMaterials) {
      await reassignMaterial.mutateAsync({
        materialId,
        fromCircuitId: circuitId,
        toCircuitId: reassignTarget,
      });
    }
    setSelectedMaterials(new Set());
    setReassignTarget('');
  };

  const handleDelete = async (materialId: string) => {
    await deleteMaterial.mutateAsync({ id: materialId, circuitId });
  };

  const handleReassignSingle = async (materialId: string, targetCircuitId: string) => {
    await reassignMaterial.mutateAsync({
      materialId,
      fromCircuitId: circuitId,
      toCircuitId: targetCircuitId,
    });
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-2">Loading materials...</div>;
  }

  const filteredMaterials = getFilteredMaterials();

  if (filteredMaterials.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center p-4 italic">
        No materials assigned yet. Trace items on the canvas to add them.
      </div>
    );
  }

  const otherCircuits = allCircuits.filter(c => c.id !== circuitId);

  return (
    <div className="space-y-2">
      {/* Bulk actions bar */}
      {filteredMaterials.length > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {selectedMaterials.size === filteredMaterials.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>{selectedMaterials.size > 0 ? `${selectedMaterials.size} selected` : 'Select all'}</span>
          </button>
          
          {selectedMaterials.size > 0 && otherCircuits.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Select value={reassignTarget} onValueChange={setReassignTarget}>
                <SelectTrigger className="h-7 text-xs w-24">
                  <SelectValue placeholder="Move to..." />
                </SelectTrigger>
                <SelectContent>
                  {otherCircuits.map((circuit) => (
                    <SelectItem key={circuit.id} value={circuit.id} className="text-xs">
                      {circuit.circuit_ref}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={handleBulkReassign}
                disabled={!reassignTarget}
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Materials list */}
      {filteredMaterials.map((material) => {
        // Check if this is a GP wire - multiply by 3 for L+E+N conductors
        const isGpWire = material.description?.toUpperCase().includes('GP') && material.unit === 'm';
        const totalLength = isGpWire ? material.quantity * 3 : material.quantity;
        
        return (
          <div
            key={material.id}
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
              selectedMaterials.has(material.id) ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
            )}
          >
            <button
              onClick={() => toggleMaterial(material.id)}
              className="flex-shrink-0"
            >
              {selectedMaterials.has(material.id) ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            
            <div className="flex-grow min-w-0">
              <span className="truncate block text-xs">{material.description}</span>
              {isGpWire && (
                <span className="text-[10px] text-muted-foreground">
                  {material.quantity.toFixed(2)}m × 3 (L+E+N)
                </span>
              )}
            </div>
            
            <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
              {totalLength.toFixed(2)} {material.unit}
            </span>
            
            {/* Single item reassign dropdown */}
            {otherCircuits.length > 0 && (
              <Select onValueChange={(value) => handleReassignSingle(material.id, value)}>
                <SelectTrigger className="h-6 w-6 p-0 border-none bg-transparent">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  {otherCircuits.map((circuit) => (
                    <SelectItem key={circuit.id} value={circuit.id} className="text-xs">
                      {circuit.circuit_ref}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <button
              onClick={() => handleDelete(material.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const CircuitScheduleRightPanel: React.FC<CircuitScheduleRightPanelProps> = ({
  projectId,
  floorPlanId,
  selectedCircuit,
  onSelectCircuit,
  onClose
}) => {
  const { data: boards, isLoading } = useDistributionBoards(projectId);
  const createBoard = useCreateDistributionBoard();
  const createCircuit = useCreateCircuit();
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showAddBoardDialog, setShowAddBoardDialog] = useState(false);
  const [showAddCircuitDialog, setShowAddCircuitDialog] = useState(false);
  const [selectedBoardForCircuit, setSelectedBoardForCircuit] = useState<string | null>(null);
  const [boardFormData, setBoardFormData] = useState({ name: '', location: '', description: '' });
  const [circuitFormData, setCircuitFormData] = useState({ circuit_ref: '', description: '' });

  const toggleBoard = (boardId: string) => {
    setExpandedBoards(prev => {
      const next = new Set(prev);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  };

  const handleCreateBoard = async () => {
    if (!boardFormData.name.trim()) return;
    await createBoard.mutateAsync({
      project_id: projectId,
      name: boardFormData.name,
      location: boardFormData.location || undefined,
      description: boardFormData.description || undefined,
      floor_plan_id: floorPlanId,
    });
    setBoardFormData({ name: '', location: '', description: '' });
    setShowAddBoardDialog(false);
  };

  const handleCreateCircuit = async () => {
    if (!circuitFormData.circuit_ref.trim() || !selectedBoardForCircuit) return;
    await createCircuit.mutateAsync({
      distribution_board_id: selectedBoardForCircuit,
      circuit_ref: circuitFormData.circuit_ref,
      description: circuitFormData.description || undefined,
    });
    setCircuitFormData({ circuit_ref: '', description: '' });
    setShowAddCircuitDialog(false);
    setSelectedBoardForCircuit(null);
    // Expand the board to show the new circuit
    setExpandedBoards(prev => new Set([...prev, selectedBoardForCircuit]));
  };

  const openAddCircuitDialog = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBoardForCircuit(boardId);
    setShowAddCircuitDialog(true);
  };

  const boardsList = useMemo(() => 
    boards?.map(b => ({ id: b.id, name: b.name })) || [], 
    [boards]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CircuitBoard className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Circuit Schedule</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddBoardDialog(true)}
            className="h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add DB
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        {selectedCircuit ? (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-primary text-primary-foreground">
              <Zap className="h-3 w-3 mr-1" />
              {selectedCircuit.circuit_ref}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Trace items to assign
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="text-xs">
              Select a circuit to assign traced items
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Loading distribution boards...
            </div>
          ) : !boards || boards.length === 0 ? (
            <div className="text-center py-8">
              <CircuitBoard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No distribution boards found.
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create a distribution board to start adding circuits.
              </p>
              <Button 
                size="sm" 
                onClick={() => setShowAddBoardDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Distribution Board
              </Button>
            </div>
          ) : (
            <>
              {/* Unassigned / General Option */}
              <button
                onClick={() => onSelectCircuit({ 
                  id: 'unassigned', 
                  circuit_ref: 'Unassigned', 
                  description: 'General materials not tied to a circuit',
                  distribution_board_id: '',
                  board_id: '',
                  display_order: 0,
                  created_at: '',
                  updated_at: '',
                  cable_size: null,
                  breaker_size: null,
                  load_amps: null,
                  voltage: null,
                  power_factor: null,
                  circuit_type: null,
                  notes: null,
                } as DbCircuit)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-md text-sm transition-all flex items-center gap-2 mb-3 border-2 border-dashed",
                  selectedCircuit?.id === 'unassigned'
                    ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300"
                    : "hover:bg-muted border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                )}
              >
                <Package className="h-4 w-4 flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <div className="font-medium">Unassigned / General</div>
                  <div className="text-xs opacity-70">First fix & general materials</div>
                </div>
              </button>

              {/* Distribution Boards List */}
              {boards.map((board) => (
                <Collapsible
                  key={board.id}
                  open={expandedBoards.has(board.id)}
                  onOpenChange={() => toggleBoard(board.id)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors text-left">
                    {expandedBoards.has(board.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-sm text-foreground">{board.name}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1 pb-2">
                    <BoardCircuits
                      boardId={board.id}
                      selectedCircuit={selectedCircuit}
                      onSelectCircuit={onSelectCircuit}
                    />
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Materials Section (shown when circuit is selected) */}
      {selectedCircuit && (
        <div className="border-t border-border flex-shrink-0">
          <div className="px-4 py-2 bg-muted/50">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Materials
            </h3>
          </div>
          <ScrollArea className="h-80">
            <div className="p-3">
              <CircuitMaterialsList 
                circuitId={selectedCircuit.id} 
                projectId={projectId}
                allBoards={boardsList}
              />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Add Distribution Board Dialog */}
      <Dialog open={showAddBoardDialog} onOpenChange={setShowAddBoardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Distribution Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="db-name">Name *</Label>
              <Input
                id="db-name"
                placeholder="e.g., DB-1, DB-1A"
                value={boardFormData.name}
                onChange={(e) => setBoardFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="db-location">Location</Label>
              <Input
                id="db-location"
                placeholder="e.g., Shop 1, Common Area"
                value={boardFormData.location}
                onChange={(e) => setBoardFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="db-desc">Description</Label>
              <Input
                id="db-desc"
                placeholder="Optional description"
                value={boardFormData.description}
                onChange={(e) => setBoardFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBoardDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBoard} disabled={!boardFormData.name.trim() || createBoard.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Circuit Dialog */}
      <Dialog open={showAddCircuitDialog} onOpenChange={setShowAddCircuitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Circuit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="circuit-ref">Circuit Reference *</Label>
              <Input
                id="circuit-ref"
                placeholder="e.g., L1, S1, DB-1/1"
                value={circuitFormData.circuit_ref}
                onChange={(e) => setCircuitFormData(prev => ({ ...prev, circuit_ref: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="circuit-desc">Description</Label>
              <Input
                id="circuit-desc"
                placeholder="e.g., Lighting circuit 1, Socket circuit"
                value={circuitFormData.description}
                onChange={(e) => setCircuitFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCircuitDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCircuit} disabled={!circuitFormData.circuit_ref.trim() || createCircuit.isPending}>
              Add Circuit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
