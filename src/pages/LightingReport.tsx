import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Lightbulb, 
  Library, 
  FileText, 
  GitCompare, 
  Calendar, 
  FileOutput,
  Settings,
  Sparkles,
  BarChart3,
  Package
} from 'lucide-react';
import { LightingLibraryTab } from '@/components/lighting/LightingLibraryTab';
import { LightingOverview } from '@/components/lighting/LightingOverview';
import { SpecSheetUploadTab } from '@/components/lighting/specsheets/SpecSheetUploadTab';
import { FittingComparisonTab, LightingSettingsTab } from '@/components/lighting/comparison';
import { LightingReportTab } from '@/components/lighting/reports/LightingReportTab';
import { AdvancedFeaturesTab } from '@/components/lighting/advanced/AdvancedFeaturesTab';
import { AnalyticsTab } from '@/components/lighting/analytics';
import { LightingHandoverGenerator } from '@/components/lighting/handover';
import { LightingScheduleTab } from '@/components/lighting/schedule';

const LightingReport = () => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const storedProjectId = localStorage.getItem('selectedProjectId');
    setProjectId(storedProjectId);
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Lightbulb className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Lighting Module</h1>
          <p className="text-muted-foreground">
            Comprehensive lighting management, specifications, and reporting
          </p>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-10 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-1">
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
          <TabsTrigger value="specs" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Specs</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-1">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <FileOutput className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="handover" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Handover</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <LightingOverview projectId={projectId} />
        </TabsContent>

        <TabsContent value="library">
          <LightingLibraryTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="specs">
          <SpecSheetUploadTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="comparison">
          <FittingComparisonTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="schedule">
          <LightingScheduleTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="reports">
          <LightingReportTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="handover">
          <LightingHandoverGenerator projectId={projectId} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedFeaturesTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="settings">
          <LightingSettingsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LightingReport;
