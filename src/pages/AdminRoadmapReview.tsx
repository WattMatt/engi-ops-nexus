import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  RefreshCw,
  LayoutDashboard,
  BarChart3,
  List,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Import new components
import { PortfolioHealthGauge } from "@/components/admin/roadmap-review/PortfolioHealthGauge";
import { ExecutiveSummaryCards } from "@/components/admin/roadmap-review/ExecutiveSummaryCards";
import { ProjectComparisonChart } from "@/components/admin/roadmap-review/ProjectComparisonChart";
import { PriorityHeatMap } from "@/components/admin/roadmap-review/PriorityHeatMap";
import { EnhancedProjectCard } from "@/components/admin/roadmap-review/EnhancedProjectCard";
import { TeamWorkloadChart } from "@/components/admin/roadmap-review/TeamWorkloadChart";
import { PDFExportDialog } from "@/components/admin/roadmap-review/PDFExportDialog";
import { PrintableChartContainer } from "@/components/admin/roadmap-review/PrintableChartContainer";

// Import calculation utilities
import { 
  ProjectRoadmapSummary,
  EnhancedProjectSummary,
  enhanceProjectSummary,
  calculatePortfolioMetrics,
} from "@/utils/roadmapReviewCalculations";

// Import PDF export utilities
import { 
  generateEnhancedRoadmapPDF, 
  downloadPDF 
} from "@/utils/roadmapReviewPdfExport";
import { RoadmapPDFExportOptions } from "@/utils/roadmapReviewPdfStyles";

