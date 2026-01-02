import React, { useState, useMemo } from 'react';
import { Package, Filter, Check, X, AlertTriangle, Layers, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EquipmentItem, EquipmentType } from '../types';
import { 
  getAssemblyForType, 
  getEffectiveComponents,
  getAssemblyEquipmentTypes,
  AssemblyModification,
  AssemblyComponent,
} from '@/data/assemblies';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BulkAssemblyEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: EquipmentItem[];
  onBulkUpdate: (updates: { id: string; assemblyModifications: AssemblyModification[] }[]) => void;
}

const categoryColors: Record<string, string> = {
  material: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  labor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  accessory: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export const BulkAssemblyEditor: React.FC<BulkAssemblyEditorProps> = ({
  open,
  onOpenChange,
  equipment,
  onBulkUpdate,
}) => {
  const [selectedType, setSelectedType] = useState<EquipmentType | 'all'>('all');
  const [componentExclusions, setComponentExclusions] = useState<Record<string, boolean>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Get equipment types that have assemblies
  const assemblyTypes = useMemo(() => getAssemblyEquipmentTypes(), []);
  
  // Filter equipment to only those with assemblies
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const hasAssembly = assemblyTypes.includes(item.type);
      if (!hasAssembly) return false;
      if (selectedType === 'all') return true;
      return item.type === selectedType;
    });
  }, [equipment, selectedType, assemblyTypes]);

  // Get unique assembly for selected type
  const selectedAssembly = useMemo(() => {
    if (selectedType === 'all') return null;
    return getAssemblyForType(selectedType);
  }, [selectedType]);

  // Group equipment by type for summary
  const equipmentByType = useMemo(() => {
    const grouped: Record<string, EquipmentItem[]> = {};
    filteredEquipment.forEach(item => {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item);
    });
    return grouped;
  }, [filteredEquipment]);

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

  // Apply modifications to selected items
  const applyModifications = () => {
    if (selectedItemIds.size === 0) {
      toast.error('No items selected');
      return;
    }

    const updates: { id: string; assemblyModifications: AssemblyModification[] }[] = [];

    selectedItemIds.forEach(id => {
      const item = equipment.find(e => e.id === id);
      if (!item) return;

      const assembly = getAssemblyForType(item.type);
      if (!assembly) return;

      // Get existing modifications
      const existingMods: AssemblyModification[] = (item as any).assemblyModifications || [];
      const newMods: AssemblyModification[] = [...existingMods];

      // Apply new exclusions
      Object.entries(componentExclusions).forEach(([componentId, excluded]) => {
        // Check if this component belongs to this assembly
        const componentExists = assembly.components.some(c => c.id === componentId);
        if (!componentExists) return;

        const modIndex = newMods.findIndex(m => m.componentId === componentId);
        if (modIndex >= 0) {
          if (excluded) {
            newMods[modIndex] = { ...newMods[modIndex], excluded: true };
          } else {
            // Remove exclusion
            newMods.splice(modIndex, 1);
          }
        } else if (excluded) {
          newMods.push({ componentId, excluded: true });
        }
      });

      updates.push({ id, assemblyModifications: newMods });
    });

    onBulkUpdate(updates);
    toast.success(`Applied modifications to ${updates.length} items`);
    onOpenChange(false);
    
    // Reset state
    setComponentExclusions({});
    setSelectedItemIds(new Set());
    setSelectedType('all');
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (selectedItemIds.size === 0) {
      toast.error('No items selected');
      return;
    }

    const updates = Array.from(selectedItemIds).map(id => ({
      id,
      assemblyModifications: [],
    }));

    onBulkUpdate(updates);
    toast.success(`Reset ${updates.length} items to default assemblies`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Bulk Assembly Editor
          </DialogTitle>
          <DialogDescription>
            Apply assembly modifications to multiple items at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* Left Panel - Item Selection */}
          <div className="w-1/2 flex flex-col border rounded-lg">
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by Type</span>
              </div>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All equipment types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment Types</SelectItem>
                  {assemblyTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type} ({equipmentByType[type]?.length || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    const hasMods = ((item as any).assemblyModifications?.length || 0) > 0;
                    
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {item.name || item.type}
                            </span>
                            {hasMods && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                Modified
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
          <div className="w-1/2 flex flex-col border rounded-lg">
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Assembly Components</span>
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
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={applyModifications}
            disabled={selectedItemIds.size === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Apply to {selectedItemIds.size} Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
