import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cable, ArrowUpDown, CircuitBoard, ChevronRight } from 'lucide-react';
import { useDistributionBoards, useDbCircuits, DbCircuit } from '@/components/circuit-schedule/hooks/useDistributionBoards';

interface CircuitCableDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: CircuitCableFormData) => void;
  measuredLength: number;
  existingCableTypes: string[];
  configCableTypes: string[];
  projectId?: string;
  selectedCircuit?: DbCircuit | null;
  selectedBoardName?: string;
}

export interface CircuitCableFormData {
  circuitRef: string;
  circuitType: 'lighting' | 'power' | 'hvac' | 'data' | 'fire' | 'other';
  cableType: string;
  from: string;
  to: string;
  containmentType: string;
  startHeight: number;
  endHeight: number;
  finalAccountItemId?: string;
  boqItemCode?: string;
  notes?: string;
  dbCircuitId?: string;
  masterMaterialId?: string;
  supplyRate?: number;
  installRate?: number;
}

const CIRCUIT_TYPES = [
  { value: 'lighting', label: 'Lighting' },
  { value: 'power', label: 'Power' },
  { value: 'data', label: 'Data/Comms' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'fire', label: 'Fire/Safety' },
  { value: 'other', label: 'Other' },
];

// Helper to infer circuit type from description or ref
const inferCircuitType = (circuitRef: string, description?: string): CircuitCableFormData['circuitType'] => {
  const text = `${circuitRef} ${description || ''}`.toLowerCase();
  if (text.includes('light') || circuitRef.startsWith('L')) return 'lighting';
  if (text.includes('power') || text.includes('socket') || circuitRef.startsWith('P') || circuitRef.startsWith('S')) return 'power';
  if (text.includes('hvac') || text.includes('ac') || text.includes('air')) return 'hvac';
  if (text.includes('data') || text.includes('comm')) return 'data';
  if (text.includes('fire') || text.includes('alarm')) return 'fire';
  return 'other';
};

