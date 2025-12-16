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
  BarChart3
} from 'lucide-react';
import { LightingLibraryTab } from '@/components/lighting/LightingLibraryTab';
import { LightingOverview } from '@/components/lighting/LightingOverview';
import { SpecSheetUploadTab } from '@/components/lighting/specsheets/SpecSheetUploadTab';
import { FittingComparisonTab, LightingSettingsTab } from '@/components/lighting/comparison';
import { LightingReportTab } from '@/components/lighting/reports/LightingReportTab';
import { AdvancedFeaturesTab } from '@/components/lighting/advanced/AdvancedFeaturesTab';
import { AnalyticsTab } from '@/components/lighting/analytics';

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
        <TabsList className="grid grid-cols-9 w-full">
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Project Lighting Schedule</h3>
              <p className="text-muted-foreground max-w-md">
                Coming soon - manage project-specific lighting schedules and quantities.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <LightingReportTab projectId={projectId} />
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