export default function AdminRoadmapReview() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showExportDialog, setShowExportDialog] = useState(false);

  const { data: queryData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-roadmap-review-enhanced"],
    queryFn: async () => {
      // Fetch all projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, city, province, status")
        .order("name");

      if (projectsError) throw projectsError;

      // Fetch all roadmap items
      const { data: allRoadmapItems, error: roadmapError } = await supabase
        .from("project_roadmap_items")
        .select("*")
        .order("due_date", { ascending: true });

      if (roadmapError) throw roadmapError;

      // Fetch all project members with profiles
      const { data: allMembers, error: membersError } = await supabase
        .from("project_members")
        .select(`
          id,
          project_id,
          role,
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `);

      if (membersError) throw membersError;

      // Build summaries for each project
      const summaries: ProjectRoadmapSummary[] = projects.map((project) => {
        const projectItems = allRoadmapItems.filter(
          (item) => item.project_id === project.id
        );
        const completedItems = projectItems.filter((item) => item.is_completed);
        const progress =
          projectItems.length > 0
            ? Math.round((completedItems.length / projectItems.length) * 100)
            : 0;

        // Get upcoming items with due dates (next 5)
        const upcomingItems = projectItems
          .filter((item) => !item.is_completed)
          .sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          })
          .slice(0, 5)
          .map((item) => ({
            id: item.id,
            title: item.title,
            dueDate: item.due_date,
            priority: item.priority,
            isCompleted: item.is_completed,
          }));

        // Get team members for this project
        const projectMembers = allMembers
          .filter((m) => m.project_id === project.id)
          .map((m) => ({
            id: m.user_id,
            name: (m.profiles as any)?.full_name || "Unknown",
            email: (m.profiles as any)?.email || "",
            role: m.role,
          }));

        return {
          projectId: project.id,
          projectName: project.name,
          city: project.city,
          province: project.province,
          status: project.status || "active",
          totalItems: projectItems.length,
          completedItems: completedItems.length,
          progress,
          teamMembers: projectMembers,
          upcomingItems,
        };
      });

      return { summaries, allRoadmapItems };
    },
  });

  // Enhance summaries with calculated metrics
  const enhancedSummaries: EnhancedProjectSummary[] = useMemo(() => {
    if (!queryData?.summaries) return [];
    return queryData.summaries.map((summary) => 
      enhanceProjectSummary(summary, queryData.allRoadmapItems || [])
    );
  }, [queryData]);

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    return calculatePortfolioMetrics(enhancedSummaries);
  }, [enhancedSummaries]);

  // State for printable charts container
  const [showPrintableCharts, setShowPrintableCharts] = useState(false);

  const generatePDFReport = useCallback(async (options?: RoadmapPDFExportOptions) => {
    if (enhancedSummaries.length === 0) {
      toast.error("No project data available to export");
      return;
    }

    setIsGeneratingPDF(true);
    toast.info("Preparing charts for PDF export...", { duration: 2000 });

    try {
      // Mount the printable charts container to render all charts off-screen
      setShowPrintableCharts(true);
      
      // Wait for charts to render in the hidden container
      await new Promise<void>((resolve) => {
        let attempts = 0;
        const maxAttempts = 20;
        
        const checkReady = () => {
          attempts++;
          // Check if all chart elements exist in DOM
          const chart1 = document.getElementById('project-comparison-chart');
          const chart2 = document.getElementById('priority-heat-map');
          const chart3 = document.getElementById('team-workload-chart');
          
          if (chart1 && chart2 && chart3) {
            // Additional wait for recharts to finish rendering animations
            setTimeout(resolve, 800);
          } else if (attempts < maxAttempts) {
            setTimeout(checkReady, 200);
          } else {
            // Timeout fallback
            console.warn('Chart render timeout - proceeding anyway');
            resolve();
          }
        };
        
        // Start checking after initial mount
        setTimeout(checkReady, 300);
      });

      // Generate the enhanced PDF with ALL options from export dialog
      const doc = await generateEnhancedRoadmapPDF(
        enhancedSummaries,
        portfolioMetrics,
        {
          includeCharts: options?.includeCharts ?? true,
          includeAnalytics: options?.includeAnalytics ?? true,
          includeDetailedProjects: options?.includeDetailedProjects ?? true,
          includeMeetingNotes: options?.includeMeetingNotes ?? true,
          includeSummaryMinutes: options?.includeSummaryMinutes ?? true,
          includeTableOfContents: options?.includeTableOfContents ?? true,
          includeCoverPage: options?.includeCoverPage ?? true,
          includeFullRoadmapItems: options?.includeFullRoadmapItems ?? false,
          companyLogo: options?.companyLogo,
          companyName: options?.companyName,
          confidentialNotice: options?.confidentialNotice ?? true,
          reportType: options?.reportType ?? 'meeting-review',
        },
        queryData?.allRoadmapItems // Pass roadmap items for full roadmap pages
      );

      // Hide the printable charts container
      setShowPrintableCharts(false);

      // Download the PDF
      downloadPDF(doc);
      toast.success("Enhanced PDF report generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setShowPrintableCharts(false);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [enhancedSummaries, portfolioMetrics]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Roadmap Review Report
          </h1>
          <p className="text-muted-foreground">
            Portfolio health, progress analytics, and team insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowExportDialog(true)} disabled={isGeneratingPDF}>
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isGeneratingPDF ? "Generating Report..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* PDF Export Dialog */}
      <PDFExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={generatePDFReport}
        isExporting={isGeneratingPDF}
      />

      {/* Hidden Printable Charts Container - renders all charts for PDF capture */}
      {showPrintableCharts && (
        <PrintableChartContainer projects={enhancedSummaries} />
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Health Gauge and Summary Cards */}
          <div className="grid gap-6 lg:grid-cols-4">
            <PortfolioHealthGauge score={portfolioMetrics.totalHealthScore} />
            <div className="lg:col-span-3">
              <ExecutiveSummaryCards metrics={portfolioMetrics} />
            </div>
          </div>

          {/* Project Comparison Chart */}
          <ProjectComparisonChart projects={enhancedSummaries} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <PriorityHeatMap projects={enhancedSummaries} />
            <TeamWorkloadChart projects={enhancedSummaries} />
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Project Roadmaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enhancedSummaries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No projects found
                </p>
              ) : (
                enhancedSummaries.map((project) => (
                  <EnhancedProjectCard key={project.projectId} project={project} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
