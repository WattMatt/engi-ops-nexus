import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, FileText, Map } from "lucide-react";
import { toast } from "sonner";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { format } from "date-fns";
import { 
  TaskForExport, 
  buildTasksWithRoadmapContent, 
  buildRoadmapTasksSummary 
} from "@/utils/pdfmake/taskExportHelpers";

// @ts-ignore
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

interface TaskExportPDFButtonProps {
  projectId: string;
}

export const TaskExportPDFButton = ({ projectId }: TaskExportPDFButtonProps) => {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [groupByRoadmap, setGroupByRoadmap] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");

  const { data: project } = useQuery({
    queryKey: ["project-for-export", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name, project_number")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks-for-export", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          assigned_to,
          progress,
          roadmap_item_id
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles and roadmap items
      const tasksWithDetails = await Promise.all(
        (data || []).map(async (task) => {
          let profiles = null;
          let roadmap_item = null;

          if (task.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.assigned_to)
              .single();
            profiles = profile;
          }

          if (task.roadmap_item_id) {
            const { data: roadmapItem } = await supabase
              .from("project_roadmap_items")
              .select("title, phase")
              .eq("id", task.roadmap_item_id)
              .single();
            roadmap_item = roadmapItem;
          }

          return { ...task, profiles, roadmap_item };
        })
      );

      return tasksWithDetails as TaskForExport[];
    },
    enabled: open,
  });

  const handleExport = async () => {
    if (!tasks || tasks.length === 0) {
      toast.error("No tasks to export");
      return;
    }

    setIsExporting(true);

    try {
      // Filter tasks based on status
      let filteredTasks = tasks;
      if (filterStatus === "active") {
        filteredTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
      } else if (filterStatus === "completed") {
        filteredTasks = tasks.filter((t) => t.status === "completed");
      }

      if (filteredTasks.length === 0) {
        toast.error("No tasks match the selected filter");
        setIsExporting(false);
        return;
      }

      // Build content array
      const content: any[] = [
        // Title
        {
          text: "Site Diary Tasks Report",
          style: "header",
          alignment: "center" as const,
          margin: [0, 0, 0, 5],
        },
        // Subtitle with roadmap info
        {
          text: groupByRoadmap 
            ? "Tasks Grouped by Roadmap Phase" 
            : "All Tasks with Roadmap Links",
          style: "subheader",
          alignment: "center" as const,
          margin: [0, 0, 0, 20],
        },
      ];

      // Project info
      if (project?.project_number) {
        content.push({
          text: `Project: ${project.name} (${project.project_number})`,
          fontSize: 10,
          color: "#6b7280",
          margin: [0, 0, 0, 5],
        });
      }

      content.push({
        text: `Total Tasks: ${filteredTasks.length} | Filter: ${filterStatus === "all" ? "All" : filterStatus === "active" ? "Active Only" : "Completed Only"}`,
        fontSize: 10,
        color: "#6b7280",
        margin: [0, 0, 0, 15],
      });

      // Summary section
      if (includeSummary) {
        content.push(...buildRoadmapTasksSummary(filteredTasks));
      }

      // Tasks section
      content.push({
        text: "Task Details",
        style: "sectionHeader",
        margin: [0, 15, 0, 10],
      });

      content.push(...buildTasksWithRoadmapContent(filteredTasks, { 
        includeRoadmapGrouping: groupByRoadmap 
      }));

      const docDefinition: TDocumentDefinitions = {
        pageSize: "A4",
        pageMargins: [40, 60, 40, 60],
        header: {
          columns: [
            {
              text: project?.name || "Project Tasks",
              alignment: "left" as const,
              margin: [40, 20, 0, 0],
              fontSize: 10,
              color: "#6b7280",
            },
            {
              text: format(new Date(), "MMM d, yyyy"),
              alignment: "right" as const,
              margin: [0, 20, 40, 0],
              fontSize: 10,
              color: "#6b7280",
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => ({
          columns: [
            {
              text: "Generated from Site Diary",
              alignment: "left" as const,
              margin: [40, 0, 0, 0],
              fontSize: 8,
              color: "#9ca3af",
            },
            {
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: "right" as const,
              margin: [0, 0, 40, 0],
              fontSize: 8,
              color: "#9ca3af",
            },
          ],
        }),
        content,
        styles: {
          header: {
            fontSize: 20,
            bold: true,
            color: "#1f2937",
          },
          subheader: {
            fontSize: 12,
            color: "#6b7280",
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: "#374151",
          },
          tableHeader: {
            fontSize: 10,
            bold: true,
            color: "#374151",
            fillColor: "#f3f4f6",
          },
        },
        defaultStyle: {
          fontSize: 10,
        },
      };

      const pdfDoc = pdfMake.createPdf(docDefinition);
      const fileName = `Tasks-${project?.name || "Export"}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      
      pdfDoc.download(fileName);
      toast.success("Tasks exported to PDF");
      setOpen(false);
    } catch (error) {
      console.error("Error exporting tasks:", error);
      toast.error("Failed to export tasks");
    } finally {
      setIsExporting(false);
    }
  };

  const linkedCount = tasks?.filter((t) => t.roadmap_item).length || 0;
  const totalCount = tasks?.length || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Tasks
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Tasks to PDF
          </DialogTitle>
          <DialogDescription>
            Export tasks with roadmap context and progress tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stats */}
          <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-4">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-primary">{linkedCount}</p>
              <p className="text-xs text-muted-foreground">Roadmap Linked</p>
            </div>
          </div>

          {/* Filter by status */}
          <div className="space-y-2">
            <Label>Task Status Filter</Label>
            <RadioGroup value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal">All Tasks</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="font-normal">Active Only (Pending + In Progress)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="completed" />
                <Label htmlFor="completed" className="font-normal">Completed Only</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Export Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="groupByRoadmap"
                checked={groupByRoadmap}
                onCheckedChange={(checked) => setGroupByRoadmap(!!checked)}
              />
              <Label htmlFor="groupByRoadmap" className="font-normal flex items-center gap-1">
                <Map className="h-4 w-4 text-primary" />
                Group tasks by Roadmap Phase
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSummary"
                checked={includeSummary}
                onCheckedChange={(checked) => setIncludeSummary(!!checked)}
              />
              <Label htmlFor="includeSummary" className="font-normal">
                Include summary statistics
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !tasks?.length}>
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
