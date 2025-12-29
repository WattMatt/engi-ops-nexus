import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Zap, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { TakeoffCounts } from './LinkToFinalAccountDialog';
import { BOQItemSelector } from './BOQItemSelector';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface MaterialMappingStepProps {
  projectId: string;
  floorPlanId: string;
  sectionId: string;
  finalAccountId: string;
  takeoffCounts: TakeoffCounts;
  onMappingsComplete: (mappings: MaterialMapping[]) => void;
  onBack: () => void;
}

export interface MaterialMapping {
  equipmentType: string;
  equipmentLabel: string;
  category: 'equipment' | 'containment' | 'cable';
  quantity: number;
  unit: string;
  finalAccountItemId?: string;
  finalAccountSectionId?: string;
  masterMaterialId?: string;
  boqItemId?: string;
}

interface FinalAccountItem {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  supply_rate: number;
  install_rate: number;
  section_id: string;
  section_name?: string;
}

interface MasterMaterial {
  id: string;
  material_code: string;
  material_name: string;
  unit: string;
  standard_supply_cost: number;
  standard_install_cost: number;
}

interface EquipmentItem {
  key: string;
  label: string;
  category: 'equipment' | 'containment' | 'cable';
  quantity: number;
  unit: string;
}

interface CombinedOption {
  id: string;
  label: string;
  code: string;
  source: 'final_account' | 'master';
  rate: number;
  unit: string;
  sectionName?: string;
}

interface SelectedItem {
  id: string;
  source: 'final_account' | 'master';
}

