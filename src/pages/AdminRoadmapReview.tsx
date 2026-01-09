import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  MapPin,
  RefreshCw,
  ChevronDown,
  ChevronRight 
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProjectRoadmapSummary {
  projectId: string;
  projectName: string;
  city: string | null;
  province: string | null;
  status: string;
  totalItems: number;
  completedItems: number;
  progress: number;
  teamMembers: { id: string; name: string; email: string; role: string }[];
  upcomingItems: {
    id: string;
    title: string;
    dueDate: string | null;
    priority: string | null;
    isCompleted: boolean;
  }[];
}

export default function AdminRoadmapReview() {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data: summaries = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-roadmap-review"],
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
          .filter((item) => item.due_date && !item.is_completed)
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

      return summaries;
    },
  });

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(date, today)) {
      return "overdue";
    } else if (isBefore(date, addDays(today, 7))) {
      return "soon";
    }
    return "ok";
  };

  const generatePDFReport = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Roadmap Review Report", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${format(new Date(), "PPP 'at' p")}`, pageWidth / 2, 28, { align: "center" });
      
      let yPos = 40;

      for (const summary of summaries) {
        // Check if we need a new page
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        // Project header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text(summary.projectName, 14, yPos);
        yPos += 6;

        // Location
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const location = [summary.city, summary.province].filter(Boolean).join(", ") || "No location";
        doc.text(`Location: ${location}`, 14, yPos);
        yPos += 5;

        // Progress
        doc.setTextColor(0, 0, 0);
        doc.text(`Progress: ${summary.progress}% (${summary.completedItems}/${summary.totalItems} items completed)`, 14, yPos);
        yPos += 8;

        // Team Members
        doc.setFont("helvetica", "bold");
        doc.text("Team Members:", 14, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        
        if (summary.teamMembers.length > 0) {
          summary.teamMembers.forEach((member) => {
            doc.text(`• ${member.name} (${member.role}) - ${member.email}`, 18, yPos);
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
            head: [["Task", "Due Date", "Priority"]],
            body: summary.upcomingItems.map((item) => [
              item.title,
              item.dueDate ? format(new Date(item.dueDate), "MMM d, yyyy") : "No date",
              item.priority || "Normal",
            ]),
            theme: "striped",
            headStyles: { fillColor: [30, 58, 138], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
            tableWidth: "auto",
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        } else {
          doc.setFont("helvetica", "italic");
          doc.text("No upcoming scheduled items", 14, yPos);
          yPos += 10;
        }

        // Separator line
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
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const totalProjects = summaries.length;
  const averageProgress = summaries.length > 0 
    ? Math.round(summaries.reduce((acc, s) => acc + s.progress, 0) / summaries.length)
    : 0;
  const projectsWithOverdue = summaries.filter((s) =>
    s.upcomingItems.some((item) => getDueDateStatus(item.dueDate) === "overdue")
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Roadmap Review Report
          </h1>
          <p className="text-muted-foreground">
            Overview of all project roadmaps and team progress
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress}%</div>
            <Progress value={averageProgress} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projects with Overdue Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{projectsWithOverdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>All Project Roadmaps</CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No projects found
            </p>
          ) : (
            <div className="space-y-2">
              {summaries.map((summary) => {
                const isExpanded = expandedProjects.has(summary.projectId);
                return (
                  <div
                    key={summary.projectId}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleProject(summary.projectId)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div>
                          <span className="font-medium">{summary.projectName}</span>
                          {(summary.city || summary.province) && (
                            <span className="text-sm text-muted-foreground ml-2">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {[summary.city, summary.province].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{summary.teamMembers.length}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={summary.progress} className="w-16 h-2" />
                          <span className="text-sm font-medium">{summary.progress}%</span>
                        </div>
                        <Badge variant={summary.status === "active" ? "default" : "secondary"}>
                          {summary.status}
                        </Badge>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t space-y-4">
                        {/* Team Members */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Team Members
                          </h4>
                          {summary.teamMembers.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {summary.teamMembers.map((member) => (
                                <Badge
                                  key={member.id}
                                  variant="outline"
                                  className="py-1"
                                >
                                  {member.name} ({member.role})
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No team members assigned
                            </p>
                          )}
                        </div>

                        {/* Upcoming Items */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Next 5 Scheduled Items
                          </h4>
                          {summary.upcomingItems.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Task</TableHead>
                                  <TableHead>Due Date</TableHead>
                                  <TableHead>Priority</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {summary.upcomingItems.map((item) => {
                                  const dueDateStatus = getDueDateStatus(item.dueDate);
                                  return (
                                    <TableRow key={item.id}>
                                      <TableCell>{item.title}</TableCell>
                                      <TableCell>
                                        <span
                                          className={
                                            dueDateStatus === "overdue"
                                              ? "text-destructive font-medium"
                                              : dueDateStatus === "soon"
                                              ? "text-amber-600 font-medium"
                                              : ""
                                          }
                                        >
                                          {item.dueDate
                                            ? format(new Date(item.dueDate), "MMM d, yyyy")
                                            : "No date"}
                                          {dueDateStatus === "overdue" && " (Overdue)"}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={getPriorityColor(item.priority)}>
                                          {item.priority || "Normal"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No upcoming scheduled items
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
