/**
 * Connected Loads Step - Enhanced Multi-Method Load Identification
 * Supports 7 methods for identifying and calculating connected loads
 */

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Info, MapPin, Ruler, AlertCircle } from 'lucide-react';
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
  
  // Site context state
  const [projectArea, setProjectArea] = useState<number>(document?.project_area || 0);
  const climaticZone = document?.climatic_zone ? parseInt(document.climatic_zone) : null;
  const climaticZoneCity = document?.climatic_zone_city || null;
  
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

  // Sync project area from document
  useEffect(() => {
    if (document?.project_area) {
      setProjectArea(document.project_area);
    }
  }, [document?.project_area]);

  // Check if area-based methods are available
  const areaBasedMethods: LoadMethod[] = ['sans204', 'sans10142'];
  const needsArea = areaBasedMethods.includes(method);
  const needsZone = method === 'sans204';
  const hasRequiredContext = (!needsArea || projectArea > 0) && (!needsZone || climaticZone);

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
        project_area: projectArea || null,
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
      {/* Site Context Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Site Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Area */}
            <div className="space-y-2">
              <Label htmlFor="project-area" className="text-sm flex items-center gap-2">
                <Ruler className="h-3.5 w-3.5" />
                Site Area
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="project-area"
                  type="number"
                  min={0}
                  value={projectArea || ''}
                  onChange={(e) => setProjectArea(parseFloat(e.target.value) || 0)}
                  placeholder="Enter site area"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">m²</span>
              </div>
              {needsArea && !projectArea && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Required for {method === 'sans204' ? 'SANS 204' : 'SANS 10142-1'} calculations
                </p>
              )}
            </div>

            {/* Climatic Zone */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Location & Climatic Zone
              </Label>
              {climaticZone && climaticZoneCity ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-background">
                  <Badge variant="secondary">Zone {climaticZone}</Badge>
                  <span className="text-sm">{climaticZoneCity}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Set location in Overview tab</span>
                </div>
              )}
              {needsZone && !climaticZone && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Required for SANS 204 VA/m² lookup
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          {projectArea > 0 && (
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Site Area</p>
                <p className="font-bold">{projectArea.toLocaleString()} m²</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Climatic Zone</p>
                <p className="font-bold">{climaticZone ? `Zone ${climaticZone}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Est. Load Density</p>
                <p className="font-bold">
                  {connectedLoad > 0 && projectArea > 0 
                    ? `${((connectedLoad * 1000) / projectArea).toFixed(1)} VA/m²`
                    : '—'
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Missing Context Warning */}
      {!hasRequiredContext && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!projectArea && needsArea && 'Enter the site area above to use this calculation method. '}
            {!climaticZone && needsZone && 'Set the climatic zone in the Overview tab to get accurate VA/m² values.'}
          </AlertDescription>
        </Alert>
      )}

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
            projectArea={projectArea}
            typicalRange={{ min: 50, max: 200 }}
          />
        </>
      )}

      {/* Current Saved Value */}
      {document?.total_connected_load && document.total_connected_load !== connectedLoad && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
          <span className="text-sm text-muted-foreground">Previous saved value:</span>
          <span className="text-lg font-bold">
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