export const MaterialMappingStep: React.FC<MaterialMappingStepProps> = ({
  projectId,
  floorPlanId,
  sectionId,
  finalAccountId,
  takeoffCounts,
  onMappingsComplete,
  onBack,
}) => {
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<Record<string, SelectedItem[]>>({});
  // Removed category tabs - all items shown in one list
  const [bulkMappingOpen, setBulkMappingOpen] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);

  // Fetch existing mappings for this project
  const { data: existingMappings } = useQuery({
    queryKey: ['floor-plan-material-mappings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plan_material_mappings')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch all sections for the final account
  const { data: allSections } = useQuery({
    queryKey: ['final-account-all-sections', finalAccountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('final_account_sections')
        .select('id, section_code, section_name, bill_id')
        .eq('bill_id', (await (supabase as any)
          .from('final_account_bills')
          .select('id')
          .eq('final_account_id', finalAccountId)
          .then((r: any) => r.data?.map((b: any) => b.id) || [])));
      if (error) throw error;
      return data || [];
    },
    enabled: !!finalAccountId,
  });

  // Fetch ONLY items from the selected section - simple and complete
  const { data: finalAccountItems, isLoading: loadingFAItems } = useQuery({
    queryKey: ['final-account-items-selected-section', sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      
      // Get section info first
      const { data: sectionInfo } = await supabase
        .from('final_account_sections')
        .select('section_name')
        .eq('id', sectionId)
        .maybeSingle();
      
      const sectionName = sectionInfo?.section_name || 'Selected Section';
      
      // Fetch ALL items from the selected section only - no limit
      const { data: items, error } = await supabase
        .from('final_account_items')
        .select('id, item_code, description, unit, supply_rate, install_rate, display_order, section_id')
        .eq('section_id', sectionId)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('Error fetching section items:', error);
        return [];
      }
      
      console.log(`[MaterialMapping] Fetched ${items?.length || 0} items from section: ${sectionName}`);
      
      // Add section name to each item - keep original display_order from database
      // The display_order already has the correct hierarchical structure:
      // D1 (header), description row, D1.1 (child), D1.2 (child), D2 (header), etc.
      const result = (items || []).map(item => ({
        ...item,
        section_name: sectionName
      }));
      
      return result as FinalAccountItem[];
    },
    enabled: !!sectionId,
  });

  // Fetch master materials
  const { data: masterMaterials, isLoading: loadingMaterials } = useQuery({
    queryKey: ['master-materials-for-mapping'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('master_materials')
        .select('id, material_code, material_name, unit, standard_supply_cost, standard_install_cost')
        .order('material_name')
        .limit(500);
      if (error) throw error;
      return (data || []) as MasterMaterial[];
    },
  });

  // Build equipment list from takeoff counts
  const equipmentList = useMemo(() => {
    const items: EquipmentItem[] = [];

    if (takeoffCounts?.equipment) {
      for (const [type, count] of Object.entries(takeoffCounts.equipment)) {
        if (count > 0) {
          items.push({ key: `equipment_${type}`, label: type, category: 'equipment', quantity: count, unit: 'Nr' });
        }
      }
    }

    if (takeoffCounts?.containment) {
      for (const [type, length] of Object.entries(takeoffCounts.containment)) {
        if (length > 0) {
          items.push({ key: `containment_${type}`, label: type, category: 'containment', quantity: Math.round(length * 100) / 100, unit: 'm' });
        }
      }
    }

    // Individual circuit cables removed - only circuitWiring aggregated totals are used

    // Include circuit wiring materials (conductors, earth cables, etc.)
    if (takeoffCounts?.circuitWiring) {
      for (const [type, data] of Object.entries(takeoffCounts.circuitWiring)) {
        if (data.count > 0) {
          const quantity = data.totalLength > 0 ? Math.round(data.totalLength * 100) / 100 : data.count;
          const unit = data.unit || (data.totalLength > 0 ? 'm' : 'Nr');
          items.push({ key: `cable_${type}`, label: type, category: 'cable', quantity, unit });
        }
      }
    }

    return items;
  }, [takeoffCounts]);

  // Initialize mappings from existing data
  React.useEffect(() => {
    if (existingMappings && existingMappings.length > 0 && equipmentList.length > 0) {
      const initialMappings: Record<string, SelectedItem[]> = {};
      
      for (const mapping of existingMappings) {
        const key = `${mapping.equipment_type}_${mapping.equipment_label}`;
        if (!initialMappings[key]) {
          initialMappings[key] = [];
        }
        if (mapping.final_account_item_id) {
          initialMappings[key].push({ id: mapping.final_account_item_id, source: 'final_account' });
        } else if (mapping.master_material_id) {
          initialMappings[key].push({ id: mapping.master_material_id, source: 'master' });
        }
      }
      
      setMappings(initialMappings);
    }
  }, [existingMappings, equipmentList]);

  // All items in one flat list - no category grouping

  // Combined item list for dropdown with search
  const combinedItemOptions = useMemo((): CombinedOption[] => {
    const options: CombinedOption[] = [];
    
    if (finalAccountItems) {
      for (const item of finalAccountItems) {
        options.push({
          id: item.id,
          label: item.description,
          code: item.item_code || '',
          source: 'final_account',
          rate: (item.supply_rate || 0) + (item.install_rate || 0),
          unit: item.unit || '',
          sectionName: item.section_name,
        });
      }
    }
    
    if (masterMaterials) {
      for (const mat of masterMaterials) {
        options.push({
          id: mat.id,
          label: mat.material_name,
          code: mat.material_code || '',
          source: 'master',
          rate: (mat.standard_supply_cost || 0) + (mat.standard_install_cost || 0),
          unit: mat.unit || '',
        });
      }
    }
    
    return options;
  }, [finalAccountItems, masterMaterials]);

  const handleMappingChange = (equipmentKey: string, items: SelectedItem[]) => {
    setMappings(prev => ({
      ...prev,
      [equipmentKey]: items,
    }));
  };

  const handleClearMapping = (equipmentKey: string) => {
    setMappings(prev => {
      const next = { ...prev };
      delete next[equipmentKey];
      return next;
    });
  };

  const handleBulkMap = (items: SelectedItem[]) => {
    const newMappings = { ...mappings };
    for (const key of selectedForBulk) {
      newMappings[key] = items;
    }
    setMappings(newMappings);
    setSelectedForBulk([]);
    setBulkMappingOpen(false);
    toast.success(`Mapped ${selectedForBulk.length} items`);
  };

  const toggleBulkSelect = (key: string) => {
    setSelectedForBulk(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllUnmapped = () => {
    const unmappedItems = equipmentList.filter(i => !mappings[i.key] || mappings[i.key].length === 0).map(i => i.key);
    setSelectedForBulk(unmappedItems);
  };

  // Save mappings mutation
  const saveMappingsMutation = useMutation({
    mutationFn: async () => {
      const user = await supabase.auth.getUser();
      // Flatten all equipment items with their selected BOQ items
      const mappingsToSave: any[] = [];
      
      console.log('[MaterialMappingStep] Saving mappings...');
      console.log('[MaterialMappingStep] Equipment list:', equipmentList.map(e => e.key));
      console.log('[MaterialMappingStep] Current mappings state:', mappings);
      
      for (const item of equipmentList) {
        const selectedItems = mappings[item.key] || [];
        console.log(`[MaterialMappingStep] Item ${item.key}: ${selectedItems.length} selections`);
        for (const sel of selectedItems) {
          mappingsToSave.push({
            project_id: projectId,
            floor_plan_id: floorPlanId,
            equipment_type: item.category,
            equipment_label: item.label,
            final_account_item_id: sel.source === 'final_account' ? sel.id : null,
            master_material_id: sel.source === 'master' ? sel.id : null,
            quantity_per_unit: 1,
            created_by: user.data.user?.id,
          });
        }
      }

      console.log('[MaterialMappingStep] Mappings to save:', mappingsToSave.length);

      if (mappingsToSave.length > 0) {
        // Delete existing mappings for this floor plan first, then insert new ones
        const { error: deleteError } = await supabase
          .from('floor_plan_material_mappings')
          .delete()
          .eq('project_id', projectId)
          .eq('floor_plan_id', floorPlanId);
        
        if (deleteError) {
          console.error('[MaterialMappingStep] Delete error:', deleteError);
        }
          
        const { error } = await supabase
          .from('floor_plan_material_mappings')
          .insert(mappingsToSave);
        if (error) {
          console.error('[MaterialMappingStep] Insert error:', error);
          throw error;
        }
        
        console.log('[MaterialMappingStep] Successfully saved', mappingsToSave.length, 'mappings');
      } else {
        console.warn('[MaterialMappingStep] No mappings to save - user did not select any BOQ items');
      }

      return mappingsToSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-material-mappings'] });
      
      const finalMappings: MaterialMapping[] = equipmentList.map(item => {
        const selectedItems = mappings[item.key] || [];
        // Get the first FA item for section_id (backwards compatible)
        const firstFaItem = selectedItems.find(s => s.source === 'final_account');
        const faItem = firstFaItem 
          ? finalAccountItems?.find(fa => fa.id === firstFaItem.id)
          : undefined;
        
        return {
          equipmentType: item.category,
          equipmentLabel: item.label,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          finalAccountItemId: firstFaItem?.id,
          finalAccountSectionId: faItem?.section_id,
          masterMaterialId: selectedItems.find(s => s.source === 'master')?.id,
        };
      });
      
      onMappingsComplete(finalMappings);
    },
    onError: (error) => {
      toast.error(`Failed to save mappings: ${error.message}`);
    },
  });

  const getMappedOptions = (key: string): CombinedOption[] => {
    const selectedItems = mappings[key] || [];
    return selectedItems
      .map(sel => combinedItemOptions.find(o => o.id === sel.id))
      .filter((o): o is CombinedOption => o !== undefined);
  };

  const getMappedTotalRate = (key: string): number => {
    const options = getMappedOptions(key);
    return options.reduce((sum, o) => sum + o.rate, 0);
  };

  const mappedCount = Object.entries(mappings).filter(([_, items]) => items.length > 0).length;
  const totalCount = equipmentList.length;

  // Removed category stats - all items in one list

  if (loadingFAItems || loadingMaterials) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading BOQ items...</span>
      </div>
    );
  }

  if (equipmentList.length === 0) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No items to map</p>
          <p className="text-sm mt-1">Mark up equipment, containment, or cables on the floor plan first.</p>
        </div>
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={() => onMappingsComplete([])}>Continue</Button>
        </div>
      </div>
    );
  }

  const renderItemSelector = (item: EquipmentItem) => {
    const mappedOptions = getMappedOptions(item.key);
    const selectedItems = mappings[item.key] || [];
    
    return (
      <BOQItemSelector
        finalAccountItems={finalAccountItems}
        masterMaterials={masterMaterials}
        selectedItems={selectedItems}
        onSelect={(items) => handleMappingChange(item.key, items)}
        mappedLabels={mappedOptions.map(o => o.label)}
        mappedTotalRate={getMappedTotalRate(item.key)}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Map to BOQ Items</Label>
          <p className="text-sm text-muted-foreground">
            Link floor plan items to BOQ for costing
          </p>
        </div>
        <Badge variant={mappedCount === totalCount ? 'default' : 'secondary'} className="text-sm">
          {mappedCount}/{totalCount}
        </Badge>
      </div>


      {/* Bulk Action Bar */}
      {equipmentList.length > 1 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedForBulk.length === equipmentList.filter(i => !mappings[i.key]).length && selectedForBulk.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  selectAllUnmapped();
                } else {
                  setSelectedForBulk([]);
                }
              }}
              className="rounded border-muted-foreground/50"
            />
            <span className="text-sm text-muted-foreground">
              {selectedForBulk.length > 0 ? `${selectedForBulk.length} selected` : 'Select unmapped items'}
            </span>
          </div>
          {selectedForBulk.length > 0 && (
            <Popover open={bulkMappingOpen} onOpenChange={setBulkMappingOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  Bulk Map
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 bg-popover" align="end">
                <Command>
                  <CommandInput placeholder="Search items to bulk apply..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No items found.</CommandEmpty>
                    {finalAccountItems && finalAccountItems.length > 0 && (
                      <CommandGroup heading="Final Account Items">
                        {finalAccountItems.map((fa) => (
                          <CommandItem
                            key={fa.id}
                            value={`${fa.item_code} ${fa.description}`}
                            onSelect={() => handleBulkMap([{ id: fa.id, source: 'final_account' }])}
                          >
                            <div className="flex-1">
                              <span className="font-mono text-xs text-muted-foreground mr-2">{fa.item_code}</span>
                              {fa.description}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {masterMaterials && masterMaterials.length > 0 && (
                      <CommandGroup heading="Master Materials">
                        {masterMaterials.slice(0, 30).map((mm) => (
                          <CommandItem
                            key={mm.id}
                            value={`${mm.material_code} ${mm.material_name}`}
                            onSelect={() => handleBulkMap([{ id: mm.id, source: 'master' }])}
                          >
                            <div className="flex-1">
                              <span className="font-mono text-xs text-muted-foreground mr-2">{mm.material_code}</span>
                              {mm.material_name}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {/* Items List - All items in one flat list */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-2 pr-4">
          {equipmentList.map(item => (
            <div 
              key={item.key} 
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                mappings[item.key] && mappings[item.key].length > 0 ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              {/* Checkbox for bulk selection */}
              {(!mappings[item.key] || mappings[item.key].length === 0) && (
                <input
                  type="checkbox"
                  checked={selectedForBulk.includes(item.key)}
                  onChange={() => toggleBulkSelect(item.key)}
                  className="mt-2 rounded border-muted-foreground/50"
                />
              )}
              {mappings[item.key] && mappings[item.key].length > 0 && (
                <div className="mt-1.5">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              
              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{item.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {item.quantity} {item.unit}
                  </Badge>
                </div>
                {renderItemSelector(item)}
              </div>

              {/* Clear button */}
              {mappings[item.key] && mappings[item.key].length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleClearMapping(item.key)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onMappingsComplete([])}>
            Skip
          </Button>
          <Button 
            onClick={() => saveMappingsMutation.mutate()}
            disabled={saveMappingsMutation.isPending}
          >
            {saveMappingsMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <>Continue ({mappedCount} mapped)</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};