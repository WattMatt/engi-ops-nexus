import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, Settings, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LightingScheduleSection } from './LightingScheduleSection';
import { SpecificationSummarySection } from './SpecificationSummarySection';
import { ApprovalTrackingSection } from './ApprovalTrackingSection';
import { ReportTemplateManager } from './ReportTemplateManager';
import { generateLightingReportPDF } from '@/utils/lightingReportPDF';

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
  },
};

export const LightingReportTab: React.FC<LightingReportTabProps> = ({ projectId }) => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>('full');
  const [config, setConfig] = useState<LightingReportConfig>(defaultConfig);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
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

  const handleGenerateReport = async () => {
    if (!projectId) {
      toast({
        title: "No Project Selected",
        description: "Please select a project first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateLightingReportPDF(projectId, config);
      toast({
        title: "Report Generated",
        description: "Your lighting report has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewReport = () => {
    setIsPreviewing(true);
    setActiveTab('preview');
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="generate">
            <FileText className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
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
