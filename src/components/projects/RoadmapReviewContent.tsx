import { useState, useMemo, useCallback, useRef } from "react";
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
  Eye,
} from "lucide-react";
import { 
  RoadmapReviewFilters, 
  GroupByMode, 
  useFilteredSummaries,
  getFilterDescription,
} from "./RoadmapReviewFilters";
import { PDFPreviewDialog } from "@/components/document-templates/PDFPreviewDialog";
import { format } from "date-fns";
import { toast } from "sonner";

// Import roadmap review components
import { PortfolioHealthGauge } from "@/components/admin/roadmap-review/PortfolioHealthGauge";
import { ExecutiveSummaryCards } from "@/components/admin/roadmap-review/ExecutiveSummaryCards";
import { ProjectComparisonChart } from "@/components/admin/roadmap-review/ProjectComparisonChart";
import { PriorityHeatMap } from "@/components/admin/roadmap-review/PriorityHeatMap";
import { EnhancedProjectCard } from "@/components/admin/roadmap-review/EnhancedProjectCard";
import { TeamWorkloadChart } from "@/components/admin/roadmap-review/TeamWorkloadChart";
import { PDFExportDialog } from "@/components/admin/roadmap-review/PDFExportDialog";
import { PrintableChartContainer } from "@/components/admin/roadmap-review/PrintableChartContainer";
import { ExportProgressOverlay, ExportStep } from "@/components/admin/roadmap-review/ExportProgressOverlay";

// Import calculation utilities
import { 
  ProjectRoadmapSummary,
  EnhancedProjectSummary,
  enhanceProjectSummary,
  calculatePortfolioMetrics,
} from "@/utils/roadmapReviewCalculations";

// Import PDF export utilities
import { generateRoadmapPdfBlob, captureRoadmapReviewCharts } from "@/utils/roadmapReviewPdfMake";
import { RoadmapPDFExportOptions } from "@/utils/roadmapReviewPdfStyles";

// Import pre-capture hook
import { useChartPreCapture } from "@/hooks/useChartPreCapture";

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

