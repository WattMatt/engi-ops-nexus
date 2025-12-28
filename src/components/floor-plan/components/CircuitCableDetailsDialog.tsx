import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cable, Route, Link2, ArrowUpDown, CircuitBoard, ChevronRight, Package, FileText, Search} from 'lucide-react';
import { useDistributionBoards, useDbCircuits, DbCircuit } from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const [containmentType, setContainmentType] = useState('');
  const [startHeight, setStartHeight] = useState(0);
  const [endHeight, setEndHeight] = useState(0);
  const [boqItemCode, setBoqItemCode] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('circuit');
  const [selectedDbCircuitId, setSelectedDbCircuitId] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<{ id: string; description: string; supply_rate: number; install_rate: number; unit: string } | null>(null);
  const [faSearch, setFaSearch] = useState('');
  const [selectedFaItemId, setSelectedFaItemId] = useState<string>('');
  const [selectedFaItem, setSelectedFaItem] = useState<{ id: string; item_code: string; description: string } | null>(null);

  // Fetch distribution boards and circuits if projectId is available
  const { data: boards } = useDistributionBoards(projectId || '');
  const { data: circuits } = useDbCircuits(selectedBoardId || '');

  // Fetch master materials for cable types
  const { data: masterMaterials = [] } = useQuery({
    queryKey: ['master-materials-cables', isOpen],
    queryFn: async () => {
      const { data } = await supabase
        .from('master_materials')
        .select('id, item_code, description, unit, supply_rate, install_rate')
        .or('description.ilike.%cable%,description.ilike.%wire%,description.ilike.%conductor%')
        .eq('is_active', true)
        .order('item_code');
      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch final account items for the project
  const { data: finalAccountItems = [] } = useQuery({
    queryKey: ['final-account-items-for-linking', projectId, isOpen],
    queryFn: async () => {
      if (!projectId) return [];
      // Get sections for this project first
      const { data: sections } = await (supabase as any)
        .from('final_account_sections')
        .select('id')
        .eq('project_id', projectId);
      
      if (!sections || sections.length === 0) return [];
      
      const sectionIds = sections.map((s: any) => s.id);
      const { data } = await (supabase as any)
        .from('final_account_items')
        .select('id, item_code, description, unit, supply_rate, install_rate')
        .in('section_id', sectionIds)
        .order('item_code');
      return data || [];
    },
    enabled: isOpen && !!projectId,
  });

  const allCableTypes = useMemo(() => {
    const combined = new Set([...configCableTypes, ...existingCableTypes]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [configCableTypes, existingCableTypes]);

  // Filter materials by search
  const filteredMaterials = useMemo(() => {
    if (!materialSearch.trim()) return masterMaterials.slice(0, 20);
    const search = materialSearch.toLowerCase();
    return masterMaterials.filter((m: any) => 
      m.description?.toLowerCase().includes(search) || 
      m.item_code?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [masterMaterials, materialSearch]);

  // Filter FA items by search
  const filteredFaItems = useMemo(() => {
    if (!faSearch.trim()) return finalAccountItems.slice(0, 20);
    const search = faSearch.toLowerCase();
    return finalAccountItems.filter((item: any) => 
      item.description?.toLowerCase().includes(search) || 
      item.item_code?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [finalAccountItems, faSearch]);

  // Reset form when dialog opens, pre-populate if circuit is already selected
  useEffect(() => {
    if (isOpen) {
      // Reset to defaults first
      setCircuitType('lighting');
      setCableType('');
      setCustomCableType('');
      setContainmentType('');
      setStartHeight(0);
      setEndHeight(0);
      setBoqItemCode('');
      setNotes('');
      setActiveTab('circuit');
      setMaterialSearch('');
      setSelectedMaterialId('');
      setSelectedMaterial(null);
      setFaSearch('');
      setSelectedFaItemId('');
      setSelectedFaItem(null);
      
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
      containmentType,
      startHeight,
      endHeight,
      boqItemCode: boqItemCode.trim() || selectedFaItem?.item_code || undefined,
      notes: notes.trim() || undefined,
      dbCircuitId: selectedDbCircuitId || undefined,
      masterMaterialId: selectedMaterialId || undefined,
      finalAccountItemId: selectedFaItemId || undefined,
      supplyRate: selectedMaterial?.supply_rate || undefined,
      installRate: selectedMaterial?.install_rate || undefined,
    });
    onClose();
  };

  const handleMaterialSelect = (material: any) => {
    setSelectedMaterialId(material.id);
    setSelectedMaterial({
      id: material.id,
      description: material.description,
      supply_rate: material.supply_rate || 0,
      install_rate: material.install_rate || 0,
      unit: material.unit || 'm',
    });
    setBoqItemCode(material.item_code || '');
  };

  const handleFaItemSelect = (item: any) => {
    setSelectedFaItemId(item.id);
    setSelectedFaItem({
      id: item.id,
      item_code: item.item_code,
      description: item.description,
    });
    setBoqItemCode(item.item_code || '');
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
            {/* Master Material Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Link to Master Material
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cable materials..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-32 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredMaterials.map((material: any) => (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => handleMaterialSelect(material)}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        selectedMaterialId === material.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{material.item_code}</span>
                        <span className="truncate flex-1">{material.description}</span>
                      </div>
                      <div className="flex gap-4 text-xs mt-1 opacity-80">
                        <span>Supply: R{material.supply_rate?.toFixed(2) || '0.00'}/m</span>
                        <span>Install: R{material.install_rate?.toFixed(2) || '0.00'}/m</span>
                      </div>
                    </button>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      No cable materials found
                    </p>
                  )}
                </div>
              </ScrollArea>
              {selectedMaterial && (
                <div className="p-2 bg-primary/10 rounded-md text-sm">
                  <div className="font-medium">{selectedMaterial.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Est. cost: R{((selectedMaterial.supply_rate + selectedMaterial.install_rate) * totalLength).toFixed(2)} 
                    ({totalLength.toFixed(2)}m × R{(selectedMaterial.supply_rate + selectedMaterial.install_rate).toFixed(2)}/m)
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Final Account Item Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Link to Final Account Item
              </Label>
              {projectId && finalAccountItems.length > 0 ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search final account items..."
                      value={faSearch}
                      onChange={(e) => setFaSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-32 border rounded-md">
                    <div className="p-2 space-y-1">
                      {filteredFaItems.map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleFaItemSelect(item)}
                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                            selectedFaItemId === item.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{item.item_code}</span>
                            <span className="truncate flex-1">{item.description}</span>
                          </div>
                        </button>
                      ))}
                      {filteredFaItems.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-4">
                          No matching items
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                  {!projectId 
                    ? 'Link design to a project to access Final Account items.'
                    : 'No Final Account items found for this project.'}
                </div>
              )}
              {selectedFaItem && (
                <div className="p-2 bg-primary/10 rounded-md text-sm">
                  <span className="font-mono mr-2">{selectedFaItem.item_code}</span>
                  {selectedFaItem.description}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or enter manually</span>
              </div>
            </div>

            {/* Manual BOQ Code Entry */}
            <div className="space-y-2">
              <Label htmlFor="boqItemCode">BOQ Item Code</Label>
              <Input
                id="boqItemCode"
                placeholder="e.g., E-001, 5.2.1"
                value={boqItemCode}
                onChange={(e) => setBoqItemCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Manually enter a code to match against BOQ items later
              </p>
            </div>
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
