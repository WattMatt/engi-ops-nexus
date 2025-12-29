import React, { useState, useEffect, useMemo } from 'react';
import { CircuitBoard, Package, Zap, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  useDistributionBoards, 
  useCreateCircuitMaterial,
  useReassignCircuitMaterial,
  DbCircuit,
} from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CircuitAssignmentSelectorProps {
  projectId: string;
  /** Current circuit this material is assigned to (null/undefined = unassigned) */
  currentCircuitId?: string | null;
  /** The db_circuit_material ID if already exists */
  materialId?: string;
  /** Called after successful assignment/reassignment */
  onAssigned?: (circuitId: string) => void;
  /** Material details for creating new assignment */
  materialDetails?: {
    description: string;
    quantity: number;
    unit: string;
    canvas_line_id?: string;
  };
  /** Compact display mode */
  compact?: boolean;
}

export const CircuitAssignmentSelector: React.FC<CircuitAssignmentSelectorProps> = ({
  projectId,
  currentCircuitId,
  materialId,
  onAssigned,
  materialDetails,
  compact = false,
}) => {
  const { data: boards, isLoading: loadingBoards } = useDistributionBoards(projectId);
  const [allCircuits, setAllCircuits] = useState<(DbCircuit & { boardName: string })[]>([]);
  const [selectedCircuitId, setSelectedCircuitId] = useState<string | null>(currentCircuitId || null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const createMaterial = useCreateCircuitMaterial();
  const reassignMaterial = useReassignCircuitMaterial();

  // Fetch all circuits from all boards
  useEffect(() => {
    const fetchCircuits = async () => {
      if (!boards || boards.length === 0) return;
      
      const circuits: (DbCircuit & { boardName: string })[] = [];
      for (const board of boards) {
        try {
          const { data, error } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { order: (col: string) => Promise<{ data: DbCircuit[] | null; error: unknown }> } } } })
            .from('db_circuits')
            .select('*')
            .eq('board_id', board.id)
            .order('circuit_ref');
          if (data && !error) {
            circuits.push(...data.map(c => ({ ...c, boardName: board.name })));
          }
        } catch (e) {
          console.error('Error fetching circuits:', e);
        }
      }
      setAllCircuits(circuits);
    };
    fetchCircuits();
  }, [boards]);

  // Group circuits by board for better UI
  const circuitsByBoard = useMemo(() => {
    const grouped = new Map<string, (DbCircuit & { boardName: string })[]>();
    allCircuits.forEach(circuit => {
      const existing = grouped.get(circuit.boardName) || [];
      existing.push(circuit);
      grouped.set(circuit.boardName, existing);
    });
    return grouped;
  }, [allCircuits]);

  const currentCircuit = useMemo(() => {
    if (currentCircuitId === 'unassigned') {
      return { circuit_ref: 'Unassigned / General', id: 'unassigned' };
    }
    return allCircuits.find(c => c.id === currentCircuitId);
  }, [allCircuits, currentCircuitId]);

  const handleAssign = async () => {
    if (!selectedCircuitId) return;
    
    setIsAssigning(true);
    try {
      const isUnassigned = selectedCircuitId === 'unassigned';
      
      if (materialId && currentCircuitId) {
        // Reassign existing material
        await reassignMaterial.mutateAsync({
          materialId,
          fromCircuitId: currentCircuitId,
          toCircuitId: selectedCircuitId,
        });
        toast.success('Material reassigned successfully');
      } else if (materialDetails) {
        // Create new assignment
        await createMaterial.mutateAsync({
          circuit_id: isUnassigned ? null : selectedCircuitId,
          description: materialDetails.description,
          quantity: materialDetails.quantity,
          unit: materialDetails.unit,
          canvas_line_id: materialDetails.canvas_line_id,
          ...(isUnassigned ? { project_id: projectId } : {}),
        });
        toast.success('Material assigned to circuit');
      }
      
      onAssigned?.(selectedCircuitId);
    } catch (error: unknown) {
      console.error('Failed to assign material:', error);
      toast.error('Failed to assign material');
    } finally {
      setIsAssigning(false);
    }
  };

  if (loadingBoards) {
    return <div className="text-xs text-muted-foreground">Loading circuits...</div>;
  }

  // Compact mode: Just show current assignment status
  if (compact && !currentCircuitId) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Package className="h-3 w-3" />
        Not assigned
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", compact ? "mt-2" : "mt-4 pt-4 border-t border-border")}>
      <div className="flex items-center gap-2">
        <CircuitBoard className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Circuit Assignment
        </span>
      </div>
      
      {/* Current assignment display */}
      {currentCircuit && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Currently:</span>
          <Badge variant={currentCircuitId === 'unassigned' ? 'outline' : 'default'} className="text-xs">
            {currentCircuit.circuit_ref}
          </Badge>
        </div>
      )}
      
      {/* Assignment selector */}
      <div className="flex gap-2">
        <Select 
          value={selectedCircuitId || undefined} 
          onValueChange={setSelectedCircuitId}
        >
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Select circuit..." />
          </SelectTrigger>
          <SelectContent>
            {/* Unassigned / General option */}
            <SelectItem value="unassigned" className="text-xs">
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3 text-amber-500" />
                <span>Unassigned / General</span>
              </div>
            </SelectItem>
            
            {/* Circuits grouped by board */}
            {Array.from(circuitsByBoard.entries()).map(([boardName, circuits]) => (
              <React.Fragment key={boardName}>
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    {boardName}
                  </div>
                </div>
                {circuits.map(circuit => (
                  <SelectItem key={circuit.id} value={circuit.id} className="text-xs pl-6">
                    <span>{circuit.circuit_ref}</span>
                    {circuit.description && (
                      <span className="text-muted-foreground ml-2">- {circuit.description}</span>
                    )}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          size="sm" 
          className="h-8 px-3"
          onClick={handleAssign}
          disabled={!selectedCircuitId || selectedCircuitId === currentCircuitId || isAssigning}
        >
          {isAssigning ? (
            <span className="animate-pulse">...</span>
          ) : (
            <>
              <Check className="h-3 w-3 mr-1" />
              Assign
            </>
          )}
        </Button>
      </div>
      
      {(!boards || boards.length === 0) && (
        <p className="text-xs text-muted-foreground">
          No distribution boards found. Create boards in Circuit Schedule first.
        </p>
      )}
    </div>
  );
};
