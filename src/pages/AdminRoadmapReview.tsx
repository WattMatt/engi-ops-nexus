import { useState, useMemo } from "react";
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
  List
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Import new components
import { PortfolioHealthGauge } from "@/components/admin/roadmap-review/PortfolioHealthGauge";
import { ExecutiveSummaryCards } from "@/components/admin/roadmap-review/ExecutiveSummaryCards";
import { ProjectComparisonChart } from "@/components/admin/roadmap-review/ProjectComparisonChart";
import { PriorityHeatMap } from "@/components/admin/roadmap-review/PriorityHeatMap";
import { EnhancedProjectCard } from "@/components/admin/roadmap-review/EnhancedProjectCard";
import { TeamWorkloadChart } from "@/components/admin/roadmap-review/TeamWorkloadChart";

// Import calculation utilities
import { 
  ProjectRoadmapSummary,
  EnhancedProjectSummary,
  enhanceProjectSummary,
  calculatePortfolioMetrics,
  getDueDateStatus
} from "@/utils/roadmapReviewCalculations";

export default function AdminRoadmapReview() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

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

  const generatePDFReport = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // ============= COVER PAGE =============
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, pageHeight * 0.45, "F");
      
      doc.setFillColor(59, 130, 246);
      doc.rect(0, pageHeight * 0.43, pageWidth, 8, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(36);
      doc.setFont("helvetica", "bold");
      doc.text("ROADMAP", pageWidth / 2, 60, { align: "center" });
      doc.text("REVIEW REPORT", pageWidth / 2, 78, { align: "center" });
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Portfolio Progress & Team Overview", pageWidth / 2, 95, { align: "center" });
      
      // Portfolio Health Score
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PORTFOLIO HEALTH SCORE", pageWidth / 2, pageHeight * 0.52, { align: "center" });
      
      // Large health score circle
      const healthScore = portfolioMetrics.totalHealthScore;
      const healthColor = healthScore >= 80 ? [34, 197, 94] : healthScore >= 60 ? [234, 179, 8] : healthScore >= 40 ? [249, 115, 22] : [239, 68, 68];
      doc.setFillColor(healthColor[0], healthColor[1], healthColor[2]);
      doc.circle(pageWidth / 2, pageHeight * 0.62, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(`${healthScore}%`, pageWidth / 2, pageHeight * 0.63 + 2, { align: "center" });
      
      // Summary stats boxes
      const boxY = pageHeight * 0.72;
      const boxWidth = 40;
      const boxHeight = 30;
      const boxSpacing = 8;
      const startX = (pageWidth - (boxWidth * 4 + boxSpacing * 3)) / 2;
      
      const statsBoxes = [
        { value: portfolioMetrics.totalProjects, label: "Projects" },
        { value: `${portfolioMetrics.averageProgress}%`, label: "Avg Progress" },
        { value: portfolioMetrics.projectsAtRisk + portfolioMetrics.projectsCritical, label: "At Risk" },
        { value: portfolioMetrics.totalOverdueItems, label: "Overdue" },
      ];
      
      statsBoxes.forEach((box, idx) => {
        const x = startX + (boxWidth + boxSpacing) * idx;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, boxY, boxWidth, boxHeight, 3, 3, "F");
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(String(box.value), x + boxWidth / 2, boxY + 14, { align: "center" });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(box.label, x + boxWidth / 2, boxY + 23, { align: "center" });
      });
      
      // Generation date
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), "PPPP 'at' p")}`, pageWidth / 2, pageHeight - 35, { align: "center" });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(40, pageHeight - 20, pageWidth - 40, pageHeight - 20);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Confidential - For Internal Use Only", pageWidth / 2, pageHeight - 12, { align: "center" });
      
      // ============= EXECUTIVE SUMMARY PAGE =============
      doc.addPage();
      let yPos = 20;
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("Executive Summary", 14, yPos);
      yPos += 15;
      
      // Summary table
      autoTable(doc, {
        startY: yPos,
        head: [["Metric", "Value", "Status"]],
        body: [
          ["Total Projects", String(portfolioMetrics.totalProjects), "Active"],
          ["Average Progress", `${portfolioMetrics.averageProgress}%`, portfolioMetrics.averageProgress >= 50 ? "On Track" : "Behind"],
          ["Portfolio Health", `${portfolioMetrics.totalHealthScore}%`, healthScore >= 70 ? "Healthy" : healthScore >= 50 ? "Moderate" : "Needs Attention"],
          ["Projects at Risk", String(portfolioMetrics.projectsAtRisk + portfolioMetrics.projectsCritical), portfolioMetrics.projectsCritical > 0 ? "Critical" : "Manageable"],
          ["Overdue Items", String(portfolioMetrics.totalOverdueItems), portfolioMetrics.totalOverdueItems > 5 ? "High" : "Low"],
          ["Team Members", String(portfolioMetrics.totalTeamMembers), "-"],
        ],
        theme: "striped",
        headStyles: { fillColor: [30, 58, 138], fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // ============= PROJECT DETAILS PAGES =============
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("Project Details", 14, yPos);
      yPos += 15;

      for (const summary of enhancedSummaries) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        // Project header with health indicator
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text(summary.projectName, 14, yPos);
        
        // Health badge
        const badgeColor = summary.healthScore >= 70 ? [34, 197, 94] : summary.healthScore >= 50 ? [234, 179, 8] : [239, 68, 68];
        doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
        doc.roundedRect(pageWidth - 40, yPos - 5, 25, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`${summary.healthScore}%`, pageWidth - 27.5, yPos, { align: "center" });
        
        yPos += 6;

        // Location and risk
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const location = [summary.city, summary.province].filter(Boolean).join(", ") || "No location";
        doc.text(`Location: ${location} | Risk: ${summary.riskLevel.toUpperCase()}`, 14, yPos);
        yPos += 5;

        // Progress
        doc.setTextColor(0, 0, 0);
        doc.text(`Progress: ${summary.progress}% (${summary.completedItems}/${summary.totalItems} items) | Velocity: ${summary.velocityLast7Days} items/week`, 14, yPos);
        yPos += 8;

        // Team Members
        doc.setFont("helvetica", "bold");
        doc.text("Team Members:", 14, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        
        if (summary.teamMembers.length > 0) {
          summary.teamMembers.forEach((member) => {
            doc.text(`• ${member.name} (${member.role})`, 18, yPos);
            yPos += 4;
          });
        } else {
          doc.text("• No team members assigned", 18, yPos);
          yPos += 4;
        }
        yPos += 4;

        // Upcoming Items Table
        if (summary.upcomingItems.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("Next 5 Scheduled Items:", 14, yPos);
          yPos += 3;

          autoTable(doc, {
            startY: yPos,
            head: [["Task", "Due Date", "Priority", "Status"]],
            body: summary.upcomingItems.map((item) => [
              item.title.substring(0, 40) + (item.title.length > 40 ? "..." : ""),
              item.dueDate ? format(new Date(item.dueDate), "MMM d, yyyy") : "No date",
              item.priority || "Normal",
              getDueDateStatus(item.dueDate) === "overdue" ? "OVERDUE" : getDueDateStatus(item.dueDate) === "soon" ? "Due Soon" : "On Track",
            ]),
            theme: "striped",
            headStyles: { fillColor: [30, 58, 138], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
            tableWidth: "auto",
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // Separator
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, pageWidth - 14, yPos);
        yPos += 10;
      }

      // Add page numbers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      }

      doc.save(`Roadmap_Review_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Enhanced report generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGeneratingPDF(false);
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
          <Button onClick={generatePDFReport} disabled={isGeneratingPDF}>
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

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
