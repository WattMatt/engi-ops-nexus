import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Loader2, Building2, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoadmapPDFExportOptions, DEFAULT_EXPORT_OPTIONS } from "@/utils/roadmapReviewPdfStyles";

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: RoadmapPDFExportOptions) => Promise<void>;
  isExporting: boolean;
}

export function PDFExportDialog({ 
  open, 
  onOpenChange, 
  onExport, 
  isExporting 
}: PDFExportDialogProps) {
  const [options, setOptions] = useState<RoadmapPDFExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [companySettings, setCompanySettings] = useState<{
    companyName: string;
    companyLogo: string | null;
  }>({ companyName: '', companyLogo: null });

  // Fetch company settings
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
    
    if (open) {
      fetchCompanySettings();
    }
  }, [open]);

  const handleExport = async () => {
    await onExport(options);
    onOpenChange(false);
  };

  const updateOption = <K extends keyof RoadmapPDFExportOptions>(
    key: K, 
    value: RoadmapPDFExportOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export Report Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Report Type</Label>
            <RadioGroup 
              value={options.reportType} 
              onValueChange={(v) => updateOption('reportType', v as RoadmapPDFExportOptions['reportType'])}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="standard" id="standard" />
                <div className="flex-1">
                  <Label htmlFor="standard" className="font-medium cursor-pointer">
                    Standard Report
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Charts and project summaries without notes sections
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
                <RadioGroupItem value="meeting-review" id="meeting-review" />
                <div className="flex-1">
                  <Label htmlFor="meeting-review" className="font-medium cursor-pointer">
                    Meeting Review Format
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Includes notes sections and summary minutes for team reviews
                  </p>
                </div>
                <FileCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="executive-summary" id="executive-summary" />
                <div className="flex-1">
                  <Label htmlFor="executive-summary" className="font-medium cursor-pointer">
                    Executive Summary Only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Condensed 2-page overview for leadership
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Include Sections */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include Sections</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="coverPage"
                  checked={options.includeCoverPage}
                  onCheckedChange={(checked) => updateOption('includeCoverPage', !!checked)}
                />
                <Label htmlFor="coverPage" className="text-sm cursor-pointer">
                  Cover Page
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="toc"
                  checked={options.includeTableOfContents}
                  onCheckedChange={(checked) => updateOption('includeTableOfContents', !!checked)}
                />
                <Label htmlFor="toc" className="text-sm cursor-pointer">
                  Table of Contents
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="charts"
                  checked={options.includeCharts}
                  onCheckedChange={(checked) => updateOption('includeCharts', !!checked)}
                />
                <Label htmlFor="charts" className="text-sm cursor-pointer">
                  Analytics Charts
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="projects"
                  checked={options.includeDetailedProjects}
                  onCheckedChange={(checked) => updateOption('includeDetailedProjects', !!checked)}
                />
                <Label htmlFor="projects" className="text-sm cursor-pointer">
                  Project Details
                </Label>
              </div>
              {options.reportType === 'meeting-review' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="notes"
                      checked={options.includeMeetingNotes}
                      onCheckedChange={(checked) => updateOption('includeMeetingNotes', !!checked)}
                    />
                    <Label htmlFor="notes" className="text-sm cursor-pointer">
                      Meeting Notes Sections
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="summary"
                      checked={options.includeSummaryMinutes}
                      onCheckedChange={(checked) => updateOption('includeSummaryMinutes', !!checked)}
                    />
                    <Label htmlFor="summary" className="text-sm cursor-pointer">
                      Summary Minutes Page
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox 
                      id="fullRoadmap"
                      checked={options.includeFullRoadmapItems}
                      onCheckedChange={(checked) => updateOption('includeFullRoadmapItems', !!checked)}
                    />
                    <div>
                      <Label htmlFor="fullRoadmap" className="text-sm cursor-pointer">
                        Full Roadmap Items
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Add detailed roadmap page per project with all items
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Branding */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Branding
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="logo"
                  checked={!!options.companyLogo}
                  disabled={!companySettings.companyLogo}
                  onCheckedChange={(checked) => updateOption(
                    'companyLogo', 
                    checked ? companySettings.companyLogo : null
                  )}
                />
                <Label htmlFor="logo" className="text-sm cursor-pointer">
                  Include Company Logo
                  {!companySettings.companyLogo && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (No logo configured)
                    </span>
                  )}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="confidential"
                  checked={options.confidentialNotice}
                  onCheckedChange={(checked) => updateOption('confidentialNotice', !!checked)}
                />
                <Label htmlFor="confidential" className="text-sm cursor-pointer">
                  Confidential Notice in Footer
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
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
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
