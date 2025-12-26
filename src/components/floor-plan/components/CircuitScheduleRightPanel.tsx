import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CircuitBoard, Zap, Package, X, Radio } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  useDistributionBoards, 
  useDbCircuits, 
  useCircuitMaterials,
  DbCircuit 
} from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { cn } from '@/lib/utils';

interface CircuitScheduleRightPanelProps {
  projectId: string;
  selectedCircuit: DbCircuit | null;
  onSelectCircuit: (circuit: DbCircuit | null) => void;
  onClose: () => void;
}

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

// Sub-component to show materials for selected circuit
const CircuitMaterialsList: React.FC<{ circuitId: string }> = ({ circuitId }) => {
  const { data: materials, isLoading } = useCircuitMaterials(circuitId);

  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-2">Loading materials...</div>;
  }

  if (!materials || materials.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center p-4 italic">
        No materials assigned yet. Trace items on the canvas to add them.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {materials.map((material) => (
        <div
          key={material.id}
          className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md text-sm"
        >
          <span className="truncate flex-grow">{material.description}</span>
          <span className="text-xs font-mono text-muted-foreground ml-2 flex-shrink-0">
            {material.quantity} {material.unit}
          </span>
        </div>
      ))}
    </div>
  );
};

export const CircuitScheduleRightPanel: React.FC<CircuitScheduleRightPanelProps> = ({
  projectId,
  selectedCircuit,
  onSelectCircuit,
  onClose
}) => {
  const { data: boards, isLoading } = useDistributionBoards(projectId);
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CircuitBoard className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Circuit Schedule</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
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
              Trace items to assign to this circuit
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
              <p className="text-xs text-muted-foreground mt-1">
                Use the Circuit Schedule tool to create boards and circuits.
              </p>
            </div>
          ) : (
            <>
              {/* Clear Selection Button */}
              {selectedCircuit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mb-3"
                  onClick={() => onSelectCircuit(null)}
                >
                  Clear Selection (General Mode)
                </Button>
              )}

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
        <div className="border-t border-border">
          <div className="px-4 py-2 bg-muted/50">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Materials
            </h3>
          </div>
          <ScrollArea className="h-48">
            <div className="p-3">
              <CircuitMaterialsList circuitId={selectedCircuit.id} />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
