import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Check, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TakeoffCounts } from './LinkToFinalAccountDialog';

interface MaterialMappingStepProps {
  projectId: string;
  floorPlanId: string;
  sectionId: string;
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
}

interface MasterMaterial {
  id: string;
  material_code: string;
  material_name: string;
  unit: string;
  standard_supply_cost: number;
  standard_install_cost: number;
}

export const MaterialMappingStep: React.FC<MaterialMappingStepProps> = ({
  projectId,
  floorPlanId,
  sectionId,
  takeoffCounts,
  onMappingsComplete,
  onBack,
}) => {
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<Record<string, { itemId: string; source: 'final_account' | 'master' }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('equipment');

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

  // Fetch final account items for the section
  const { data: finalAccountItems, isLoading: loadingFAItems } = useQuery({
    queryKey: ['final-account-items-for-mapping', sectionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('final_account_items')
        .select('id, item_code, description, unit, supply_rate, install_rate')
        .eq('section_id', sectionId)
        .order('item_code');
      if (error) throw error;
      return (data || []) as FinalAccountItem[];
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
    const items: Array<{ key: string; label: string; category: 'equipment' | 'containment' | 'cable'; quantity: number; unit: string }> = [];

    // Equipment
    for (const [type, count] of Object.entries(takeoffCounts.equipment)) {
      if (count > 0) {
        items.push({ key: `equipment_${type}`, label: type, category: 'equipment', quantity: count, unit: 'Nr' });
      }
    }

    // Containment
    for (const [type, length] of Object.entries(takeoffCounts.containment)) {
      if (length > 0) {
        items.push({ key: `containment_${type}`, label: type, category: 'containment', quantity: Math.round(length * 100) / 100, unit: 'm' });
      }
    }

    // Cables
    for (const [type, data] of Object.entries(takeoffCounts.cables)) {
      if (data.count > 0) {
        items.push({ key: `cable_${type}`, label: type, category: 'cable', quantity: Math.round(data.totalLength * 100) / 100, unit: 'm' });
      }
    }

    return items;
  }, [takeoffCounts]);

  // Initialize mappings from existing data
  React.useEffect(() => {
    if (existingMappings && existingMappings.length > 0) {
      const initialMappings: Record<string, { itemId: string; source: 'final_account' | 'master' }> = {};
      
      for (const mapping of existingMappings) {
        const key = `${mapping.equipment_type}_${mapping.equipment_label}`;
        if (mapping.final_account_item_id) {
          initialMappings[key] = { itemId: mapping.final_account_item_id, source: 'final_account' };
        } else if (mapping.master_material_id) {
          initialMappings[key] = { itemId: mapping.master_material_id, source: 'master' };
        }
      }
      
      setMappings(prev => ({ ...prev, ...initialMappings }));
    }
  }, [existingMappings]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return equipmentList;
    const query = searchQuery.toLowerCase();
    return equipmentList.filter(item => item.label.toLowerCase().includes(query));
  }, [equipmentList, searchQuery]);

  // Group items by category
  const groupedItems = useMemo(() => {
    return {
      equipment: filteredItems.filter(i => i.category === 'equipment'),
      containment: filteredItems.filter(i => i.category === 'containment'),
      cable: filteredItems.filter(i => i.category === 'cable'),
    };
  }, [filteredItems]);

  // Combined item list for dropdown
  const combinedItemOptions = useMemo(() => {
    const options: Array<{ id: string; label: string; source: 'final_account' | 'master'; rate: number }> = [];
    
    if (finalAccountItems) {
      for (const item of finalAccountItems) {
        options.push({
          id: item.id,
          label: `[FA] ${item.item_code || ''} - ${item.description}`,
          source: 'final_account',
          rate: (item.supply_rate || 0) + (item.install_rate || 0),
        });
      }
    }
    
    if (masterMaterials) {
      for (const mat of masterMaterials) {
        options.push({
          id: mat.id,
          label: `[MM] ${mat.material_code || ''} - ${mat.material_name}`,
          source: 'master',
          rate: (mat.standard_supply_cost || 0) + (mat.standard_install_cost || 0),
        });
      }
    }
    
    return options;
  }, [finalAccountItems, masterMaterials]);

  const handleMappingChange = (equipmentKey: string, value: string) => {
    if (!value) {
      setMappings(prev => {
        const next = { ...prev };
        delete next[equipmentKey];
        return next;
      });
      return;
    }

    const option = combinedItemOptions.find(o => o.id === value);
    if (option) {
      setMappings(prev => ({
        ...prev,
        [equipmentKey]: { itemId: value, source: option.source },
      }));
    }
  };

  // Save mappings mutation
  const saveMappingsMutation = useMutation({
    mutationFn: async () => {
      const user = await supabase.auth.getUser();
      const mappingsToSave = equipmentList.map(item => {
        const mapping = mappings[item.key];
        return {
          project_id: projectId,
          floor_plan_id: floorPlanId,
          equipment_type: item.category,
          equipment_label: item.label,
          final_account_item_id: mapping?.source === 'final_account' ? mapping.itemId : null,
          master_material_id: mapping?.source === 'master' ? mapping.itemId : null,
          quantity_per_unit: 1,
          created_by: user.data.user?.id,
        };
      }).filter(m => m.final_account_item_id || m.master_material_id);

      // Delete existing mappings for this floor plan
      await supabase
        .from('floor_plan_material_mappings')
        .delete()
        .eq('floor_plan_id', floorPlanId);

      // Insert new mappings
      if (mappingsToSave.length > 0) {
        const { error } = await supabase
          .from('floor_plan_material_mappings')
          .insert(mappingsToSave);
        if (error) throw error;
      }

      return mappingsToSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-material-mappings'] });
      
      // Build the final mappings array
      const finalMappings: MaterialMapping[] = equipmentList.map(item => {
        const mapping = mappings[item.key];
        return {
          equipmentType: item.category,
          equipmentLabel: item.label,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          finalAccountItemId: mapping?.source === 'final_account' ? mapping.itemId : undefined,
          masterMaterialId: mapping?.source === 'master' ? mapping.itemId : undefined,
        };
      });
      
      onMappingsComplete(finalMappings);
    },
    onError: (error) => {
      toast.error(`Failed to save mappings: ${error.message}`);
    },
  });

  const mappedCount = Object.keys(mappings).length;
  const totalCount = equipmentList.length;

  const renderCategorySection = (category: 'equipment' | 'containment' | 'cable', title: string, items: typeof equipmentList) => {
    if (items.length === 0) return null;
    const isExpanded = expandedCategory === category;

    return (
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedCategory(isExpanded ? null : category)}
          className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="font-medium">{title}</span>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {isExpanded && (
          <div className="p-3 space-y-3">
            {items.map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.label}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {item.quantity} {item.unit}
                    </Badge>
                  </div>
                </div>
                <div className="w-[280px] shrink-0">
                  <Select
                    value={mappings[item.key]?.itemId || ''}
                    onValueChange={(v) => handleMappingChange(item.key, v)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select BOQ/Material item..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="">No mapping</SelectItem>
                      {combinedItemOptions.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                            Final Account Items
                          </div>
                          {combinedItemOptions
                            .filter(o => o.source === 'final_account')
                            .map(option => (
                              <SelectItem key={option.id} value={option.id} className="text-xs">
                                {option.label}
                              </SelectItem>
                            ))}
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                            Master Materials
                          </div>
                          {combinedItemOptions
                            .filter(o => o.source === 'master')
                            .slice(0, 50) // Limit for performance
                            .map(option => (
                              <SelectItem key={option.id} value={option.id} className="text-xs">
                                {option.label}
                              </SelectItem>
                            ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {mappings[item.key] ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loadingFAItems || loadingMaterials) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Map Equipment to BOQ Items</Label>
          <p className="text-sm text-muted-foreground">
            Link floor plan items to Final Account or Master Material items for accurate costing.
          </p>
        </div>
        <Badge variant={mappedCount === totalCount ? 'default' : 'secondary'}>
          {mappedCount}/{totalCount} mapped
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {renderCategorySection('equipment', 'Equipment', groupedItems.equipment)}
          {renderCategorySection('containment', 'Containment', groupedItems.containment)}
          {renderCategorySection('cable', 'Cables', groupedItems.cable)}
        </div>
      </ScrollArea>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onMappingsComplete([])}
          >
            Skip Mapping
          </Button>
          <Button 
            onClick={() => saveMappingsMutation.mutate()}
            disabled={saveMappingsMutation.isPending}
          >
            {saveMappingsMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <>Continue with {mappedCount} mappings</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
