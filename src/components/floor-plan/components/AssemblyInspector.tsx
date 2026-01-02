import React from 'react';
import { Package, Check, X, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EquipmentItem, EquipmentType } from '../types';
import { 
  getAssemblyForType, 
  getEffectiveComponents,
  AssemblyModification 
} from '@/data/assemblies';
import { cn } from '@/lib/utils';

interface AssemblyInspectorProps {
  item: EquipmentItem;
  onUpdate: (item: EquipmentItem) => void;
}

const categoryColors: Record<string, string> = {
  material: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  labor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  accessory: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export const AssemblyInspector: React.FC<AssemblyInspectorProps> = ({ item, onUpdate }) => {
  const assembly = getAssemblyForType(item.type);
  
  if (!assembly) {
    return null;
  }

  const modifications: AssemblyModification[] = (item as any).assemblyModifications || [];
  const effectiveComponents = getEffectiveComponents(assembly, modifications);

  const handleToggleComponent = (componentId: string, currentlyExcluded: boolean) => {
    const existingMods = [...modifications];
    const modIndex = existingMods.findIndex(m => m.componentId === componentId);
    
    if (modIndex >= 0) {
      if (currentlyExcluded) {
        // Was excluded, now include (remove the modification)
        existingMods.splice(modIndex, 1);
      } else {
        // Was included, now exclude
        existingMods[modIndex] = { ...existingMods[modIndex], excluded: true };
      }
    } else {
      // No modification exists, create one to exclude
      existingMods.push({ componentId, excluded: true });
    }

    onUpdate({
      ...item,
      assemblyModifications: existingMods,
    } as any);
  };

  const includedCount = effectiveComponents.filter(c => !c.excluded && c.effectiveQuantity > 0).length;
  const totalCount = effectiveComponents.length;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Smart Assembly</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {includedCount}/{totalCount} items
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">{assembly.description}</p>

      <div className="space-y-2">
        {effectiveComponents.map(component => (
          <div 
            key={component.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-md border transition-all",
              component.excluded 
                ? "bg-muted/30 border-muted opacity-60" 
                : "bg-muted/50 border-border hover:border-primary/50"
            )}
          >
            <Checkbox
              checked={!component.excluded && component.effectiveQuantity > 0}
              onCheckedChange={() => handleToggleComponent(component.id, component.excluded)}
              className="flex-shrink-0"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium",
                  component.excluded ? "line-through text-muted-foreground" : "text-foreground"
                )}>
                  {component.name}
                </span>
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5 py-0", categoryColors[component.category])}
                >
                  {component.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{component.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono text-muted-foreground">
                {component.effectiveQuantity} {component.unit}
              </span>
              {component.boqCode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">BOQ: {component.boqCode}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        ))}
      </div>

      {modifications.length > 0 && (
        <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Custom modifications applied to this item
        </p>
      )}
    </div>
  );
};