const CircuitCableDetailsDialog: React.FC<CircuitCableDetailsDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  measuredLength,
  existingCableTypes,
  configCableTypes,
  projectId,
  selectedCircuit,
  selectedBoardName,
}) => {
  const [circuitRef, setCircuitRef] = useState('');
  const [circuitType, setCircuitType] = useState<CircuitCableFormData['circuitType']>('lighting');
  const [cableType, setCableType] = useState('');
  const [customCableType, setCustomCableType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [startHeight, setStartHeight] = useState(0);
  const [endHeight, setEndHeight] = useState(0);
  const [selectedDbCircuitId, setSelectedDbCircuitId] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');

  // Fetch distribution boards and circuits if projectId is available
  const { data: boards } = useDistributionBoards(projectId || '');
  const { data: circuits } = useDbCircuits(selectedBoardId || '');

  const allCableTypes = useMemo(() => {
    const combined = new Set([...configCableTypes, ...existingCableTypes]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [configCableTypes, existingCableTypes]);

  // Reset form when dialog opens, pre-populate if circuit is already selected
  useEffect(() => {
    if (isOpen) {
      // Reset to defaults first
      setCircuitType('lighting');
      setCableType('');
      setCustomCableType('');
      setStartHeight(0);
      setEndHeight(0);
      
      // Pre-populate from selected circuit if available
      if (selectedCircuit) {
        setSelectedDbCircuitId(selectedCircuit.id);
        setCircuitRef(selectedCircuit.circuit_ref);
        setCircuitType(inferCircuitType(selectedCircuit.circuit_ref, selectedCircuit.description || undefined));
        if (selectedCircuit.cable_size) {
          setCableType(selectedCircuit.cable_size);
        }
        if (selectedBoardName) {
          setFrom(selectedBoardName);
        }
        if (selectedCircuit.description) {
          setTo(selectedCircuit.description);
        }
        // Find the board ID for the circuit
        const board = boards?.find(b => b.id === selectedCircuit.distribution_board_id);
        if (board) {
          setSelectedBoardId(board.id);
        }
      } else {
        setSelectedDbCircuitId('');
        setSelectedBoardId('');
        setCircuitRef('');
        setFrom('');
        setTo('');
      }
    }
  }, [isOpen, selectedCircuit, selectedBoardName, boards]);

  // When a circuit is selected, populate form fields
  const handleCircuitSelect = (circuit: DbCircuit) => {
    setSelectedDbCircuitId(circuit.id);
    setCircuitRef(circuit.circuit_ref);
    setCircuitType(inferCircuitType(circuit.circuit_ref, circuit.description || undefined));
    if (circuit.cable_size) {
      setCableType(circuit.cable_size);
    }
    // Set from as the board name
    const board = boards?.find(b => b.id === selectedBoardId);
    if (board) {
      setFrom(board.name);
    }
    // Description can populate 'to' field if it suggests a destination
    if (circuit.description) {
      setTo(circuit.description);
    }
  };

  const totalLength = measuredLength + startHeight + endHeight;

  const handleSubmit = () => {
    const finalCableType = cableType === '__other__' ? customCableType : cableType;
    
    if (!circuitRef.trim()) {
      return; // Basic validation
    }

    onSubmit({
      circuitRef: circuitRef.trim(),
      circuitType,
      cableType: finalCableType,
      from: from.trim(),
      to: to.trim(),
      containmentType: '',
      startHeight,
      endHeight,
      dbCircuitId: selectedDbCircuitId || undefined,
    });
    onClose();
  };

  const hasExistingCircuits = projectId && boards && boards.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5" />
            Circuit Cable Details
          </DialogTitle>
        </DialogHeader>

        {/* Length Summary with inline height inputs */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Measured:</span>
              <span className="ml-2 font-medium">{measuredLength.toFixed(2)}m</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="ml-2 font-bold text-primary text-base">{totalLength.toFixed(2)}m</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="startHeightInline" className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                Start Drop:
              </Label>
              <div className="relative flex-1">
                <Input
                  id="startHeightInline"
                  type="number"
                  step="0.1"
                  min="0"
                  value={startHeight}
                  onChange={(e) => setStartHeight(parseFloat(e.target.value) || 0)}
                  className="h-8 pr-6 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="endHeightInline" className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                End Drop:
              </Label>
              <div className="relative flex-1">
                <Input
                  id="endHeightInline"
                  type="number"
                  step="0.1"
                  min="0"
                  value={endHeight}
                  onChange={(e) => setEndHeight(parseFloat(e.target.value) || 0)}
                  className="h-8 pr-6 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Existing Circuit Selector */}
          {hasExistingCircuits && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <CircuitBoard className="h-4 w-4" />
                Select from Circuit Schedule
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {boards?.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedDbCircuitId} 
                  onValueChange={(id) => {
                    const circuit = circuits?.find(c => c.id === id);
                    if (circuit) handleCircuitSelect(circuit);
                  }}
                  disabled={!selectedBoardId || !circuits?.length}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select circuit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {circuits?.map((circuit) => (
                      <SelectItem key={circuit.id} value={circuit.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{circuit.circuit_ref}</span>
                          {circuit.description && (
                            <>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground text-xs">{circuit.description}</span>
                            </>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedDbCircuitId && (
                <p className="text-xs text-muted-foreground">
                  Circuit details auto-populated. You can still edit below.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="circuitRef">Circuit Reference *</Label>
              <Input
                id="circuitRef"
                placeholder="e.g., L1, P3, DB-01"
                value={circuitRef}
                onChange={(e) => setCircuitRef(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="circuitType">Circuit Type</Label>
              <Select value={circuitType} onValueChange={(v) => setCircuitType(v as CircuitCableFormData['circuitType'])}>
                <SelectTrigger id="circuitType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CIRCUIT_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cableType">Cable Type</Label>
            <Select value={cableType} onValueChange={setCableType}>
              <SelectTrigger id="cableType">
                <SelectValue placeholder="Select cable type..." />
              </SelectTrigger>
              <SelectContent>
                {allCableTypes.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
                <SelectItem value="__other__">Other (specify)</SelectItem>
              </SelectContent>
            </Select>
            {cableType === '__other__' && (
              <Input
                className="mt-2"
                placeholder="Enter custom cable type..."
                value={customCableType}
                onChange={(e) => setCustomCableType(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                placeholder="e.g., Main DB"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                placeholder="e.g., Sub DB 1"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!circuitRef.trim()}>
            Add Circuit Cable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CircuitCableDetailsDialog;
