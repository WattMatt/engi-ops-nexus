import React, { useState, useMemo } from 'react';
import { Package, Settings2, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EquipmentItem, EquipmentType, SupplyZone } from '../types';
import { 
  getAssemblyForType, 
  getAssemblyEquipmentTypes,
  getEffectiveComponents,
  AssemblyModification,
} from '@/data/assemblies';
import { EquipmentIcon } from './EquipmentIcon';
import { cn } from '@/lib/utils';

interface AssembliesTabProps {
  equipment: EquipmentItem[];
  zones: SupplyZone[];
  onEquipmentUpdate: (item: EquipmentItem) => void;
  onOpenBulkEditor: () => void;
}

const categoryColors: Record<string, string> = {
  material: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  labor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  accessory: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export const AssembliesTab: React.FC<AssembliesTabProps> = ({
  equipment,
  zones,
  onEquipmentUpdate,
  onOpenBulkEditor,
}) => {
  const [selectedType, setSelectedType] = useState<EquipmentType | 'all'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Get equipment types that have assemblies
  const assemblyTypes = useMemo(() => getAssemblyEquipmentTypes(), []);

  // Filter equipment to only those with assemblies
  const equipmentWithAssemblies = useMemo(() => {
    return equipment.filter(item => {
      const hasAssembly = assemblyTypes.includes(item.type);
      if (!hasAssembly) return false;
      if (selectedType === 'all') return true;
      return item.type === selectedType;
    });
  }, [equipment, selectedType, assemblyTypes]);

  // Group by type
  const groupedByType = useMemo(() => {
    const grouped: Record<string, EquipmentItem[]> = {};
    equipmentWithAssemblies.forEach(item => {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item);
    });
    return grouped;
  }, [equipmentWithAssemblies]);

  // Calculate assembly statistics
  const stats = useMemo(() => {
    let totalItems = 0;
    let modifiedItems = 0;
    let totalComponents = 0;
    let excludedComponents = 0;

    equipmentWithAssemblies.forEach(item => {
      totalItems++;
      const mods = item.assemblyModifications || [];
      if (mods.length > 0) modifiedItems++;
      
      const assembly = getAssemblyForType(item.type);
      if (assembly) {
        totalComponents += assembly.components.length;
        excludedComponents += mods.filter(m => m.excluded).length;
      }
    });

    return { totalItems, modifiedItems, totalComponents, excludedComponents };
  }, [equipmentWithAssemblies]);

  // Toggle item expansion
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle component exclusion for a single item
  const toggleComponentExclusion = (item: EquipmentItem, componentId: string) => {
    const mods = [...(item.assemblyModifications || [])];
    const existingIndex = mods.findIndex(m => m.componentId === componentId);
    
    if (existingIndex >= 0) {
      // Toggle existing modification
      if (mods[existingIndex].excluded) {
        mods.splice(existingIndex, 1);
      } else {
        mods[existingIndex] = { ...mods[existingIndex], excluded: true };
      }
    } else {
      // Add new exclusion
      mods.push({ componentId, excluded: true });
    }
    
    onEquipmentUpdate({ ...item, assemblyModifications: mods });
  };

  // Check if point is in zone
  const getItemZone = (item: EquipmentItem): SupplyZone | undefined => {
    return zones.find(zone => {
      if (zone.points.length < 3) return false;
      let inside = false;
      for (let i = 0, j = zone.points.length - 1; i < zone.points.length; j = i++) {
        const xi = zone.points[i].x, yi = zone.points[i].y;
        const xj = zone.points[j].x, yj = zone.points[j].y;
        if (((yi > item.position.y) !== (yj > item.position.y)) && 
            (item.position.x < (xj - xi) * (item.position.y - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    });
  };

  if (assemblyTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-medium text-foreground mb-1">No Assemblies Available</h3>
        <p className="text-xs text-muted-foreground">Smart assemblies are defined for common equipment types</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Smart Assemblies
        </h3>
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs"
          onClick={onOpenBulkEditor}
        >
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          Bulk Edit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Items with Assemblies</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{stats.totalItems}</span>
            {stats.modifiedItems > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                {stats.modifiedItems} modified
              </Badge>
            )}
          </div>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Total Components</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{stats.totalComponents}</span>
            {stats.excludedComponents > 0 && (
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                {stats.excludedComponents} excluded
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filter */}
      <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent className="bg-popover border shadow-lg z-50">
          <SelectItem value="all">All Assembly Types ({equipmentWithAssemblies.length})</SelectItem>
          {Object.entries(groupedByType).map(([type, items]) => (
            <SelectItem key={type} value={type}>
              {type} ({items.length})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Equipment List */}
      <ScrollArea className="h-[calc(100vh-450px)] min-h-[200px]">
        <div className="space-y-2 pr-2">
          {equipmentWithAssemblies.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No equipment with assemblies found</p>
              <p className="text-xs text-muted-foreground mt-1">Place equipment on the floor plan to see their assemblies</p>
            </div>
          ) : (
            equipmentWithAssemblies.map(item => {
              const isExpanded = expandedItems.has(item.id);
              const assembly = getAssemblyForType(item.type);
              const mods = item.assemblyModifications || [];
              const hasMods = mods.length > 0;
              const itemZone = getItemZone(item);
              
              if (!assembly) return null;

              const effectiveComponents = getEffectiveComponents(assembly, mods);
              const excludedCount = mods.filter(m => m.excluded).length;

              return (
                <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleExpand(item.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                      isExpanded 
                        ? "bg-primary/5 border-primary/30" 
                        : "bg-muted/30 border-border hover:border-primary/30"
                    )}>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      
                      <EquipmentIcon type={item.type} className="h-5 w-5 text-amber-400 flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.name || item.type}
                          </span>
                          {hasMods && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                              {excludedCount} excluded
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
                        <p className="text-xs text-muted-foreground">{assembly.name}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {effectiveComponents.length}/{assembly.components.length}
                        </span>
                        {hasMods ? (
                          <AlertCircle className="h-4 w-4 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-2 ml-7 space-y-1.5 pb-2">
                      {assembly.components.map(component => {
                        const isExcluded = mods.some(m => m.componentId === component.id && m.excluded);
                        
                        return (
                          <div
                            key={component.id}
                            onClick={() => toggleComponentExclusion(item, component.id)}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all",
                              isExcluded 
                                ? "bg-destructive/10 border-destructive/30 opacity-60" 
                                : "bg-muted/20 border-border hover:border-primary/30"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0",
                              isExcluded 
                                ? "border-destructive bg-destructive/20" 
                                : "border-primary bg-primary/20"
                            )}>
                              {!isExcluded && <CheckCircle2 className="h-3 w-3 text-primary" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs font-medium",
                                  isExcluded && "line-through text-muted-foreground"
                                )}>
                                  {component.name}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-[9px] px-1 py-0", categoryColors[component.category])}
                                >
                                  {component.category}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{component.description}</p>
                            </div>

                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                              {component.quantity} {component.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
