import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { PreCaptureStatus } from "@/hooks/useChartPreCapture";

export interface RoadmapExportOptions {
  reportType: 'standard' | 'meeting-review' | 'executive-summary';
  includeCharts: boolean;
  includeDetailedProjects: boolean;
  includeMeetingNotes: boolean;
  includeSummaryMinutes: boolean;
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  companyLogo?: string | null;
  companyName?: string;
  confidentialNotice?: boolean;
}

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: RoadmapExportOptions) => Promise<void>;
  isExporting: boolean;
  preCaptureStatus?: PreCaptureStatus;
  preCapturedChartCount?: number;
  onRecaptureCharts?: () => Promise<void>;
  capturedAgo?: string;
  isStale?: boolean;
}

const DEFAULT_OPTIONS: RoadmapExportOptions = {
  reportType: 'standard',
  includeCharts: true,
  includeDetailedProjects: true,
  includeMeetingNotes: false,
  includeSummaryMinutes: false,
  includeTableOfContents: true,
  includeCoverPage: true,
  confidentialNotice: true,
};

export function PDFExportDialog({ 
  open, 
  onOpenChange, 
  onExport, 
  isExporting,
}: PDFExportDialogProps) {
  const [options, setOptions] = useState<RoadmapExportOptions>({ ...DEFAULT_OPTIONS });
  const [companySettings, setCompanySettings] = useState<{
    companyName: string;
    companyLogo: string | null;
  }>({ companyName: '', companyLogo: null });

  useEffect(() => {
    const fetchCompanySettings = async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('company_name, company_logo_url')
        .limit(1)
        .single();
      
      if (data) {
        setCompanySettings({
          companyName: data.company_name || '',
          companyLogo: data.company_logo_url,
        });
        setOptions(prev => ({
          ...prev,
          companyName: data.company_name || 'Roadmap Review',
          companyLogo: data.company_logo_url,
        }));
      }
    };
    
    if (open) fetchCompanySettings();
  }, [open]);

  const handleExport = async () => {
    await onExport(options);
    onOpenChange(false);
  };

  const updateOption = <K extends keyof RoadmapExportOptions>(key: K, value: RoadmapExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const reportTypes = [
    { value: 'standard', label: 'Standard Report', desc: 'Charts and project summaries' },
    { value: 'meeting-review', label: 'Meeting Review', desc: 'With notes and action items' },
    { value: 'executive-summary', label: 'Executive Summary', desc: 'Condensed 2-page overview' },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Choose your report format and sections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          <RadioGroup 
            value={options.reportType} 
            onValueChange={(v) => updateOption('reportType', v as RoadmapExportOptions['reportType'])}
            className="space-y-2"
          >
            {reportTypes.map(type => (
              <label
                key={type.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  options.reportType === type.value 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value={type.value} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{type.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{type.desc}</span>
                </div>
              </label>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sections</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { id: 'coverPage', label: 'Cover Page', key: 'includeCoverPage' },
                { id: 'toc', label: 'Table of Contents', key: 'includeTableOfContents' },
                { id: 'charts', label: 'Analytics Charts', key: 'includeCharts' },
                { id: 'projects', label: 'Project Details', key: 'includeDetailedProjects' },
              ].map(item => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    id={item.id}
                    checked={options[item.key as keyof RoadmapExportOptions] as boolean}
                    onCheckedChange={(checked) => updateOption(item.key as keyof RoadmapExportOptions, !!checked)}
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
              
              {options.reportType === 'meeting-review' && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      id="notes"
                      checked={options.includeMeetingNotes}
                      onCheckedChange={(checked) => updateOption('includeMeetingNotes', !!checked)}
                    />
                    <span className="text-sm">Meeting Notes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      id="summary"
                      checked={options.includeSummaryMinutes}
                      onCheckedChange={(checked) => updateOption('includeSummaryMinutes', !!checked)}
                    />
                    <span className="text-sm">Summary Minutes</span>
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Branding</Label>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  id="logo"
                  checked={!!options.companyLogo}
                  disabled={!companySettings.companyLogo}
                  onCheckedChange={(checked) => updateOption('companyLogo', checked ? companySettings.companyLogo : null)}
                />
                <span className="text-sm">Company Logo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  id="confidential"
                  checked={options.confidentialNotice}
                  onCheckedChange={(checked) => updateOption('confidentialNotice', !!checked)}
                />
                <span className="text-sm">Confidential Notice</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
