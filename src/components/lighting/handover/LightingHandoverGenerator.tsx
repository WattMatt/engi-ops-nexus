import React, { useState } from 'react';
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
import { generateLightingReportPDF } from '@/utils/lightingReportPDF';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

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

      // Aggregate by fitting
      const fittingMap = new Map<string, FittingWithSchedule>();
      const tenantSets = new Map<string, Set<string>>();

      (schedules || []).forEach((schedule: any) => {
        const fitting = schedule.lighting_fittings;
        if (!fitting) return;

        const existing = fittingMap.get(fitting.id);
        const tenantSet = tenantSets.get(fitting.id) || new Set();
        
        if (schedule.tenant_id) {
          tenantSet.add(schedule.tenant_id);
        }
        tenantSets.set(fitting.id, tenantSet);

        if (existing) {
          existing.total_quantity += schedule.quantity || 0;
          existing.tenant_count = tenantSet.size;
        } else {
          fittingMap.set(fitting.id, {
            fitting_id: fitting.id,
            fitting_code: fitting.fitting_code,
            model_name: fitting.model_name,
            manufacturer: fitting.manufacturer,
            wattage: fitting.wattage,
            warranty_years: fitting.warranty_years,
            warranty_terms: fitting.warranty_terms,
            spec_sheet_url: fitting.spec_sheet_url,
            total_quantity: schedule.quantity || 0,
            tenant_count: tenantSet.size,
          });
        }
      });

      return Array.from(fittingMap.values());
    },
    enabled: !!projectId,
  });

  // Select all fittings on load
  React.useEffect(() => {
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

  const selectAll = () => {
    setSelectedFittings(new Set(fittings.map(f => f.fitting_id)));
  };

  const selectNone = () => {
    setSelectedFittings(new Set());
  };

  // Generate warranty schedule PDF
  const generateWarrantySchedulePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('LIGHTING WARRANTY SCHEDULE', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(project?.name || 'Project', pageWidth / 2, 30, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    
    // Project info
    let yPos = 55;
    doc.setFontSize(10);
    doc.text(`Project Number: ${project?.project_number || 'N/A'}`, 20, yPos);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 70, yPos);
    
    yPos += 15;

    // Warranty table
    const selectedFittingsList = fittings.filter(f => selectedFittings.has(f.fitting_id));
    
    const tableData = selectedFittingsList.map(f => [
      f.fitting_code,
      f.model_name,
      f.manufacturer || '-',
      f.total_quantity.toString(),
      `${f.warranty_years || 3} years`,
      f.warranty_terms || 'Standard manufacturer warranty',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Code', 'Model', 'Manufacturer', 'Qty', 'Warranty', 'Terms']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 15 },
        4: { cellWidth: 25 },
        5: { cellWidth: 'auto' },
      },
      styles: { fontSize: 8 },
    });

    // Footer note
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Note: Warranty periods commence from date of installation. Contact supplier for warranty claims.', 20, finalY + 15);

    return doc;
  };

  // Save document to handover
  const saveToHandover = useMutation({
    mutationFn: async ({ blob, fileName, documentType }: { blob: Blob; fileName: string; documentType: string }) => {
      if (!projectId) throw new Error('No project selected');

      // Upload to storage
      const filePath = `handover/${projectId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('handover-documents')
        .upload(filePath, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // For private buckets, store the authenticated URL pattern
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const fileUrl = `${supabaseUrl}/storage/v1/object/authenticated/handover-documents/${filePath}`;

      // Get user
      const { data: userData } = await supabase.auth.getUser();

      // Insert record
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
      const generatedDocs: string[] = [];

      // Generate lighting schedule
      if (includeSchedule) {
        await generateLightingReportPDF(projectId, {
          includesCoverPage: true,
          includeTableOfContents: false,
          sections: {
            executiveSummary: false,
            scheduleByTenant: true,
            scheduleByZone: false,
            specificationSheets: includeSpecSheets,
            costSummary: false,
            energyAnalysis: false,
            approvalStatus: false,
            comparisons: false,
            regulatoryCompliance: false,
          },
        });
        generatedDocs.push('Lighting Schedule');
      }

      // Generate warranty schedule and save to handover
      if (includeWarranty) {
        const warrantyDoc = await generateWarrantySchedulePDF();
        const warrantyBlob = warrantyDoc.output('blob');
        const warrantyFileName = `${project?.project_number || 'Project'}_Lighting_Warranty_Schedule.pdf`;
        
        await saveToHandover.mutateAsync({
          blob: warrantyBlob,
          fileName: warrantyFileName,
          documentType: 'warranties',
        });
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
          {/* Document Options */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="includeSchedule"
                checked={includeSchedule}
                onCheckedChange={(checked) => setIncludeSchedule(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="includeSchedule" className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Lighting Schedule
                </Label>
                <p className="text-xs text-muted-foreground">
                  Complete schedule by tenant with quantities and specifications
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="includeSpecSheets"
                checked={includeSpecSheets}
                onCheckedChange={(checked) => setIncludeSpecSheets(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="includeSpecSheets" className="font-medium flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-green-500" />
                  Specification Sheets
                </Label>
                <p className="text-xs text-muted-foreground">
                  Technical data sheets for each fitting type
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="includeWarranty"
                checked={includeWarranty}
                onCheckedChange={(checked) => setIncludeWarranty(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="includeWarranty" className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-500" />
                  Warranty Schedule
                </Label>
                <p className="text-xs text-muted-foreground">
                  Warranty periods and terms for all fittings
                </p>
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
              <CardDescription>
                {selectedFittings.size} of {fittings.length} fittings selected
              </CardDescription>
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
              <p className="text-xs text-muted-foreground mt-1">
                Add fittings to the lighting schedule first
              </p>
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
                    <TableRow 
                      key={fitting.fitting_id}
                      className={selectedFittings.has(fitting.fitting_id) ? 'bg-primary/5' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedFittings.has(fitting.fitting_id)}
                          onCheckedChange={() => toggleFitting(fitting.fitting_id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{fitting.fitting_code}</TableCell>
                      <TableCell className="font-medium">{fitting.model_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {fitting.manufacturer || '-'}
                      </TableCell>
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
              <p className="text-sm text-muted-foreground">
                Documents will be saved to Handover Documents → Lighting & Warranties
              </p>
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