export function RoadmapReviewContent() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [exportStep, setExportStep] = useState<ExportStep>('capturing');
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewExport, setPreviewExport] = useState<SavedPdfExport | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Filter state
  const [groupBy, setGroupBy] = useState<GroupByMode>("none");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const cancelExportRef = useRef(false);
  const queryClient = useQueryClient();

  // Pre-capture charts in background
  const { 
    status: preCaptureStatus, 
    charts: preCapturedCharts, 
    chartCount: preCapturedChartCount,
    recapture: recaptureCharts,
    isReady: chartsPreCaptured,
    capturedAgo,
    isStale: chartsAreStale,
  } = useChartPreCapture(3000, true);

  // Handle opening preview
  const handlePreviewExport = useCallback(async (exportItem: SavedPdfExport) => {
    try {
      const { data, error } = await supabase.storage
        .from('roadmap-exports')
        .createSignedUrl(exportItem.file_path, 3600);

      if (error) throw error;

      setPreviewUrl(data.signedUrl);
      setPreviewExport(exportItem);
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to load preview");
    }
  }, []);

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
    queryKey: ["roadmap-review-content"],
    queryFn: async () => {
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, city, province, status")
        .order("name");

      if (projectsError) throw projectsError;

      const { data: allRoadmapItems, error: roadmapError } = await supabase
        .from("project_roadmap_items")
        .select("*")
        .order("due_date", { ascending: true });

      if (roadmapError) throw roadmapError;

      const { data: allMembers, error: membersError } = await supabase
        .from("project_members")
        .select(`
          id,
          project_id,
          position,
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `);

      if (membersError) throw membersError;

      const summaries: ProjectRoadmapSummary[] = projects.map((project) => {
        const projectItems = allRoadmapItems.filter(
          (item) => item.project_id === project.id
        );
        const completedItems = projectItems.filter((item) => item.is_completed);
        const progress =
          projectItems.length > 0
            ? Math.round((completedItems.length / projectItems.length) * 100)
            : 0;

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

        const projectMembers = allMembers
          .filter((m) => m.project_id === project.id)
          .map((m) => ({
            id: m.user_id,
            name: (m.profiles as any)?.full_name || "Unknown",
            email: (m.profiles as any)?.email || "",
            role: m.position || "member",
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

  const enhancedSummaries: EnhancedProjectSummary[] = useMemo(() => {
    if (!queryData?.summaries) return [];
    return queryData.summaries.map((summary) => 
      enhanceProjectSummary(summary, queryData.allRoadmapItems || [])
    );
  }, [queryData]);

  // Use the filter hook for filtered summaries
  const filteredSummaries = useFilteredSummaries(
    enhancedSummaries,
    groupBy,
    selectedProject,
    selectedRole,
    selectedUser
  );

  const portfolioMetrics = useMemo(() => {
    return calculatePortfolioMetrics(filteredSummaries);
  }, [filteredSummaries]);

  const generatePDFReport = useCallback(async (options?: RoadmapPDFExportOptions) => {
    if (filteredSummaries.length === 0) {
      toast.error("No project data available to export");
      return;
    }

    cancelExportRef.current = false;
    setIsGeneratingPDF(true);
    setShowProgressOverlay(true);
    setExportStep('capturing');
    
    try {
      let capturedCharts = undefined;
      
      if (options?.includeCharts !== false) {
        if (chartsPreCaptured && preCapturedCharts && preCapturedCharts.length > 0) {
          capturedCharts = preCapturedCharts;
        } else {
          toast.info("Charts will be skipped - refresh page first for chart capture");
        }
      }

      if (cancelExportRef.current) throw new Error('Export cancelled');

      setExportStep('building');
      if (cancelExportRef.current) throw new Error('Export cancelled');

      setExportStep('generating');
      
      const exportOptions = {
        includeCharts: capturedCharts ? (options?.includeCharts ?? true) : false,
        includeAnalytics: options?.includeAnalytics ?? true,
        includeDetailedProjects: options?.includeDetailedProjects ?? true,
        includeMeetingNotes: options?.includeMeetingNotes ?? false,
        includeSummaryMinutes: options?.includeSummaryMinutes ?? false,
        includeTableOfContents: options?.includeTableOfContents ?? true,
        includeCoverPage: options?.includeCoverPage ?? true,
        includeFullRoadmapItems: options?.includeFullRoadmapItems ?? false,
        companyLogo: options?.companyLogo,
        companyName: options?.companyName,
        confidentialNotice: options?.confidentialNotice ?? true,
        reportType: options?.reportType ?? 'standard',
        chartLayout: options?.chartLayout ?? 'stacked',
      };

      const filterDesc = getFilterDescription(groupBy, selectedProject, selectedRole, selectedUser, enhancedSummaries);
      const customFilename = filterDesc
        ? `Roadmap_Review_${filterDesc.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`
        : undefined;

      const { blob, filename } = await generateRoadmapPdfBlob(
        filteredSummaries,
        portfolioMetrics,
        exportOptions,
        queryData?.allRoadmapItems?.filter(item => 
          filteredSummaries.some(p => p.projectId === item.project_id)
        ),
        capturedCharts,
        customFilename,
      );

      if (cancelExportRef.current) throw new Error('Export cancelled');

      setExportStep('saving');
      
      const storagePath = `reports/${Date.now()}_${filename}`;
      
      const { error: uploadError } = await supabase.storage
        .from('roadmap-exports')
        .upload(storagePath, blob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw new Error(`Failed to save PDF: ${uploadError.message}`);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: insertedExport, error: dbError } = await supabase
        .from('roadmap_pdf_exports')
        .insert({
          file_name: filename,
          file_path: storagePath,
          file_size: blob.size,
          report_type: options?.reportType ?? 'standard',
          exported_by: user?.id || null,
          options: options || {},
        })
        .select()
        .single();

      if (dbError) throw new Error(`Failed to save export record: ${dbError.message}`);

      queryClient.invalidateQueries({ queryKey: ["roadmap-pdf-exports"] });
      
      setExportStep('complete');
      toast.success(`PDF saved! Opening preview...`);
      
      setTimeout(async () => {
        setShowProgressOverlay(false);
        setIsGeneratingPDF(false);
        
        if (insertedExport) {
          setActiveTab('saved');
          setTimeout(() => {
            handlePreviewExport(insertedExport as SavedPdfExport);
          }, 300);
        }
      }, 800);
      
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      const errorMessage = error?.message === 'Export cancelled' 
        ? 'Export cancelled'
        : error?.message || 'Unknown error occurred';
      
      if (error?.message === 'Export cancelled') {
        toast.info("Export cancelled");
      } else {
        toast.error(`PDF generation failed: ${errorMessage.substring(0, 100)}`);
      }
      
      setExportStep('error');
      setTimeout(() => {
        setShowProgressOverlay(false);
        setIsGeneratingPDF(false);
      }, 2500);
    }
  }, [filteredSummaries, portfolioMetrics, queryClient, queryData?.allRoadmapItems, chartsPreCaptured, preCapturedCharts, handlePreviewExport, groupBy, selectedProject, selectedRole, selectedUser, enhancedSummaries]);

  const handleDeleteExport = async (exportItem: SavedPdfExport) => {
    setDeletingId(exportItem.id);
    try {
      const { error: storageError } = await supabase.storage
        .from('roadmap-exports')
        .remove([exportItem.file_path]);
      
      if (storageError) console.error("Storage delete error:", storageError);

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

  const handleDownloadExport = async (exportItem: SavedPdfExport) => {
    try {
      const { data, error } = await supabase.storage
        .from('roadmap-exports')
        .download(exportItem.file_path);

      if (error) throw error;

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
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-2">
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
            <FileText className="h-4 w-4 mr-2" />
          )}
          {isGeneratingPDF ? "Generating..." : "Generate Report"}
        </Button>
      </div>

      {/* PDF Export Dialog */}
      <PDFExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={generatePDFReport}
        isExporting={isGeneratingPDF}
        preCaptureStatus={preCaptureStatus}
        preCapturedChartCount={preCapturedChartCount}
        onRecaptureCharts={recaptureCharts}
        capturedAgo={capturedAgo}
        isStale={chartsAreStale}
      />

      {/* Export Progress Overlay */}
      <ExportProgressOverlay
        isVisible={showProgressOverlay}
        currentStep={exportStep}
        chartCount={preCapturedChartCount}
        usingPreCaptured={chartsPreCaptured}
        onCancel={() => {
          cancelExportRef.current = true;
          setShowProgressOverlay(false);
          setIsGeneratingPDF(false);
        }}
      />

      {/* Hidden Printable Charts Container */}
      <PrintableChartContainer projects={enhancedSummaries} />

      {/* Filters */}
      <RoadmapReviewFilters
        enhancedSummaries={enhancedSummaries}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        selectedUser={selectedUser}
        onUserChange={setSelectedUser}
      />

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
          {/* Filter indicator */}
          {groupBy !== "none" && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Showing filtered data: {getFilterDescription(groupBy, selectedProject, selectedRole, selectedUser, enhancedSummaries) || "Filtered view"}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredSummaries.length} of {enhancedSummaries.length} projects
              </span>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-4">
            <PortfolioHealthGauge score={portfolioMetrics.totalHealthScore} />
            <div className="lg:col-span-3">
              <ExecutiveSummaryCards metrics={portfolioMetrics} />
            </div>
          </div>
          <ProjectComparisonChart projects={filteredSummaries} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Filter indicator */}
          {groupBy !== "none" && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Showing filtered data: {getFilterDescription(groupBy, selectedProject, selectedRole, selectedUser, enhancedSummaries) || "Filtered view"}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredSummaries.length} of {enhancedSummaries.length} projects
              </span>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <PriorityHeatMap projects={filteredSummaries} />
            <TeamWorkloadChart projects={filteredSummaries} />
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {getFilterDescription(groupBy, selectedProject, selectedRole, selectedUser, enhancedSummaries)
                  ? `Projects: ${getFilterDescription(groupBy, selectedProject, selectedRole, selectedUser, enhancedSummaries)}`
                  : "All Project Roadmaps"
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredSummaries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {groupBy === "none" 
                    ? "No projects found" 
                    : "No projects match the current filter"
                  }
                </p>
              ) : (
                filteredSummaries.map((project) => (
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
