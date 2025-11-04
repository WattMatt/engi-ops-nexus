import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { ReportSettings, useReportSettings } from "@/hooks/useReportSettings";
import { DocumentStructureTab } from "./formatting-tabs/DocumentStructureTab";
import { StylingAppearanceTab } from "./formatting-tabs/StylingAppearanceTab";
import { LayoutControlTab } from "./formatting-tabs/LayoutControlTab";
import { VisualEnhancementsTab } from "./formatting-tabs/VisualEnhancementsTab";
import { MetadataBrandingTab } from "./formatting-tabs/MetadataBrandingTab";
import { TemplatesTab } from "./formatting-tabs/TemplatesTab";

interface ReportFormattingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (settings: ReportSettings) => void;
  reportType?: "generator" | "cable_schedule" | "cost_report" | "specification";
  projectId?: string;
}

export function ReportFormattingDialog({
  open,
  onOpenChange,
  onGenerate,
  reportType,
  projectId,
}: ReportFormattingDialogProps) {
  const { settings: savedSettings, isLoading, saveSettings, isSaving } = useReportSettings(projectId);
  const [localSettings, setLocalSettings] = useState<ReportSettings>(savedSettings);

  useEffect(() => {
    if (savedSettings) {
      setLocalSettings(savedSettings);
    }
  }, [savedSettings]);

  const handleGenerate = () => {
    onGenerate(localSettings);
    onOpenChange(false);
  };

  const handleSaveSettings = () => {
    saveSettings(localSettings);
  };

  const updateSettings = (updates: Partial<ReportSettings>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Report Formatting</DialogTitle>
          <DialogDescription>
            Customize your report layout and appearance
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="structure" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="styling">Styling</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="structure" className="space-y-4 px-1">
              <DocumentStructureTab
                settings={localSettings}
                updateSettings={updateSettings}
              />
            </TabsContent>

            <TabsContent value="styling" className="space-y-4 px-1">
              <StylingAppearanceTab
                settings={localSettings}
                updateSettings={updateSettings}
              />
            </TabsContent>

            <TabsContent value="layout" className="space-y-4 px-1">
              <LayoutControlTab
                settings={localSettings}
                updateSettings={updateSettings}
              />
            </TabsContent>

            <TabsContent value="visual" className="space-y-4 px-1">
              <VisualEnhancementsTab
                settings={localSettings}
                updateSettings={updateSettings}
              />
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 px-1">
              <MetadataBrandingTab
                settings={localSettings}
                updateSettings={updateSettings}
              />
            </TabsContent>

            <TabsContent value="templates" className="space-y-4 px-1">
              <TemplatesTab
                currentSettings={localSettings}
                onLoadTemplate={(template) => setLocalSettings(template.config as ReportSettings)}
                reportType={reportType}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate}>
              Generate PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}