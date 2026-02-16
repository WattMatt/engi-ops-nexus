import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, Settings, Save, Loader2, Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LightingScheduleSection } from './LightingScheduleSection';
import { SpecificationSummarySection } from './SpecificationSummarySection';
import { ApprovalTrackingSection } from './ApprovalTrackingSection';
import { ReportTemplateManager } from './ReportTemplateManager';
import { RegulatoryComplianceSection } from './RegulatoryComplianceSection';
import { useSvgPdfReport } from '@/hooks/useSvgPdfReport';
import { buildLightingReportPdf, type LightingReportPdfData, type LightingTenantSchedule, type LightingFittingSpec } from '@/utils/svg-pdf/lightingReportPdfBuilder';
import type { StandardCoverPageData } from '@/utils/svg-pdf/sharedSvgHelpers';
import { format } from 'date-fns';

export interface LightingReportConfig {
  includesCoverPage: boolean;
  includeTableOfContents: boolean;
  sections: {
    executiveSummary: boolean;
    scheduleByTenant: boolean;
    scheduleByZone: boolean;
    specificationSheets: boolean;
    costSummary: boolean;
    energyAnalysis: boolean;
    approvalStatus: boolean;
    comparisons: boolean;
    regulatoryCompliance: boolean;
  };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  config: LightingReportConfig;
  is_default: boolean;
}

interface LightingReportTabProps {
  projectId: string | null;
}

const defaultConfig: LightingReportConfig = {
  includesCoverPage: true,
  includeTableOfContents: true,
  sections: {
    executiveSummary: true,
    scheduleByTenant: true,
    scheduleByZone: false,
    specificationSheets: true,
    costSummary: true,
    energyAnalysis: true,
    approvalStatus: true,
    comparisons: false,
    regulatoryCompliance: true,
  },
};

