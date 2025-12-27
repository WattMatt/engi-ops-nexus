import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cable, Route, Link2, ArrowUpDown } from 'lucide-react';

interface CircuitCableDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: CircuitCableFormData) => void;
  measuredLength: number;
  existingCableTypes: string[];
  configCableTypes: string[];
  projectId?: string;
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
}

const CIRCUIT_TYPES = [
  { value: 'lighting', label: 'Lighting' },
  { value: 'power', label: 'Power' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'data', label: 'Data/Comms' },
  { value: 'fire', label: 'Fire/Safety' },
  { value: 'other', label: 'Other' },
];

const CONTAINMENT_TYPES = [
  'Cable Tray',
  'Wire Basket',
  'Conduit',
  'Trunking',
  'Direct Burial',
  'Surface Mounted',
  'In Slab',
  'In Wall',
];

const CircuitCableDetailsDialog: React.FC<CircuitCableDetailsDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  measuredLength,
  existingCableTypes,
  configCableTypes,
  projectId,
}) => {
  const [circuitRef, setCircuitRef] = useState('');
  const [circuitType, setCircuitType] = useState<CircuitCableFormData['circuitType']>('lighting');
  const [cableType, setCableType] = useState('');
  const [customCableType, setCustomCableType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [containmentType, setContainmentType] = useState('');
  const [startHeight, setStartHeight] = useState(0);
  const [endHeight, setEndHeight] = useState(0);
  const [boqItemCode, setBoqItemCode] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('circuit');

  const allCableTypes = useMemo(() => {
    const combined = new Set([...configCableTypes, ...existingCableTypes]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [configCableTypes, existingCableTypes]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCircuitRef('');
      setCircuitType('lighting');
      setCableType('');
      setCustomCableType('');
      setFrom('');
      setTo('');
      setContainmentType('');
      setStartHeight(0);
      setEndHeight(0);
      setBoqItemCode('');
      setNotes('');
      setActiveTab('circuit');
    }
  }, [isOpen]);

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
      containmentType,
      startHeight,
      endHeight,
      boqItemCode: boqItemCode.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5" />
            Circuit Cable Details
          </DialogTitle>
        </DialogHeader>

        {/* Length Summary */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Measured:</span>
              <span className="ml-2 font-medium">{measuredLength.toFixed(2)}m</span>
            </div>
            <div>
              <span className="text-muted-foreground">Heights:</span>
              <span className="ml-2 font-medium">+{(startHeight + endHeight).toFixed(2)}m</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total:</span>
              <span className="ml-2 font-bold text-primary">{totalLength.toFixed(2)}m</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="circuit" className="flex items-center gap-1">
              <Cable className="h-3 w-3" />
              Circuit
            </TabsTrigger>
            <TabsTrigger value="routing" className="flex items-center gap-1">
              <Route className="h-3 w-3" />
              Routing
            </TabsTrigger>
            <TabsTrigger value="boq" className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              BOQ Link
            </TabsTrigger>
          </TabsList>

          {/* Circuit Tab */}
          <TabsContent value="circuit" className="space-y-4 mt-4">
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
          </TabsContent>

          {/* Routing Tab */}
          <TabsContent value="routing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="containment">Containment Type</Label>
              <Select value={containmentType} onValueChange={setContainmentType}>
                <SelectTrigger id="containment">
                  <SelectValue placeholder="Select containment..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTAINMENT_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {ct}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startHeight" className="flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" />
                  Start Drop Height (m)
                </Label>
                <Input
                  id="startHeight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={startHeight}
                  onChange={(e) => setStartHeight(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endHeight" className="flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" />
                  End Drop Height (m)
                </Label>
                <Input
                  id="endHeight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={endHeight}
                  onChange={(e) => setEndHeight(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional routing notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* BOQ Link Tab */}
          <TabsContent value="boq" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="boqItemCode">BOQ Item Code</Label>
              <Input
                id="boqItemCode"
                placeholder="e.g., E-001, 5.2.1"
                value={boqItemCode}
                onChange={(e) => setBoqItemCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the BOQ item code to link this cable to final account materials
              </p>
            </div>

            {/* Future: Add Final Account Item selector when project is linked */}
            {projectId && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                <p>Final Account linking will be available after saving the design.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
