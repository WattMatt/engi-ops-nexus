import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Link2, Send, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialMappingStep, MaterialMapping } from './MaterialMappingStep';

interface LinkToFinalAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  floorPlanId: string | null;
  floorPlanName: string | null;
  projectId: string | null;
  takeoffCounts?: TakeoffCounts;
}

export interface TakeoffCounts {
  equipment: Record<string, number>;
  containment: Record<string, number>;
  cables: Record<string, { count: number; totalLength: number }>;
}

// Type definitions for query results
type FinalAccountResult = { id: string; project_id: string; account_number: string; account_name: string } | null;
type BillResult = { id: string; bill_number: number; bill_name: string; display_order: number };
type SectionResult = { id: string; section_code: string; section_name: string; display_order: number };
type ShopResult = { id: string; shop_number: string; shop_name: string };

type DialogStep = 'select-location' | 'map-materials' | 'confirm';

// Helper functions with explicit any casts to avoid TS2589
async function fetchFinalAccount(projectId: string): Promise<FinalAccountResult> {
  const { data, error } = await (supabase as any)
    .from('final_accounts')
    .select('id, project_id, account_number, account_name')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchBills(accountId: string): Promise<BillResult[]> {
  const { data, error } = await (supabase as any)
    .from('final_account_bills')
    .select('id, bill_number, bill_name, display_order')
    .eq('final_account_id', accountId)
    .order('bill_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchSections(billId: string): Promise<SectionResult[]> {
  const { data, error } = await (supabase as any)
    .from('final_account_sections')
    .select('id, section_code, section_name, display_order')
    .eq('bill_id', billId)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

async function fetchShops(sectionId: string): Promise<ShopResult[]> {
  const { data, error } = await (supabase as any)
    .from('final_account_shop_subsections')
    .select('id, shop_number, shop_name')
    .eq('section_id', sectionId)
    .order('shop_number');
  if (error) throw error;
  return data || [];
}

export const LinkToFinalAccountDialog: React.FC<LinkToFinalAccountDialogProps> = ({
  isOpen,
  onClose,
  floorPlanId,
  floorPlanName,
  projectId,
  takeoffCounts
}) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<DialogStep>('select-location');
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [transferTakeoffs, setTransferTakeoffs] = useState(false);
  const [materialMappings, setMaterialMappings] = useState<MaterialMapping[]>([]);

  // Reset state when dialog closes
  const handleClose = () => {
    setStep('select-location');
    setSelectedBillId('');
    setSelectedSectionId('');
    setSelectedShopId('');
    setTransferTakeoffs(false);
    setMaterialMappings([]);
    onClose();
  };

  // Fetch final account for project
  const { data: finalAccount } = useQuery({
    queryKey: ['final-account-for-linking', projectId],
    queryFn: () => fetchFinalAccount(projectId!),
    enabled: !!projectId && isOpen,
  });

  // Fetch bills
  const { data: bills } = useQuery({
    queryKey: ['final-account-bills', finalAccount?.id],
    queryFn: () => fetchBills(finalAccount!.id),
    enabled: !!finalAccount?.id,
  });

  // Fetch sections for selected bill
  const { data: sections } = useQuery({
    queryKey: ['final-account-sections', selectedBillId],
    queryFn: () => fetchSections(selectedBillId),
    enabled: !!selectedBillId,
  });

  // Fetch shop subsections for selected section
  const { data: shops } = useQuery({
    queryKey: ['final-account-shops', selectedSectionId],
    queryFn: () => fetchShops(selectedSectionId),
    enabled: !!selectedSectionId,
  });

  // Create reference drawing mutation
  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!floorPlanId || !finalAccount?.id) throw new Error('Missing required data');

      const { data: user } = await supabase.auth.getUser();

      // Create reference drawing record
      const { data: refDrawing, error: refError } = await supabase
        .from('final_account_reference_drawings')
        .insert({
          final_account_id: finalAccount.id,
          section_id: selectedSectionId || null,
          shop_subsection_id: selectedShopId || null,
          floor_plan_id: floorPlanId,
          drawing_name: floorPlanName || 'Floor Plan',
          takeoffs_transferred: transferTakeoffs,
          transferred_at: transferTakeoffs ? new Date().toISOString() : null,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (refError) throw refError;

      // Update floor plan with linked section
      const { error: updateError } = await supabase
        .from('floor_plan_projects')
        .update({
          linked_final_account_id: finalAccount.id,
          linked_section_id: selectedSectionId || null,
          linked_shop_subsection_id: selectedShopId || null,
        })
        .eq('id', floorPlanId);

      if (updateError) throw updateError;

      // Transfer take-offs if requested
      if (transferTakeoffs && takeoffCounts && selectedSectionId) {
        await transferTakeoffsToFinalAccount(
          selectedSectionId,
          selectedShopId || null,
          floorPlanId,
          refDrawing.id,
          takeoffCounts,
          materialMappings
        );
      }

      return refDrawing;
    },
    onSuccess: () => {
      toast.success(
        transferTakeoffs 
          ? 'Floor plan linked and take-offs transferred!' 
          : 'Floor plan linked as reference drawing!'
      );
      queryClient.invalidateQueries({ queryKey: ['final-account-reference-drawings'] });
      queryClient.invalidateQueries({ queryKey: ['floor-plan-projects'] });
      handleClose();
    },
    onError: (error) => {
      toast.error(`Failed to link: ${error.message}`);
    },
  });

  // Transfer take-offs to final account items with mappings
  const transferTakeoffsToFinalAccount = async (
    sectionId: string,
    shopSubsectionId: string | null,
    floorPlanId: string,
    refDrawingId: string,
    counts: TakeoffCounts,
    mappings: MaterialMapping[]
  ) => {
    const itemsToInsert: any[] = [];
    const itemsToUpdate: Array<{ id: string; additionalQty: number }> = [];

    // Build a mapping lookup
    const mappingLookup = new Map<string, MaterialMapping>();
    for (const mapping of mappings) {
      mappingLookup.set(`${mapping.category}_${mapping.equipmentLabel}`, mapping);
    }

    // Process equipment
    for (const [equipType, count] of Object.entries(counts.equipment)) {
      if (count <= 0) continue;
      
      const mapping = mappingLookup.get(`equipment_${equipType}`);
      
      if (mapping?.finalAccountItemId) {
        // Update existing FA item
        itemsToUpdate.push({ id: mapping.finalAccountItemId, additionalQty: count });
      } else {
        // Create new item
        itemsToInsert.push({
          section_id: sectionId,
          shop_subsection_id: shopSubsectionId,
          item_code: equipType.toUpperCase().replace(/\s+/g, '_').substring(0, 10),
          description: equipType,
          unit: 'NO',
          contract_quantity: 0,
          final_quantity: count,
          supply_rate: 0,
          install_rate: 0,
          contract_amount: 0,
          final_amount: 0,
          source_floor_plan_id: floorPlanId,
          source_reference_drawing_id: refDrawingId,
          master_material_id: mapping?.masterMaterialId || null,
        });
      }
    }

    // Process containment
    for (const [containType, length] of Object.entries(counts.containment)) {
      if (length <= 0) continue;
      
      const mapping = mappingLookup.get(`containment_${containType}`);
      const qty = Math.round(length * 100) / 100;
      
      if (mapping?.finalAccountItemId) {
        itemsToUpdate.push({ id: mapping.finalAccountItemId, additionalQty: qty });
      } else {
        itemsToInsert.push({
          section_id: sectionId,
          shop_subsection_id: shopSubsectionId,
          item_code: containType.toUpperCase().replace(/\s+/g, '_').substring(0, 10),
          description: containType,
          unit: 'M',
          contract_quantity: 0,
          final_quantity: qty,
          supply_rate: 0,
          install_rate: 0,
          contract_amount: 0,
          final_amount: 0,
          source_floor_plan_id: floorPlanId,
          source_reference_drawing_id: refDrawingId,
          master_material_id: mapping?.masterMaterialId || null,
        });
      }
    }

    // Process cables
    for (const [cableType, data] of Object.entries(counts.cables)) {
      if (data.count <= 0) continue;
      
      const mapping = mappingLookup.get(`cable_${cableType}`);
      const qty = Math.round(data.totalLength * 100) / 100;
      
      if (mapping?.finalAccountItemId) {
        itemsToUpdate.push({ id: mapping.finalAccountItemId, additionalQty: qty });
      } else {
        itemsToInsert.push({
          section_id: sectionId,
          shop_subsection_id: shopSubsectionId,
          item_code: cableType.toUpperCase().replace(/\s+/g, '_').substring(0, 10),
          description: `Cable: ${cableType}`,
          unit: 'M',
          contract_quantity: 0,
          final_quantity: qty,
          supply_rate: 0,
          install_rate: 0,
          contract_amount: 0,
          final_amount: 0,
          source_floor_plan_id: floorPlanId,
          source_reference_drawing_id: refDrawingId,
          master_material_id: mapping?.masterMaterialId || null,
        });
      }
    }

    // Insert new items
    if (itemsToInsert.length > 0) {
      const { error } = await supabase
        .from('final_account_items')
        .insert(itemsToInsert);
      if (error) throw error;
    }

    // Update existing items
    for (const update of itemsToUpdate) {
      const { error } = await (supabase as any)
        .from('final_account_items')
        .update({ 
          final_quantity: (supabase as any).rpc('coalesce', { value: 'final_quantity', default_val: 0 }) 
        })
        .eq('id', update.id);
      
      // Fallback: fetch and update
      if (error) {
        const { data: existing } = await supabase
          .from('final_account_items')
          .select('final_quantity')
          .eq('id', update.id)
          .single();
        
        if (existing) {
          await supabase
            .from('final_account_items')
            .update({ final_quantity: (existing.final_quantity || 0) + update.additionalQty })
            .eq('id', update.id);
        }
      }
    }
  };

  const hasTakeoffs = useMemo(() => {
    if (!takeoffCounts) return false;
    const equipmentTotal = Object.values(takeoffCounts.equipment).reduce((a, b) => a + b, 0);
    const containmentTotal = Object.values(takeoffCounts.containment).reduce((a, b) => a + b, 0);
    const cableTotal = Object.values(takeoffCounts.cables).reduce((a, b) => a + b.count, 0);
    return equipmentTotal > 0 || containmentTotal > 0 || cableTotal > 0;
  }, [takeoffCounts]);

  const handleNextStep = () => {
    if (!selectedSectionId) {
      toast.error('Please select a section');
      return;
    }
    
    if (transferTakeoffs && hasTakeoffs) {
      setStep('map-materials');
    } else {
      linkMutation.mutate();
    }
  };

  const handleMappingsComplete = (mappings: MaterialMapping[]) => {
    setMaterialMappings(mappings);
    linkMutation.mutate();
  };

  const renderStep = () => {
    if (step === 'map-materials' && floorPlanId && projectId && selectedSectionId && takeoffCounts) {
      return (
        <MaterialMappingStep
          projectId={projectId}
          floorPlanId={floorPlanId}
          sectionId={selectedSectionId}
          takeoffCounts={takeoffCounts}
          onMappingsComplete={handleMappingsComplete}
          onBack={() => setStep('select-location')}
        />
      );
    }

    return (
      <>
        <div className="space-y-4 py-4">
          {!finalAccount ? (
            <div className="text-center py-4 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No Final Account found for this project.</p>
              <p className="text-sm">Create a Final Account first.</p>
            </div>
          ) : (
            <>
              {/* Bill Selection */}
              <div className="space-y-2">
                <Label>Bill</Label>
                <Select value={selectedBillId} onValueChange={(v) => {
                  setSelectedBillId(v);
                  setSelectedSectionId('');
                  setSelectedShopId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bill..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bills?.map((bill) => (
                      <SelectItem key={bill.id} value={bill.id}>
                        Bill {bill.bill_number}: {bill.bill_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Selection */}
              {selectedBillId && (
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={selectedSectionId} onValueChange={(v) => {
                    setSelectedSectionId(v);
                    setSelectedShopId('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sections?.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.section_code}: {section.section_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Shop Selection (optional) */}
              {selectedSectionId && shops && shops.length > 0 && (
                <div className="space-y-2">
                  <Label>Shop (Optional)</Label>
                  <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All shops in section..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All shops</SelectItem>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.shop_number}: {shop.shop_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Transfer Take-offs Toggle */}
              {selectedSectionId && hasTakeoffs && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Transfer Take-offs
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-populate Final Account items with quantities from this drawing
                    </p>
                  </div>
                  <Switch
                    checked={transferTakeoffs}
                    onCheckedChange={setTransferTakeoffs}
                  />
                </div>
              )}

              {/* Take-off Preview */}
              {transferTakeoffs && takeoffCounts && (
                <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <div className="font-medium mb-2">Items to transfer:</div>
                  <ul className="space-y-1 text-muted-foreground">
                    {Object.entries(takeoffCounts.equipment).map(([type, count]) => 
                      count > 0 && <li key={type}>• {type}: {count} no.</li>
                    )}
                    {Object.entries(takeoffCounts.containment).map(([type, length]) => 
                      length > 0 && <li key={type}>• {type}: {length.toFixed(1)}m</li>
                    )}
                    {Object.entries(takeoffCounts.cables).map(([type, data]) => 
                      data.count > 0 && <li key={type}>• {type}: {data.count} runs ({data.totalLength.toFixed(1)}m)</li>
                    )}
                  </ul>
                  {transferTakeoffs && (
                    <p className="mt-2 text-xs text-primary">
                      Next step: Map items to BOQ entries for accurate rates
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleNextStep} 
            disabled={linkMutation.isPending || !finalAccount || !selectedSectionId}
          >
            {linkMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Linking...</>
            ) : transferTakeoffs && hasTakeoffs ? (
              <>Next: Map Materials <ArrowRight className="h-4 w-4 ml-2" /></>
            ) : (
              <><Link2 className="h-4 w-4 mr-2" /> Link Drawing</>
            )}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={step === 'map-materials' ? 'sm:max-w-2xl' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {step === 'map-materials' ? 'Map Materials to BOQ' : 'Link to Final Account'}
          </DialogTitle>
          <DialogDescription>
            {step === 'map-materials' 
              ? 'Match floor plan items to existing BOQ or Master Material entries for accurate costing.'
              : (
                <>
                  Link this floor plan as a reference drawing for the Final Account.
                  {floorPlanName && <span className="block mt-1 font-medium text-foreground">"{floorPlanName}"</span>}
                </>
              )
            }
          </DialogDescription>
        </DialogHeader>

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};
