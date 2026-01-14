import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
  Archive,
  Trash2,
  Eye
} from "lucide-react";
import { PDFPreviewDialog } from "@/components/document-templates/PDFPreviewDialog";
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

interface SavedPdfExport {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  report_type: string;
  exported_by: string | null;
  options: Record<string, unknown>;
  created_at: string;
}

export default function AdminRoadmapReview() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewExport, setPreviewExport] = useState<SavedPdfExport | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Handle opening preview
  const handlePreviewExport = async (exportItem: SavedPdfExport) => {
    try {
      const { data, error } = await supabase.storage
        .from('roadmap-exports')
        .createSignedUrl(exportItem.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      setPreviewUrl(data.signedUrl);
      setPreviewExport(exportItem);
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to load preview");
    }
  };

  // Close preview
  const handleClosePreview = () => {
    setPreviewExport(null);
    setPreviewUrl(null);
  };

  // Fetch saved PDF exports
  const { data: savedExports = [], isLoading: exportsLoading } = useQuery({
    queryKey: ["roadmap-pdf-exports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_pdf_exports")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SavedPdfExport[];
    },
  });

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

      // Get the PDF as blob for storage
      const pdfBlob = doc.output('blob');
      const fileName = `Roadmap_Review_${format(new Date(), "yyyy-MM-dd_HHmmss")}.pdf`;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Just download if not authenticated
        downloadPDF(doc);
        toast.success("PDF report downloaded!");
        return;
      }

      // Upload to storage
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('roadmap-exports')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Fall back to direct download
        downloadPDF(doc);
        toast.warning("PDF downloaded but couldn't save to storage");
        return;
      }

      // Save record to database
      const { error: dbError } = await supabase
        .from('roadmap_pdf_exports')
        .insert({
          file_name: fileName,
          file_path: filePath,
          file_size: pdfBlob.size,
          report_type: options?.reportType ?? 'meeting-review',
          exported_by: user.id,
          options: options || {},
        });

      if (dbError) {
        console.error("Database insert error:", dbError);
      }

      // Download the PDF
      downloadPDF(doc);
      
      // Refresh the saved exports list
      queryClient.invalidateQueries({ queryKey: ["roadmap-pdf-exports"] });
      
      toast.success("PDF report saved and downloaded!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setShowPrintableCharts(false);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [enhancedSummaries, portfolioMetrics, queryClient, queryData?.allRoadmapItems]);

  // Delete a saved export
  const handleDeleteExport = async (exportItem: SavedPdfExport) => {
    setDeletingId(exportItem.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('roadmap-exports')
        .remove([exportItem.file_path]);
      
      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('roadmap_pdf_exports')
        .delete()
        .eq('id', exportItem.id);

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["roadmap-pdf-exports"] });
      toast.success("Export deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete export");
    } finally {
      setDeletingId(null);
    }
  };

  // Download a saved export
  const handleDownloadExport = async (exportItem: SavedPdfExport) => {
    try {
      const { data, error } = await supabase.storage
        .from('roadmap-exports')
        .download(exportItem.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportItem.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

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
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Saved Reports
            {savedExports.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-1.5">
                {savedExports.length}
              </span>
            )}
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

        {/* Saved Reports Tab */}
        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Saved PDF Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exportsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : savedExports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No saved reports yet</p>
                  <p className="text-sm">Export a PDF to save it for later access</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedExports.map((exportItem) => (
                    <div
                      key={exportItem.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-red-500" />
                        <div>
                          <p className="font-medium">{exportItem.file_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{format(new Date(exportItem.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                            {exportItem.file_size && (
                              <>
                                <span>•</span>
                                <span>{(exportItem.file_size / 1024).toFixed(1)} KB</span>
                              </>
                            )}
                            {exportItem.report_type && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{exportItem.report_type.replace('-', ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewExport(exportItem)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadExport(exportItem)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExport(exportItem)}
                          disabled={deletingId === exportItem.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === exportItem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PDF Preview Dialog */}
      {previewUrl && previewExport && (
        <PDFPreviewDialog
          open={!!previewExport}
          onOpenChange={(open) => !open && handleClosePreview()}
          pdfUrl={previewUrl}
          fileName={previewExport.file_name}
        />
      )}
    </div>
  );
}
