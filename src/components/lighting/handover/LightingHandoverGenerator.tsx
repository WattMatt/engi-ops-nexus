import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, Download, Loader2, Package, Lightbulb, 
  Shield, Clock, Upload, Check, AlertCircle, FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSvgPdfReport } from '@/hooks/useSvgPdfReport';
import { buildLightingReportPdf, type LightingReportPdfData, type LightingTenantSchedule, type LightingFittingSpec } from '@/utils/svg-pdf/lightingReportPdfBuilder';
import { buildWarrantySchedulePdf, type WarrantySchedulePdfData, type WarrantyFitting } from '@/utils/svg-pdf/warrantySchedulePdfBuilder';
import { svgPagesToPdfBlob } from '@/utils/svg-pdf/svgToPdfEngine';
import type { StandardCoverPageData } from '@/utils/svg-pdf/sharedSvgHelpers';

interface LightingHandoverGeneratorProps {
  projectId: string | null;
}

interface FittingWithSchedule {
  fitting_id: string;
  fitting_code: string;
  model_name: string;
  manufacturer: string | null;
  wattage: number | null;
  warranty_years: number | null;
  warranty_terms: string | null;
  spec_sheet_url: string | null;
  total_quantity: number;
  tenant_count: number;
}

export const LightingHandoverGenerator: React.FC<LightingHandoverGeneratorProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const { fetchCompanyData } = useSvgPdfReport();
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [includeSpecSheets, setIncludeSpecSheets] = useState(true);
  const [includeWarranty, setIncludeWarranty] = useState(true);
  const [selectedFittings, setSelectedFittings] = useState<Set<string>>(new Set());

  // Fetch project info
  const { data: project } = useQuery({
    queryKey: ['project-handover', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('name, project_number')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch fittings used in project with warranty info
  const { data: fittings = [], isLoading } = useQuery({
    queryKey: ['lighting-handover-fittings', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data: schedules, error } = await supabase
        .from('project_lighting_schedules')
        .select(`
          fitting_id,
          quantity,
          tenant_id,
          lighting_fittings (
            id,
            fitting_code,
            model_name,
            manufacturer,
            wattage,
            warranty_years,
            warranty_terms,
            spec_sheet_url
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const fittingMap = new Map<string, FittingWithSchedule>();
      const tenantSets = new Map<string, Set<string>>();

      (schedules || []).forEach(schedule => {
        const fitting = schedule.lighting_fittings as any;
        if (!fitting) return;

        const fittingId = fitting.id;
        if (!tenantSets.has(fittingId)) {
          tenantSets.set(fittingId, new Set());
        }
        tenantSets.get(fittingId)!.add(schedule.tenant_id);

        const existing = fittingMap.get(fittingId);
        if (existing) {
          existing.total_quantity += schedule.quantity || 1;
        } else {
          fittingMap.set(fittingId, {
            fitting_id: fittingId,
            fitting_code: fitting.fitting_code,
            model_name: fitting.model_name,
            manufacturer: fitting.manufacturer,
            wattage: fitting.wattage,
            warranty_years: fitting.warranty_years,
            warranty_terms: fitting.warranty_terms,
            spec_sheet_url: fitting.spec_sheet_url,
            total_quantity: schedule.quantity || 1,
            tenant_count: 0,
          });
        }
      });

      const results = Array.from(fittingMap.values());
      results.forEach(f => {
        f.tenant_count = tenantSets.get(f.fitting_id)?.size || 0;
      });

      return results;
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (fittings.length > 0 && selectedFittings.size === 0) {
      setSelectedFittings(new Set(fittings.map(f => f.fitting_id)));
    }
  }, [fittings]);

  const toggleFitting = (fittingId: string) => {
    const newSet = new Set(selectedFittings);
    if (newSet.has(fittingId)) {
      newSet.delete(fittingId);
    } else {
      newSet.add(fittingId);
    }
    setSelectedFittings(newSet);
  };

  const selectAll = () => setSelectedFittings(new Set(fittings.map(f => f.fitting_id)));
  const selectNone = () => setSelectedFittings(new Set());

  // Save document to handover
  const saveToHandover = useMutation({
    mutationFn: async ({ blob, fileName, documentType }: { blob: Blob; fileName: string; documentType: string }) => {
      if (!projectId) throw new Error('No project selected');

      const filePath = `handover/${projectId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('handover-documents')
        .upload(filePath, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const fileUrl = `${supabaseUrl}/storage/v1/object/authenticated/handover-documents/${filePath}`;

      const { data: userData } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from('handover_documents' as any)
        .insert({
          project_id: projectId,
          document_name: fileName,
          document_type: documentType,
          source_type: 'general',
          file_url: fileUrl,
          file_size: blob.size,
          added_by: userData.user?.id,
          notes: `Generated lighting ${documentType === 'lighting' ? 'schedule' : 'warranty schedule'} - ${format(new Date(), 'dd MMM yyyy')}`,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-documents', projectId] });
    },
  });

  const handleGenerateHandover = async () => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    if (selectedFittings.size === 0) {
      toast.error('Please select at least one fitting');
      return;
    }

    setIsGenerating(true);
    try {
      const companyData = await fetchCompanyData();
      const generatedDocs: string[] = [];

      // Generate lighting schedule via SVG engine
      if (includeSchedule) {
        const { data: tenants } = await supabase.from('tenants').select('id, shop_name, shop_number, area').eq('project_id', projectId);
        const { data: schedules } = await supabase
          .from('project_lighting_schedules')
          .select(`id, tenant_id, quantity, approval_status, lighting_fittings (manufacturer, model_number, wattage, supply_cost, install_cost)`)
          .eq('project_id', projectId);

        const scheduleData: LightingTenantSchedule[] = (tenants || []).map(tenant => {
          const tenantItems = (schedules || [])
            .filter(s => s.tenant_id === tenant.id)
            .map(s => {
              const fitting = s.lighting_fittings as any;
              const wattage = fitting?.wattage || 0;
              const quantity = s.quantity || 1;
              return {
                fittingCode: fitting?.model_number || 'N/A',
                description: fitting ? `${fitting.manufacturer} ${fitting.model_number}` : 'Unknown',
                quantity, wattage,
                totalWattage: wattage * quantity,
                status: s.approval_status || 'pending',
                supplyCost: (fitting?.supply_cost || 0) * quantity,
                installCost: (fitting?.install_cost || 0) * quantity,
              };
            });
          return { shopNumber: tenant.shop_number || '', shopName: tenant.shop_name || 'Unnamed', area: tenant.area || 0, items: tenantItems };
        }).filter(t => t.items.length > 0);

        const lightingPdfData: LightingReportPdfData = {
          coverData: {
            ...companyData,
            reportTitle: 'LIGHTING SCHEDULE',
            reportSubtitle: 'Handover Document',
            projectName: project?.name || 'Project',
            projectNumber: project?.project_number || '',
            date: format(new Date(), 'dd MMMM yyyy'),
          } as StandardCoverPageData,
          projectName: project?.name || 'Project',
          sections: {
            executiveSummary: false,
            scheduleByTenant: true,
            specificationSheets: includeSpecSheets,
            costSummary: false,
            energyAnalysis: false,
          },
          schedules: scheduleData,
          specifications: [],
        };

        const svgPages = buildLightingReportPdf(lightingPdfData);
        const { blob } = await svgPagesToPdfBlob(svgPages);
        const fileName = `${project?.project_number || 'Project'}_Lighting_Schedule.pdf`;
        await saveToHandover.mutateAsync({ blob, fileName, documentType: 'lighting' });
        generatedDocs.push('Lighting Schedule');
      }

      // Generate warranty schedule via SVG engine
      if (includeWarranty) {
        const selectedFittingsList = fittings.filter(f => selectedFittings.has(f.fitting_id));
        const warrantyFittings: WarrantyFitting[] = selectedFittingsList.map(f => ({
          fittingCode: f.fitting_code,
          modelName: f.model_name,
          manufacturer: f.manufacturer || '-',
          quantity: f.total_quantity,
          warrantyYears: f.warranty_years || 3,
          warrantyTerms: f.warranty_terms || 'Standard manufacturer warranty',
        }));

        const warrantyData: WarrantySchedulePdfData = {
          coverData: {
            ...companyData,
            reportTitle: 'WARRANTY SCHEDULE',
            reportSubtitle: 'Lighting Fittings',
            projectName: project?.name || 'Project',
            projectNumber: project?.project_number || '',
            date: format(new Date(), 'dd MMMM yyyy'),
          } as StandardCoverPageData,
          projectName: project?.name || 'Project',
          fittings: warrantyFittings,
        };

        const svgPages = buildWarrantySchedulePdf(warrantyData);
        const { blob } = await svgPagesToPdfBlob(svgPages);
        const warrantyFileName = `${project?.project_number || 'Project'}_Lighting_Warranty_Schedule.pdf`;
        await saveToHandover.mutateAsync({ blob, fileName: warrantyFileName, documentType: 'warranties' });
        generatedDocs.push('Warranty Schedule');
      }

      toast.success(`Generated: ${generatedDocs.join(', ')}`);
    } catch (error) {
      console.error('Error generating handover documents:', error);
      toast.error('Failed to generate documents');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!projectId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a project to generate lighting handover documents</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lighting Handover Documents
          </CardTitle>
          <CardDescription>
            Generate lighting schedules, spec sheets, and warranty documentation for project handover
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox id="includeSchedule" checked={includeSchedule} onCheckedChange={(checked) => setIncludeSchedule(checked as boolean)} />
              <div className="space-y-1">
                <Label htmlFor="includeSchedule" className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Lighting Schedule
                </Label>
                <p className="text-xs text-muted-foreground">Complete schedule by tenant with quantities and specifications</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox id="includeSpecSheets" checked={includeSpecSheets} onCheckedChange={(checked) => setIncludeSpecSheets(checked as boolean)} />
              <div className="space-y-1">
                <Label htmlFor="includeSpecSheets" className="font-medium flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-green-500" />
                  Specification Sheets
                </Label>
                <p className="text-xs text-muted-foreground">Technical data sheets for each fitting type</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox id="includeWarranty" checked={includeWarranty} onCheckedChange={(checked) => setIncludeWarranty(checked as boolean)} />
              <div className="space-y-1">
                <Label htmlFor="includeWarranty" className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-500" />
                  Warranty Schedule
                </Label>
                <p className="text-xs text-muted-foreground">Warranty periods and terms for all fittings</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fittings Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Fittings to Include</CardTitle>
              <CardDescription>{selectedFittings.size} of {fittings.length} fittings selected</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="outline" size="sm" onClick={selectNone}>Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : fittings.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No lighting fittings found for this project</p>
              <p className="text-xs text-muted-foreground mt-1">Add fittings to the lighting schedule first</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-center">Warranty</TableHead>
                    <TableHead className="text-center">Spec Sheet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fittings.map((fitting) => (
                    <TableRow key={fitting.fitting_id} className={selectedFittings.has(fitting.fitting_id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox checked={selectedFittings.has(fitting.fitting_id)} onCheckedChange={() => toggleFitting(fitting.fitting_id)} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{fitting.fitting_code}</TableCell>
                      <TableCell className="font-medium">{fitting.model_name}</TableCell>
                      <TableCell className="text-muted-foreground">{fitting.manufacturer || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{fitting.total_quantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {fitting.warranty_years || 3} yrs
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {fitting.spec_sheet_url ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3 text-green-500" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Missing
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Ready to generate</p>
              <p className="text-sm text-muted-foreground">Documents will be saved to Handover Documents</p>
            </div>
            <Button 
              size="lg" 
              onClick={handleGenerateHandover}
              disabled={isGenerating || selectedFittings.size === 0 || (!includeSchedule && !includeWarranty)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Handover Documents
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
