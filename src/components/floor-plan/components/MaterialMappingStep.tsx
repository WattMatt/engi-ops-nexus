import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Check, Search, Zap, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TakeoffCounts } from './LinkToFinalAccountDialog';
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
  _isSelectedSection?: boolean;
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
  const [mappings, setMappings] = useState<Record<string, { itemId: string; source: 'final_account' | 'master' }>>({});
  const [activeCategory, setActiveCategory] = useState<'equipment' | 'containment' | 'cable'>('equipment');
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

  // Fetch final account items - fetch ALL items by querying each section separately
  const { data: finalAccountItems, isLoading: loadingFAItems } = useQuery({
    queryKey: ['final-account-items-for-mapping-all', finalAccountId, sectionId],
    queryFn: async () => {
      console.log('[MaterialMapping] Starting fetch for finalAccountId:', finalAccountId);
      
      // First get all bills for this final account
      const { data: bills, error: billsError } = await (supabase as any)
        .from('final_account_bills')
        .select('id')
        .eq('final_account_id', finalAccountId);
      
      console.log('[MaterialMapping] Bills fetched:', bills?.length, 'Error:', billsError);
      
      if (!bills || bills.length === 0) return [];
      
      const billIds = bills.map((b: any) => b.id);
      
      // Get all sections for these bills
      const { data: sections, error: sectionsError } = await (supabase as any)
        .from('final_account_sections')
        .select('id, section_name')
        .in('bill_id', billIds);
      
      console.log('[MaterialMapping] Sections fetched:', sections?.length, 'Error:', sectionsError);
      
      if (!sections || sections.length === 0) return [];
      
      const sectionMap = new Map(sections.map((s: any) => [s.id, s.section_name]));
      const allSectionIds: string[] = sections.map((s: any) => s.id);
      
      console.log('[MaterialMapping] Processing', allSectionIds.length, 'sections');
      
      // Fetch items from EACH section separately to avoid the 1000 row limit
      const allItems: any[] = [];
      
      // Process sections in batches of 5 to avoid too many parallel requests
      const batchSize = 5;
      for (let i = 0; i < allSectionIds.length; i += batchSize) {
        const batchSectionIds = allSectionIds.slice(i, i + batchSize);
        
        const batchPromises = batchSectionIds.map(async (secId: string) => {
          const { data: items, error: itemsError } = await (supabase as any)
            .from('final_account_items')
            .select('id, item_code, description, unit, supply_rate, install_rate, display_order, section_id')
            .eq('section_id', secId)
            .order('item_code', { ascending: true });
          if (itemsError) {
            console.error('[MaterialMapping] Error fetching items for section', secId, itemsError);
          }
          return items || [];
        });
        
        const batchResults = await Promise.all(batchPromises);
        for (const items of batchResults) {
          allItems.push(...items);
        }
      }
      
      console.log('[MaterialMapping] Total items fetched:', allItems.length);
      
      // Add section_name to each item and sort selected section first
      const result = allItems.map(item => ({
        ...item,
        section_name: sectionMap.get(item.section_id) || 'Unknown',
        _isSelectedSection: item.section_id === sectionId
      })).sort((a, b) => {
        // Selected section items first
        if (a._isSelectedSection && !b._isSelectedSection) return -1;
        if (!a._isSelectedSection && b._isSelectedSection) return 1;
        // Then by section name, then by item_code
        const sectionCompare = (a.section_name || '').localeCompare(b.section_name || '');
        if (sectionCompare !== 0) return sectionCompare;
        return (a.item_code || '').localeCompare(b.item_code || '', undefined, { numeric: true });
      }) as FinalAccountItem[];
      
      // Log unique sections in result
      const uniqueSections = new Set(result.map(r => r.section_name));
      console.log('[MaterialMapping] Unique sections in result:', Array.from(uniqueSections));
      
      return result;
    },
    enabled: !!finalAccountId,
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

    if (takeoffCounts?.cables) {
      for (const [type, data] of Object.entries(takeoffCounts.cables)) {
        if (data.count > 0) {
          items.push({ key: `cable_${type}`, label: type, category: 'cable', quantity: Math.round(data.totalLength * 100) / 100, unit: 'm' });
        }
      }
    }

    return items;
  }, [takeoffCounts]);

  // Initialize mappings from existing data
  React.useEffect(() => {
    if (existingMappings && existingMappings.length > 0 && equipmentList.length > 0) {
      const initialMappings: Record<string, { itemId: string; source: 'final_account' | 'master' }> = {};
      
      for (const mapping of existingMappings) {
        const key = `${mapping.equipment_type}_${mapping.equipment_label}`;
        if (mapping.final_account_item_id) {
          initialMappings[key] = { itemId: mapping.final_account_item_id, source: 'final_account' };
        } else if (mapping.master_material_id) {
          initialMappings[key] = { itemId: mapping.master_material_id, source: 'master' };
        }
      }
      
      setMappings(initialMappings);
    }
  }, [existingMappings, equipmentList]);

  // Set initial active category based on available items
  React.useEffect(() => {
    if (equipmentList.length > 0) {
      const hasEquipment = equipmentList.some(i => i.category === 'equipment');
      const hasContainment = equipmentList.some(i => i.category === 'containment');
      const hasCables = equipmentList.some(i => i.category === 'cable');
      
      if (hasEquipment) setActiveCategory('equipment');
      else if (hasContainment) setActiveCategory('containment');
      else if (hasCables) setActiveCategory('cable');
    }
  }, [equipmentList]);

  // Group items by category
  const groupedItems = useMemo(() => ({
    equipment: equipmentList.filter(i => i.category === 'equipment'),
    containment: equipmentList.filter(i => i.category === 'containment'),
    cable: equipmentList.filter(i => i.category === 'cable'),
  }), [equipmentList]);

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

  const handleMappingChange = (equipmentKey: string, optionId: string, source: 'final_account' | 'master') => {
    setMappings(prev => ({
      ...prev,
      [equipmentKey]: { itemId: optionId, source },
    }));
  };

  const handleClearMapping = (equipmentKey: string) => {
    setMappings(prev => {
      const next = { ...prev };
      delete next[equipmentKey];
      return next;
    });
  };

  const handleBulkMap = (optionId: string, source: 'final_account' | 'master') => {
    const newMappings = { ...mappings };
    for (const key of selectedForBulk) {
      newMappings[key] = { itemId: optionId, source };
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

  const selectAllInCategory = () => {
    const categoryItems = groupedItems[activeCategory].map(i => i.key);
    const unmappedItems = categoryItems.filter(k => !mappings[k]);
    setSelectedForBulk(unmappedItems);
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

      if (mappingsToSave.length > 0) {
        // Use upsert to handle existing mappings - constraint is on project_id, equipment_type, equipment_label
        const { error } = await supabase
          .from('floor_plan_material_mappings')
          .upsert(mappingsToSave, { 
            onConflict: 'project_id,equipment_type,equipment_label',
            ignoreDuplicates: false 
          });
        if (error) throw error;
      }

      return mappingsToSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-material-mappings'] });
      
      const finalMappings: MaterialMapping[] = equipmentList.map(item => {
        const mapping = mappings[item.key];
        // Get the section_id from the mapped FA item
        const faItem = mapping?.source === 'final_account' 
          ? finalAccountItems?.find(fa => fa.id === mapping.itemId)
          : undefined;
        
        return {
          equipmentType: item.category,
          equipmentLabel: item.label,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          finalAccountItemId: mapping?.source === 'final_account' ? mapping.itemId : undefined,
          finalAccountSectionId: faItem?.section_id,
          masterMaterialId: mapping?.source === 'master' ? mapping.itemId : undefined,
        };
      });
      
      onMappingsComplete(finalMappings);
    },
    onError: (error) => {
      toast.error(`Failed to save mappings: ${error.message}`);
    },
  });

  const getMappedOption = (key: string): CombinedOption | undefined => {
    const mapping = mappings[key];
    if (!mapping) return undefined;
    return combinedItemOptions.find(o => o.id === mapping.itemId);
  };

  const mappedCount = Object.keys(mappings).length;
  const totalCount = equipmentList.length;

  const categoryStats = useMemo(() => ({
    equipment: {
      total: groupedItems.equipment.length,
      mapped: groupedItems.equipment.filter(i => mappings[i.key]).length,
    },
    containment: {
      total: groupedItems.containment.length,
      mapped: groupedItems.containment.filter(i => mappings[i.key]).length,
    },
    cable: {
      total: groupedItems.cable.length,
      mapped: groupedItems.cable.filter(i => mappings[i.key]).length,
    },
  }), [groupedItems, mappings]);

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

  const SearchableItemSelect = ({ item, onSelect }: { item: EquipmentItem; onSelect: (id: string, source: 'final_account' | 'master') => void }) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const mapped = getMappedOption(item.key);

    // Group and filter items based on search
    const { groupedItems, totalCount } = useMemo(() => {
      const itemsBySection = new Map<string, FinalAccountItem[]>();
      let selectedSectionName: string | null = null;
      const search = searchTerm.toLowerCase();
      
      // Filter and group final account items
      for (const fa of (finalAccountItems || [])) {
        // Apply search filter
        if (search && 
            !fa.description?.toLowerCase().includes(search) && 
            !fa.item_code?.toLowerCase().includes(search) &&
            !fa.section_name?.toLowerCase().includes(search)) {
          continue;
        }
        
        const sectionName = fa.section_name || 'Unknown Section';
        if (!itemsBySection.has(sectionName)) {
          itemsBySection.set(sectionName, []);
        }
        itemsBySection.get(sectionName)!.push(fa);
        if (fa._isSelectedSection && !selectedSectionName) {
          selectedSectionName = sectionName;
        }
      }
      
      // Sort sections - selected section first, then alphabetically
      const sortedSections = Array.from(itemsBySection.entries()).sort(([a], [b]) => {
        if (a === selectedSectionName) return -1;
        if (b === selectedSectionName) return 1;
        return a.localeCompare(b);
      });
      
      // Count total items
      const total = sortedSections.reduce((sum, [, items]) => sum + items.length, 0);
      
      return { 
        groupedItems: sortedSections, 
        totalCount: total,
        selectedSectionName 
      };
    }, [finalAccountItems, searchTerm]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between text-left font-normal h-auto min-h-[40px] py-2 ${mapped ? 'border-primary/50 bg-primary/5' : ''}`}
          >
            {mapped ? (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {mapped.source === 'final_account' ? 'FA' : 'MM'}
                  </Badge>
                  <span className="truncate text-sm">{mapped.label}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  {mapped.sectionName && (
                    <span className="text-primary/70">{mapped.sectionName}</span>
                  )}
                  <span>R{mapped.rate.toFixed(2)}/{mapped.unit}</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Select BOQ item...</span>
            )}
            <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0 bg-popover z-[100]" align="start">
          <div className="flex flex-col">
            {/* Search input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {searchTerm && (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Results count */}
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-b bg-muted/50">
              {totalCount} items in {groupedItems.length} sections
              {finalAccountItems && ` (${finalAccountItems.length} total)`}
            </div>
            
            {/* Scrollable items list */}
            <ScrollArea className="h-[350px]">
              {groupedItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No items found matching "{searchTerm}"
                </div>
              ) : (
                <div className="p-1">
                  {groupedItems.map(([sectionName, items]) => (
                    <div key={sectionName} className="mb-2">
                      <div className={`px-2 py-1.5 text-xs font-medium sticky top-0 bg-popover ${
                        items[0]?._isSelectedSection ? 'text-primary font-semibold' : 'text-muted-foreground'
                      }`}>
                        {sectionName}
                        {items[0]?._isSelectedSection && ' (Selected)'}
                        <span className="ml-1 opacity-60">({items.length})</span>
                      </div>
                      {items.map((fa) => (
                        <div
                          key={fa.id}
                          onClick={() => {
                            onSelect(fa.id, 'final_account');
                            setOpen(false);
                            setSearchTerm('');
                          }}
                          className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                            mappings[item.key]?.itemId === fa.id ? 'bg-accent/50' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground shrink-0">{fa.item_code}</span>
                              <span className="truncate">{fa.description}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              R{((fa.supply_rate || 0) + (fa.install_rate || 0)).toFixed(2)}/{fa.unit}
                            </div>
                          </div>
                          {mappings[item.key]?.itemId === fa.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {/* Master Materials section */}
                  {masterMaterials && masterMaterials.length > 0 && (!searchTerm || 
                    masterMaterials.some(mm => 
                      mm.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      mm.material_code?.toLowerCase().includes(searchTerm.toLowerCase())
                    )) && (
                    <div className="mb-2 border-t pt-2">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground sticky top-0 bg-popover">
                        Master Materials
                      </div>
                      {masterMaterials
                        .filter(mm => !searchTerm || 
                          mm.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mm.material_code?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .slice(0, 100)
                        .map((mm) => (
                          <div
                            key={mm.id}
                            onClick={() => {
                              onSelect(mm.id, 'master');
                              setOpen(false);
                              setSearchTerm('');
                            }}
                            className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                              mappings[item.key]?.itemId === mm.id ? 'bg-accent/50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground shrink-0">{mm.material_code}</span>
                                <span className="truncate">{mm.material_name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                R{((mm.standard_supply_cost || 0) + (mm.standard_install_cost || 0)).toFixed(2)}/{mm.unit}
                              </div>
                            </div>
                            {mappings[item.key]?.itemId === mm.id && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
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

      {/* Category Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['equipment', 'containment', 'cable'] as const).map((cat) => {
          const stats = categoryStats[cat];
          if (stats.total === 0) return null;
          
          const labels = { equipment: 'Equipment', containment: 'Containment', cable: 'Cables' };
          const isComplete = stats.mapped === stats.total;
          
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                activeCategory === cat 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              {labels[cat]}
              <span className={`text-xs ${activeCategory === cat ? 'opacity-80' : 'text-muted-foreground'}`}>
                {stats.mapped}/{stats.total}
              </span>
              {isComplete && <Check className="h-3 w-3" />}
            </button>
          );
        })}
      </div>

      {/* Bulk Action Bar */}
      {groupedItems[activeCategory].length > 1 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedForBulk.length === groupedItems[activeCategory].filter(i => !mappings[i.key]).length && selectedForBulk.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  selectAllInCategory();
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
                            onSelect={() => handleBulkMap(fa.id, 'final_account')}
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
                            onSelect={() => handleBulkMap(mm.id, 'master')}
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

      {/* Items List */}
      <ScrollArea className="h-[280px]">
        <div className="space-y-2 pr-4">
          {groupedItems[activeCategory].map(item => (
            <div 
              key={item.key} 
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                mappings[item.key] ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              {/* Checkbox for bulk selection */}
              {!mappings[item.key] && (
                <input
                  type="checkbox"
                  checked={selectedForBulk.includes(item.key)}
                  onChange={() => toggleBulkSelect(item.key)}
                  className="mt-2 rounded border-muted-foreground/50"
                />
              )}
              {mappings[item.key] && (
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
                <SearchableItemSelect 
                  item={item} 
                  onSelect={(id, source) => handleMappingChange(item.key, id, source)}
                />
              </div>

              {/* Clear button */}
              {mappings[item.key] && (
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