/**
 * Connected Loads Step - Enhanced Multi-Method Load Identification
 * Supports 7 methods for identifying and calculating connected loads
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadMethodSelector, type LoadMethod } from '../../phase1/LoadMethodSelector';
import { LoadScheduleTable, type LoadItem } from '../../phase1/LoadScheduleTable';
import { CategoryTotalsCard } from '../../phase1/CategoryTotalsCard';
import { SANS204LoadCalculator, type SANS204Entry } from '../../phase1/SANS204LoadCalculator';
import { SANS10142LoadCalculator, type SANS10142Entry } from '../../phase1/SANS10142LoadCalculator';
import { ADMDResidentialCalculator, type ADMDEntry } from '../../phase1/ADMDResidentialCalculator';
import { LoadCalculationSummary } from '../../phase1/LoadCalculationSummary';
import type { StepContentProps } from '../StepContentRegistry';

export function ConnectedLoadsStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  // Load method state
  const [method, setMethod] = useState<LoadMethod>(
    (document?.load_entry_method as LoadMethod) || 'total'
  );
  
  // Direct entry state
  const [totalLoad, setTotalLoad] = useState(
    document?.total_connected_load?.toString() || ''
  );
  
  // Itemized schedule state
  const [loadItems, setLoadItems] = useState<LoadItem[]>(
    document?.load_schedule_items || []
  );
  
  // Itemized totals (updated via callback)
  const [itemizedTotals, setItemizedTotals] = useState({ kva: 0, maxDemand: 0 });
  
  // Category totals (updated via callback)
  const [categoryCalcTotals, setCategoryCalcTotals] = useState({ kva: 0, maxDemand: 0 });
  
  // SANS 204 entries
  const [sans204Entries, setSans204Entries] = useState<SANS204Entry[]>(
    document?.sans204_entries || []
  );
  
  // SANS 10142-1 entries
  const [sans10142Entries, setSans10142Entries] = useState<SANS10142Entry[]>(
    document?.sans10142_entries || []
  );
  
  // ADMD entries
  const [admdEntries, setAdmdEntries] = useState<ADMDEntry[]>(
    document?.admd_entries || []
  );

  // Callbacks for child components
  const handleItemizedTotalChange = useCallback((totalKva: number, maxDemandKva: number) => {
    setItemizedTotals({ kva: totalKva, maxDemand: maxDemandKva });
  }, []);

  const handleCategoryTotalChange = useCallback((totalKva: number, maxDemandKva: number) => {
    setCategoryCalcTotals({ kva: totalKva, maxDemand: maxDemandKva });
  }, []);

  // Calculate connected load based on active method
  const calculateConnectedLoad = useCallback((): number => {
    switch (method) {
      case 'total':
        return parseFloat(totalLoad) || 0;
      case 'itemized':
        return itemizedTotals.kva;
      case 'category':
        return categoryCalcTotals.kva;
      case 'sans204':
        return sans204Entries.reduce((sum, e) => sum + e.totalVa, 0) / 1000;
      case 'sans10142':
        return sans10142Entries.reduce((sum, e) => sum + e.totalVa, 0) / 1000;
      case 'admd':
        // For ADMD, connected load is units × ADMD (before diversity)
        return admdEntries.reduce((sum, e) => sum + (e.numberOfUnits * e.admdPerUnit), 0);
      case 'external':
        // External linking - would be populated from sync
        return document?.calculated_connected_load || 0;
      default:
        return 0;
    }
  }, [method, totalLoad, itemizedTotals, categoryCalcTotals, sans204Entries, sans10142Entries, admdEntries, document]);

  // Calculate max demand (after diversity)
  const calculateMaxDemand = useCallback((): number => {
    const diversity = document?.diversity_factor || 0.8;
    
    switch (method) {
      case 'itemized':
        return itemizedTotals.maxDemand;
      case 'category':
        return categoryCalcTotals.maxDemand;
      case 'admd':
        // ADMD already applies diversity per entry
        return admdEntries.reduce((sum, e) => sum + e.totalDemand, 0);
      default:
        return calculateConnectedLoad() * diversity;
    }
  }, [method, itemizedTotals, categoryCalcTotals, admdEntries, calculateConnectedLoad, document?.diversity_factor]);

  const connectedLoad = calculateConnectedLoad();
  const maxDemand = calculateMaxDemand();

  // Build breakdown for summary
  const getBreakdown = () => {
    switch (method) {
      case 'sans204':
        return sans204Entries.map(e => ({
          category: `${e.buildingClass} - ${e.description || 'Unnamed'}`,
          value: e.totalVa / 1000,
          unit: 'kVA',
        }));
      case 'sans10142':
        return sans10142Entries.map(e => ({
          category: `${e.buildingType} - ${e.description || 'Unnamed'}`,
          value: e.totalVa / 1000,
          unit: 'kVA',
        }));
      case 'admd':
        return admdEntries.map(e => ({
          category: `${e.unitType} (×${e.numberOfUnits})`,
          value: e.totalDemand,
          unit: 'kVA',
        }));
      default:
        return [];
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        load_entry_method: method,
        total_connected_load: connectedLoad,
        calculated_connected_load: connectedLoad,
        calculated_max_demand: maxDemand,
      };

      // Save method-specific data
      switch (method) {
        case 'itemized':
          updateData.load_schedule_items = loadItems;
          break;
        case 'sans204':
          updateData.sans204_entries = sans204Entries;
          break;
        case 'sans10142':
          updateData.sans10142_entries = sans10142Entries;
          break;
        case 'admd':
          updateData.admd_entries = admdEntries;
          break;
      }

      // Save breakdown for auditing
      updateData.load_calculation_breakdown = {
        method,
        calculatedAt: new Date().toISOString(),
        breakdown: getBreakdown(),
        connectedLoad,
        maxDemand,
      };

      const { error } = await supabase
        .from('bulk_services_documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Load calculation saved');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Render method-specific content
  const renderMethodContent = () => {
    switch (method) {
      case 'total':
        return (
          <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20 space-y-4">
            <Label htmlFor="total-load" className="text-base font-semibold">
              Total Connected Load
            </Label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  id="total-load"
                  type="number"
                  step="0.1"
                  min={0}
                  value={totalLoad}
                  onChange={(e) => setTotalLoad(e.target.value)}
                  placeholder="Enter total connected load"
                  className="text-lg h-12"
                />
              </div>
              <span className="text-lg font-medium text-muted-foreground">kVA</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sum of all individual load ratings at 100% capacity
            </p>
          </div>
        );

      case 'itemized':
        return (
          <LoadScheduleTable
            items={loadItems}
            onItemsChange={setLoadItems}
            onTotalChange={handleItemizedTotalChange}
          />
        );

      case 'category':
        return (
          <CategoryTotalsCard
            onTotalChange={handleCategoryTotalChange}
          />
        );

      case 'sans204':
        return (
          <SANS204LoadCalculator
            entries={sans204Entries}
            onEntriesChange={setSans204Entries}
            climaticZone={document?.climatic_zone ? parseInt(document.climatic_zone) : 3}
          />
        );

      case 'sans10142':
        return (
          <SANS10142LoadCalculator
            entries={sans10142Entries}
            onEntriesChange={setSans10142Entries}
          />
        );

      case 'admd':
        return (
          <ADMDResidentialCalculator
            entries={admdEntries}
            onEntriesChange={setAdmdEntries}
          />
        );

      case 'external':
        return (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              External meter linking is available in the "Meter-Shop Linking" sub-tab.
              Use this method to link real demand profiles from existing buildings.
            </AlertDescription>
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Method Selector */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Select Calculation Method</Label>
        <LoadMethodSelector
          method={method}
          onMethodChange={setMethod}
          projectType="commercial"
        />
      </div>

      <Separator />

      {/* Method-Specific Content */}
      <div className="space-y-4">
        {renderMethodContent()}
      </div>

      {/* Summary */}
      {connectedLoad > 0 && (
        <>
          <Separator />
          <LoadCalculationSummary
            method={method}
            connectedLoad={connectedLoad}
            maxDemand={maxDemand}
            diversityFactor={document?.diversity_factor || 0.8}
            breakdown={getBreakdown()}
            projectArea={document?.project_area}
            typicalRange={{ min: 50, max: 200 }}
          />
        </>
      )}

      {/* Current Saved Value */}
      {document?.total_connected_load && document.total_connected_load !== connectedLoad && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
          <span className="text-sm text-amber-800">Previous saved value:</span>
          <span className="text-lg font-bold text-amber-900">
            {document.total_connected_load.toLocaleString()} kVA
          </span>
        </div>
      )}

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving || connectedLoad <= 0}
        className="w-full"
        size="lg"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Load Calculation'}
      </Button>
    </div>
  );
}
