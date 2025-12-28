import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cable } from 'lucide-react';
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
  // Edit mode
  editingCable?: {
    circuitRef?: string;
    circuitType?: CircuitCableFormData['circuitType'];
    cableType?: string;
    from?: string;
    to?: string;
    label?: string;
    startHeight?: number;
    endHeight?: number;
    terminationCount?: number;
    dbCircuitId?: string;
  } | null;
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
  terminationCount: number;
  label: string;
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
  editingCable,
}) => {
  const [circuitRef, setCircuitRef] = useState('');
  const [circuitType, setCircuitType] = useState<CircuitCableFormData['circuitType']>('lighting');
  const [cableType, setCableType] = useState('');
  const [customCableType, setCustomCableType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [label, setLabel] = useState('');
  const [startHeight, setStartHeight] = useState('2');
  const [endHeight, setEndHeight] = useState('0');
  const [terminationCount, setTerminationCount] = useState('2');
  const [selectedDbCircuitId, setSelectedDbCircuitId] = useState<string>('');

  // Fetch distribution boards and circuits if projectId is available
  const { data: boards } = useDistributionBoards(projectId || '');
  const { data: circuits } = useDbCircuits(selectedDbCircuitId ? '' : '');

  const allCableTypes = useMemo(() => {
    const combined = new Set([...configCableTypes, ...existingCableTypes]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [configCableTypes, existingCableTypes]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (editingCable) {
        // Edit mode: populate from existing cable
        setCircuitRef(editingCable.circuitRef || '');
        setCircuitType(editingCable.circuitType || 'lighting');
        setCableType(editingCable.cableType || '');
        setCustomCableType('');
        setFrom(editingCable.from || '');
        setTo(editingCable.to || '');
        setLabel(editingCable.label || '');
        setStartHeight(String(editingCable.startHeight ?? 2));
        setEndHeight(String(editingCable.endHeight ?? 0));
        setTerminationCount(String(editingCable.terminationCount ?? 2));
        setSelectedDbCircuitId(editingCable.dbCircuitId || '');
      } else if (selectedCircuit) {
        // Create mode with pre-selected circuit
        setSelectedDbCircuitId(selectedCircuit.id);
        setCircuitRef(selectedCircuit.circuit_ref);
        setCircuitType(inferCircuitType(selectedCircuit.circuit_ref, selectedCircuit.description || undefined));
        setCableType(selectedCircuit.cable_size || '');
        setCustomCableType('');
        setFrom(selectedBoardName || '');
        setTo(selectedCircuit.description || '');
        setLabel(`${selectedCircuit.circuit_ref}: ${selectedBoardName || 'DB'} → ${selectedCircuit.description || ''}`);
        setStartHeight('2');
        setEndHeight('0');
        setTerminationCount('2');
      } else {
        // Create mode: reset to defaults
        setCircuitRef('');
        setCircuitType('lighting');
        setCableType('');
        setCustomCableType('');
        setFrom('');
        setTo('');
        setLabel('');
        setStartHeight('2');
        setEndHeight('0');
        setTerminationCount('2');
        setSelectedDbCircuitId('');
      }
    }
  }, [isOpen, editingCable, selectedCircuit, selectedBoardName]);

  const startH = parseFloat(startHeight) || 0;
  const endH = parseFloat(endHeight) || 0;
  const totalLength = measuredLength + startH + endH;

  const handleSubmit = () => {
    const finalCableType = cableType === '__other__' ? customCableType.trim() : cableType;
    const count = parseInt(terminationCount, 10);
    
    if (!from.trim() || !to.trim()) {
      return; // Basic validation
    }

    onSubmit({
      circuitRef: circuitRef.trim(),
      circuitType,
      cableType: finalCableType,
      from: from.trim(),
      to: to.trim(),
      containmentType: '',
      startHeight: startH,
      endHeight: endH,
      terminationCount: isNaN(count) ? 2 : count,
      label: label.trim(),
      dbCircuitId: selectedDbCircuitId || undefined,
    });
    onClose();
  };

  const isEditMode = !!editingCable;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5" />
            {isEditMode ? 'Edit Cable Details' : 'Circuit Cable Details'}
          </DialogTitle>
        </DialogHeader>

        {/* Length Summary */}
        <p className="text-muted-foreground text-sm">
          Calculated Length: <span className="text-primary font-semibold">{totalLength.toFixed(2)}m</span>
        </p>

        <div className="space-y-4">
          {/* Supply From */}
          <div className="space-y-2">
            <Label htmlFor="from">Supply From</Label>
            <Input
              id="from"
              placeholder="e.g., DB-04A"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          {/* Supply To */}
          <div className="space-y-2">
            <Label htmlFor="to">Supply To</Label>
            <Input
              id="to"
              placeholder="e.g., Lighting circuit 1"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {/* Line Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Line Label (Optional)</Label>
            <Input
              id="label"
              placeholder="e.g., L1: DB-04A → Lighting circuit 1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Start Height / Rise */}
          <div className="space-y-2">
            <Label htmlFor="startHeight">Start Height / Rise (m)</Label>
            <Select value={startHeight} onValueChange={setStartHeight}>
              <SelectTrigger id="startHeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6].map((v) => (
                  <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Vertical rise at the start point</p>
          </div>

          {/* End Height / Drop */}
          <div className="space-y-2">
            <Label htmlFor="endHeight">End Height / Drop (m)</Label>
            <Select value={endHeight} onValueChange={setEndHeight}>
              <SelectTrigger id="endHeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6].map((v) => (
                  <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Vertical drop at the end point</p>
          </div>

          {/* Cable Type */}
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

          {/* Number of Terminations */}
          <div className="space-y-2">
            <Label htmlFor="terminationCount">Number of Terminations</Label>
            <Select value={terminationCount} onValueChange={setTerminationCount}>
              <SelectTrigger id="terminationCount">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                  <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Total terminations (both ends combined)</p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!from.trim() || !to.trim()}>
            {isEditMode ? 'Save Changes' : 'Add Cable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CircuitCableDetailsDialog;
