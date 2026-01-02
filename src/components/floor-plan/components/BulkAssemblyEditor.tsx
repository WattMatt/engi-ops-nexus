import React, { useState, useMemo, useCallback } from 'react';
import { Package, Filter, Check, X, AlertTriangle, Settings2, History, Save, Bookmark, Undo2, Redo2, Trash2, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EquipmentItem, EquipmentType, SupplyZone } from '../types';
import { 
  getAssemblyForType, 
  getAssemblyEquipmentTypes,
  AssemblyModification,
} from '@/data/assemblies';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Preset modification pattern
interface ModificationPreset {
  id: string;
  name: string;
  description?: string;
  targetTypes: EquipmentType[];
  exclusions: string[]; // Component IDs to exclude
  createdAt: Date;
}

// History entry for undo/redo
interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string;
  itemIds: string[];
  previousStates: { id: string; assemblyModifications: AssemblyModification[] }[];
  newStates: { id: string; assemblyModifications: AssemblyModification[] }[];
}

interface BulkAssemblyEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: EquipmentItem[];
  zones?: SupplyZone[];
  onBulkUpdate: (updates: { id: string; assemblyModifications: AssemblyModification[] }[]) => void;
}

const categoryColors: Record<string, string> = {
  material: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  labor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  accessory: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

// LocalStorage key for presets
const PRESETS_STORAGE_KEY = 'assembly-modification-presets';

// Load presets from localStorage
const loadPresets = (): ModificationPreset[] => {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) }));
    }
  } catch (e) {
    console.error('Failed to load presets:', e);
  }
  return [];
};

// Save presets to localStorage
const savePresets = (presets: ModificationPreset[]) => {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
};