export const LightingReportTab: React.FC<LightingReportTabProps> = ({ projectId }) => {
  const { toast } = useToast();
  const { isGenerating, generateAndPersist, fetchCompanyData } = useSvgPdfReport();
  const [reportType, setReportType] = useState<string>('full');
  const [config, setConfig] = useState<LightingReportConfig>(defaultConfig);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('lighting_report_templates')
      .select('*')
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }

    const typedData = (data || []).map(item => ({
      ...item,
      config: item.config as unknown as LightingReportConfig
    }));
    setTemplates(typedData);
    
    const defaultTemplate = typedData.find(t => t.is_default);
    if (defaultTemplate) {
      setSelectedTemplate(defaultTemplate.id);
      setConfig(defaultTemplate.config);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setConfig(template.config);
    }
  };

  const handleSectionToggle = (section: keyof LightingReportConfig['sections']) => {
    setConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: !prev.sections[section],
      },
    }));
  };

  const fetchScheduleData = async (): Promise<LightingTenantSchedule[]> => {
    if (!projectId) return [];
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, shop_name, shop_number, area')
      .eq('project_id', projectId);

    const { data: schedules } = await supabase
      .from('project_lighting_schedules')
      .select(`id, tenant_id, quantity, approval_status, lighting_fittings (manufacturer, model_number, wattage, supply_cost, install_cost)`)
      .eq('project_id', projectId);

    return (tenants || []).map(tenant => {
      const tenantItems = (schedules || [])
        .filter(s => s.tenant_id === tenant.id)
        .map(s => {
          const fitting = s.lighting_fittings as any;
          const wattage = fitting?.wattage || 0;
          const quantity = s.quantity || 1;
          return {
            fittingCode: fitting?.model_number || 'N/A',
            description: fitting ? `${fitting.manufacturer} ${fitting.model_number}` : 'Unknown',
            quantity,
            wattage,
            totalWattage: wattage * quantity,
            status: s.approval_status || 'pending',
            supplyCost: (fitting?.supply_cost || 0) * quantity,
            installCost: (fitting?.install_cost || 0) * quantity,
          };
        });

      return {
        shopNumber: tenant.shop_number || '',
        shopName: tenant.shop_name || 'Unnamed',
        area: tenant.area || 0,
        items: tenantItems,
      };
    }).filter(t => t.items.length > 0);
  };

  const fetchSpecifications = async (): Promise<LightingFittingSpec[]> => {
    if (!projectId) return [];
    const { data: schedules } = await supabase
      .from('project_lighting_schedules')
      .select(`quantity, lighting_fittings (id, manufacturer, model_number, wattage, lumens, color_temperature, cri, ip_rating, fitting_type)`)
      .eq('project_id', projectId);

    const fittingMap = new Map<string, LightingFittingSpec>();
    (schedules || []).forEach(schedule => {
      const fitting = schedule.lighting_fittings as any;
      if (!fitting) return;
      const existing = fittingMap.get(fitting.id);
      if (existing) {
        existing.quantityUsed += schedule.quantity || 1;
      } else {
        fittingMap.set(fitting.id, {
          manufacturer: fitting.manufacturer,
          modelNumber: fitting.model_number,
          wattage: fitting.wattage,
          lumens: fitting.lumens,
          colorTemperature: fitting.color_temperature,
          cri: fitting.cri,
          ipRating: fitting.ip_rating,
          fittingType: fitting.fitting_type || 'General',
          quantityUsed: schedule.quantity || 1,
        });
      }
    });
    return Array.from(fittingMap.values());
  };

  const handleGenerateReport = async () => {
    if (!projectId) {
      toast({ title: "No Project Selected", description: "Please select a project first.", variant: "destructive" });
      return;
    }

    const { data: project } = await supabase.from('projects').select('name, project_number').eq('id', projectId).single();

    const buildFn = async () => {
      const companyData = await fetchCompanyData();
      const schedules = await fetchScheduleData();
      const specifications = await fetchSpecifications();

      const pdfData: LightingReportPdfData = {
        coverData: {
          ...companyData,
          reportTitle: 'LIGHTING REPORT',
          reportSubtitle: 'Comprehensive Lighting Analysis',
          projectName: project?.name || 'Untitled Project',
          projectNumber: project?.project_number || '',
          date: format(new Date(), 'dd MMMM yyyy'),
        } as StandardCoverPageData,
        projectName: project?.name || 'Untitled Project',
        sections: {
          executiveSummary: config.sections.executiveSummary,
          scheduleByTenant: config.sections.scheduleByTenant,
          specificationSheets: config.sections.specificationSheets,
          costSummary: config.sections.costSummary,
          energyAnalysis: config.sections.energyAnalysis,
        },
        schedules,
        specifications,
      };

      return buildLightingReportPdf(pdfData);
    };

    await generateAndPersist(buildFn, {
      storageBucket: 'lighting-reports',
      dbTable: 'lighting_report_history',
      foreignKeyColumn: 'project_id',
      foreignKeyValue: projectId,
      reportName: `Lighting_Report_${project?.project_number || 'Report'}`,
    });

    toast({ title: "Report Generated", description: "Your lighting report has been generated." });
  };

  const handlePreviewReport = () => {
    setIsPreviewing(true);
    setActiveTab('preview');
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="generate">
            <FileText className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Scale className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Settings className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <Save className="h-4 w-4 mr-2" />
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Type</CardTitle>
                <CardDescription>Select the type of report to generate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Project Lighting Report</SelectItem>
                    <SelectItem value="tenant">Tenant Schedule Report</SelectItem>
                    <SelectItem value="spec">Specification Summary</SelectItem>
                    <SelectItem value="comparison">Comparison Report</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                          {template.is_default && ' (Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Section Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Include Sections</CardTitle>
                <CardDescription>Choose which sections to include in the report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="coverPage"
                    checked={config.includesCoverPage}
                    onCheckedChange={() => setConfig(prev => ({ ...prev, includesCoverPage: !prev.includesCoverPage }))}
                  />
                  <Label htmlFor="coverPage">Cover Page</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="toc"
                    checked={config.includeTableOfContents}
                    onCheckedChange={() => setConfig(prev => ({ ...prev, includeTableOfContents: !prev.includeTableOfContents }))}
                  />
                  <Label htmlFor="toc">Table of Contents</Label>
                </div>
                <div className="border-t pt-3 space-y-3">
                  {Object.entries(config.sections).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={() => handleSectionToggle(key as keyof LightingReportConfig['sections'])}
                      />
                      <Label htmlFor={key} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={handlePreviewReport} variant="outline" className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Preview Report
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGenerating} className="flex-1">
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate & Download'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {isPreviewing ? (
            <div className="space-y-6">
              {config.sections.executiveSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Summary of lighting design specifications, costs, and energy analysis for this project.
                    </p>
                  </CardContent>
                </Card>
              )}
              {config.sections.scheduleByTenant && (
                <LightingScheduleSection projectId={projectId} viewMode="tenant" />
              )}
              {config.sections.specificationSheets && (
                <SpecificationSummarySection projectId={projectId} />
              )}
              {config.sections.regulatoryCompliance && (
                <RegulatoryComplianceSection />
              )}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Preview Your Report</h3>
                <p className="text-muted-foreground mb-4">
                  Configure your report settings and click "Preview Report" to see a preview.
                </p>
                <Button onClick={() => setActiveTab('generate')}>
                  Configure Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compliance">
          <RegulatoryComplianceSection showFullSchedule />
        </TabsContent>

        <TabsContent value="templates">
          <ReportTemplateManager
            templates={templates}
            currentConfig={config}
            onTemplateSelect={handleTemplateChange}
            onTemplatesChange={fetchTemplates}
          />
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalTrackingSection projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