export const BulkAssemblyEditor: React.FC<BulkAssemblyEditorProps> = ({
  open,
  onOpenChange,
  equipment,
  zones = [],
  onBulkUpdate,
}) => {
  // Type and zone filters
  const [selectedType, setSelectedType] = useState<EquipmentType | 'all'>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  
  // Component exclusions and selection
  const [componentExclusions, setComponentExclusions] = useState<Record<string, boolean>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Presets state
  const [presets, setPresets] = useState<ModificationPreset[]>(() => loadPresets());
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  // History state for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Active tab
  const [activeTab, setActiveTab] = useState<'items' | 'presets' | 'history'>('items');

  // Get equipment types that have assemblies
  const assemblyTypes = useMemo(() => getAssemblyEquipmentTypes(), []);
  
  // Check if a point is inside a zone polygon
  const isPointInZone = useCallback((point: { x: number; y: number }, zonePoints: { x: number; y: number }[]): boolean => {
    if (zonePoints.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = zonePoints.length - 1; i < zonePoints.length; j = i++) {
      const xi = zonePoints[i].x, yi = zonePoints[i].y;
      const xj = zonePoints[j].x, yj = zonePoints[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) && 
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  // Filter equipment by type and zone
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const hasAssembly = assemblyTypes.includes(item.type);
      if (!hasAssembly) return false;
      
      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      
      // Zone filter
      if (selectedZone !== 'all') {
        const zone = zones.find(z => z.id === selectedZone);
        if (zone && !isPointInZone(item.position, zone.points)) {
          return false;
        }
      }
      
      return true;
    });
  }, [equipment, selectedType, selectedZone, assemblyTypes, zones, isPointInZone]);

  // Get unique assembly for selected type
  const selectedAssembly = useMemo(() => {
    if (selectedType === 'all') return null;
    return getAssemblyForType(selectedType);
  }, [selectedType]);

  // Group equipment by type for summary
  const equipmentByType = useMemo(() => {
    const grouped: Record<string, EquipmentItem[]> = {};
    equipment.filter(item => assemblyTypes.includes(item.type)).forEach(item => {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item);
    });
    return grouped;
  }, [equipment, assemblyTypes]);

  // Toggle item selection
  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all visible items
  const selectAll = () => {
    setSelectedItemIds(new Set(filteredEquipment.map(e => e.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItemIds(new Set());
  };

  // Toggle component exclusion in bulk
  const toggleComponentExclusion = (componentId: string) => {
    setComponentExclusions(prev => ({
      ...prev,
      [componentId]: !prev[componentId],
    }));
  };

  // Add to history
  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    setHistory(prev => {
      // Remove any redo entries after current position
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newEntry);
      // Keep last 50 entries
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Apply modifications to selected items
  const applyModifications = () => {
    if (selectedItemIds.size === 0) {
      toast.error('No items selected');
      return;
    }

    const updates: { id: string; assemblyModifications: AssemblyModification[] }[] = [];
    const previousStates: { id: string; assemblyModifications: AssemblyModification[] }[] = [];

    selectedItemIds.forEach(id => {
      const item = equipment.find(e => e.id === id);
      if (!item) return;

      const assembly = getAssemblyForType(item.type);
      if (!assembly) return;

      // Store previous state for history
      previousStates.push({
        id,
        assemblyModifications: [...(item.assemblyModifications || [])],
      });

      // Get existing modifications
      const existingMods: AssemblyModification[] = item.assemblyModifications || [];
      const newMods: AssemblyModification[] = [...existingMods];

      // Apply new exclusions
      Object.entries(componentExclusions).forEach(([componentId, excluded]) => {
        const componentExists = assembly.components.some(c => c.id === componentId);
        if (!componentExists) return;

        const modIndex = newMods.findIndex(m => m.componentId === componentId);
        if (modIndex >= 0) {
          if (excluded) {
            newMods[modIndex] = { ...newMods[modIndex], excluded: true };
          } else {
            newMods.splice(modIndex, 1);
          }
        } else if (excluded) {
          newMods.push({ componentId, excluded: true });
        }
      });

      updates.push({ id, assemblyModifications: newMods });
    });

    // Add to history for undo
    addToHistory({
      description: `Modified ${updates.length} items`,
      itemIds: Array.from(selectedItemIds),
      previousStates,
      newStates: updates,
    });

    onBulkUpdate(updates);
    toast.success(`Applied modifications to ${updates.length} items`);
    onOpenChange(false);
    
    // Reset state
    setComponentExclusions({});
    setSelectedItemIds(new Set());
    setSelectedType('all');
    setSelectedZone('all');
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (selectedItemIds.size === 0) {
      toast.error('No items selected');
      return;
    }

    const previousStates = Array.from(selectedItemIds).map(id => {
      const item = equipment.find(e => e.id === id);
      return {
        id,
        assemblyModifications: [...(item?.assemblyModifications || [])],
      };
    });

    const updates = Array.from(selectedItemIds).map(id => ({
      id,
      assemblyModifications: [],
    }));

    addToHistory({
      description: `Reset ${updates.length} items to defaults`,
      itemIds: Array.from(selectedItemIds),
      previousStates,
      newStates: updates,
    });

    onBulkUpdate(updates);
    toast.success(`Reset ${updates.length} items to default assemblies`);
  };

  // Save current exclusions as preset
  const saveAsPreset = () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (selectedType === 'all') {
      toast.error('Please select a specific equipment type first');
      return;
    }

    const excludedIds = Object.entries(componentExclusions)
      .filter(([_, excluded]) => excluded)
      .map(([id]) => id);

    if (excludedIds.length === 0) {
      toast.error('No components excluded to save');
      return;
    }

    const newPreset: ModificationPreset = {
      id: crypto.randomUUID(),
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || undefined,
      targetTypes: [selectedType],
      exclusions: excludedIds,
      createdAt: new Date(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    savePresets(updatedPresets);
    
    setNewPresetName('');
    setNewPresetDesc('');
    setShowSavePreset(false);
    toast.success(`Saved preset "${newPreset.name}"`);
  };

  // Apply a preset
  const applyPreset = (preset: ModificationPreset) => {
    if (selectedItemIds.size === 0) {
      toast.error('No items selected');
      return;
    }

    const updates: { id: string; assemblyModifications: AssemblyModification[] }[] = [];
    const previousStates: { id: string; assemblyModifications: AssemblyModification[] }[] = [];

    selectedItemIds.forEach(id => {
      const item = equipment.find(e => e.id === id);
      if (!item) return;

      // Check if preset applies to this type
      if (!preset.targetTypes.includes(item.type)) return;

      const assembly = getAssemblyForType(item.type);
      if (!assembly) return;

      previousStates.push({
        id,
        assemblyModifications: [...(item.assemblyModifications || [])],
      });

      // Create modifications from preset
      const newMods: AssemblyModification[] = preset.exclusions
        .filter(componentId => assembly.components.some(c => c.id === componentId))
        .map(componentId => ({ componentId, excluded: true }));

      updates.push({ id, assemblyModifications: newMods });
    });

    if (updates.length === 0) {
      toast.error('Preset does not apply to any selected items');
      return;
    }

    addToHistory({
      description: `Applied preset "${preset.name}" to ${updates.length} items`,
      itemIds: updates.map(u => u.id),
      previousStates,
      newStates: updates,
    });

    onBulkUpdate(updates);
    toast.success(`Applied "${preset.name}" to ${updates.length} items`);
  };

  // Delete a preset
  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    savePresets(updatedPresets);
    toast.success('Preset deleted');
  };

  // Undo last action
  const undo = () => {
    if (historyIndex < 0) return;
    
    const entry = history[historyIndex];
    onBulkUpdate(entry.previousStates);
    setHistoryIndex(prev => prev - 1);
    toast.info('Undone: ' + entry.description);
  };

  // Redo last undone action
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    
    const entry = history[historyIndex + 1];
    onBulkUpdate(entry.newStates);
    setHistoryIndex(prev => prev + 1);
    toast.info('Redone: ' + entry.description);
  };

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Bulk Assembly Editor
            </DialogTitle>
            
            {/* Undo/Redo Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogDescription>
            Apply assembly modifications to multiple items at once. Filter by type or zone.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="items" className="flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-1.5">
              <Bookmark className="h-4 w-4" />
              Presets ({presets.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              History ({history.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="flex-1 flex gap-4 min-h-0 overflow-hidden mt-4">
            {/* Left Panel - Item Selection */}
            <div className="w-1/2 flex flex-col border rounded-lg bg-background">
              <div className="p-3 border-b bg-muted/30 space-y-3">
                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                    <SelectTrigger className="flex-1 bg-background">
                      <SelectValue placeholder="All equipment types" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      <SelectItem value="all">All Equipment Types</SelectItem>
                      {assemblyTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type} ({equipmentByType[type]?.length || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Zone Filter */}
                {zones.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select value={selectedZone} onValueChange={setSelectedZone}>
                      <SelectTrigger className="flex-1 bg-background">
                        <SelectValue placeholder="All zones" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        <SelectItem value="all">All Zones</SelectItem>
                        {zones.map(zone => (
                          <SelectItem key={zone.id} value={zone.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: zone.color }} 
                              />
                              {zone.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="p-2 border-b flex items-center justify-between bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  {selectedItemIds.size} of {filteredEquipment.length} selected
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredEquipment.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No equipment with assemblies found
                    </p>
                  ) : (
                    filteredEquipment.map(item => {
                      const isSelected = selectedItemIds.has(item.id);
                      const hasMods = (item.assemblyModifications?.length || 0) > 0;
                      
                      // Find which zone this item is in
                      const itemZone = zones.find(z => isPointInZone(item.position, z.points));
                      
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItemSelection(item.id)}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-all",
                            isSelected 
                              ? "bg-primary/10 border-primary/50" 
                              : "bg-muted/30 border-transparent hover:border-border"
                          )}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">
                                {item.name || item.type}
                              </span>
                              {hasMods && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                  Modified
                                </Badge>
                              )}
                              {itemZone && (
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px]"
                                  style={{ 
                                    backgroundColor: `${itemZone.color}20`,
                                    borderColor: `${itemZone.color}50`,
                                    color: itemZone.color,
                                  }}
                                >
                                  {itemZone.name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{item.type}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Component Modifications */}
            <div className="w-1/2 flex flex-col border rounded-lg bg-background">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Assembly Components</span>
                  </div>
                  
                  {selectedType !== 'all' && Object.values(componentExclusions).some(v => v) && (
                    <Popover open={showSavePreset} onOpenChange={setShowSavePreset}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Save className="h-3 w-3 mr-1" />
                          Save Preset
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-popover border shadow-lg z-50" align="end">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Preset Name</Label>
                            <Input
                              placeholder="e.g., Dry Wall Install"
                              value={newPresetName}
                              onChange={(e) => setNewPresetName(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description (optional)</Label>
                            <Input
                              placeholder="Optional description"
                              value={newPresetDesc}
                              onChange={(e) => setNewPresetDesc(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button size="sm" className="w-full" onClick={saveAsPreset}>
                            Save Preset
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedType === 'all' 
                    ? 'Select a specific type to modify components'
                    : `Modify components for ${selectedType}`
                  }
                </p>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3">
                  {selectedType === 'all' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Select a specific equipment type to see and modify its assembly components
                      </p>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Quick Actions</h4>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={resetToDefaults}
                          disabled={selectedItemIds.size === 0}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reset Selected to Defaults
                        </Button>
                      </div>
                    </div>
                  ) : selectedAssembly ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-3">
                        Uncheck components to exclude them from selected items
                      </p>
                      
                      {selectedAssembly.components.map(component => {
                        const isExcluded = componentExclusions[component.id] || false;
                        
                        return (
                          <div
                            key={component.id}
                            onClick={() => toggleComponentExclusion(component.id)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all",
                              isExcluded 
                                ? "bg-destructive/10 border-destructive/30" 
                                : "bg-muted/30 border-border hover:border-primary/50"
                            )}
                          >
                            <Checkbox checked={!isExcluded} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-sm font-medium",
                                  isExcluded && "line-through text-muted-foreground"
                                )}>
                                  {component.name}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-[10px]", categoryColors[component.category])}
                                >
                                  {component.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{component.description}</p>
                            </div>

                            <span className="text-xs font-mono text-muted-foreground">
                              {component.quantity} {component.unit}
                            </span>
                          </div>
                        );
                      })}

                      {Object.values(componentExclusions).some(v => v) && (
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-400">
                                Components will be excluded
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {Object.values(componentExclusions).filter(v => v).length} component(s) 
                                will be removed from {selectedItemIds.size} item(s)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No assembly defined for this type
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-hidden mt-4">
            <div className="h-full border rounded-lg bg-background">
              <div className="p-3 border-b bg-muted/30">
                <h4 className="text-sm font-medium">Saved Modification Presets</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Quickly apply common modification patterns
                </p>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="p-3 space-y-2">
                  {presets.length === 0 ? (
                    <div className="text-center py-8">
                      <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No presets saved yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Modify components in the Items tab, then click "Save Preset"
                      </p>
                    </div>
                  ) : (
                    presets.map(preset => (
                      <div key={preset.id} className="p-3 bg-muted/30 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-sm">{preset.name}</h5>
                            {preset.description && (
                              <p className="text-xs text-muted-foreground">{preset.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => deletePreset(preset.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {preset.targetTypes.map(type => (
                            <Badge key={type} variant="secondary" className="text-[10px]">
                              {type}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="text-[10px]">
                            {preset.exclusions.length} excluded
                          </Badge>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => applyPreset(preset)}
                          disabled={selectedItemIds.size === 0}
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Apply to {selectedItemIds.size} Selected
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden mt-4">
            <div className="h-full border rounded-lg bg-background">
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Modification History</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Track and undo recent changes
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo}>
                    <Undo2 className="h-3.5 w-3.5 mr-1" />
                    Undo
                  </Button>
                  <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo}>
                    <Redo2 className="h-3.5 w-3.5 mr-1" />
                    Redo
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="p-3 space-y-2">
                  {history.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No history yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Modifications you make will appear here
                      </p>
                    </div>
                  ) : (
                    [...history].reverse().map((entry, idx) => {
                      const actualIndex = history.length - 1 - idx;
                      const isCurrent = actualIndex === historyIndex;
                      const isUndone = actualIndex > historyIndex;
                      
                      return (
                        <div 
                          key={entry.id} 
                          className={cn(
                            "p-3 rounded-lg border transition-all",
                            isCurrent ? "bg-primary/10 border-primary/50" : 
                            isUndone ? "bg-muted/20 border-transparent opacity-50" : 
                            "bg-muted/30 border-transparent"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium">{entry.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.timestamp.toLocaleTimeString()} - {entry.itemIds.length} item(s)
                              </p>
                            </div>
                            {isCurrent && (
                              <Badge variant="default" className="text-[10px]">
                                Current
                              </Badge>
                            )}
                            {isUndone && (
                              <Badge variant="outline" className="text-[10px]">
                                Undone
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={applyModifications}
            disabled={selectedItemIds.size === 0 || activeTab !== 'items'}
          >
            <Check className="h-4 w-4 mr-2" />
            Apply to {selectedItemIds.size} Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
