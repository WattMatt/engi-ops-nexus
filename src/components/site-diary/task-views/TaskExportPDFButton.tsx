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
import { Download, FileText, Map, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildSiteDiaryPdf, type SiteDiaryPdfData } from "@/utils/svg-pdf/siteDiaryPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";

interface TaskExportPDFButtonProps {
  projectId: string;
}

export const TaskExportPDFButton = ({ projectId }: TaskExportPDFButtonProps) => {
  const [open, setOpen] = useState(false);
  const [groupByRoadmap, setGroupByRoadmap] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");

  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

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
        .select(`id, title, status, priority, due_date, assigned_to, progress, roadmap_item_id`)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const tasksWithDetails = await Promise.all(
        (data || []).map(async (task) => {
          let assigned_to_name: string | undefined;
          let roadmap_phase: string | undefined;
          let roadmap_title: string | undefined;

          if (task.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.assigned_to)
              .single();
            assigned_to_name = profile?.full_name || undefined;
          }

          if (task.roadmap_item_id) {
            const { data: roadmapItem } = await supabase
              .from("project_roadmap_items")
              .select("title, phase")
              .eq("id", task.roadmap_item_id)
              .single();
            roadmap_phase = roadmapItem?.phase || undefined;
            roadmap_title = roadmapItem?.title || undefined;
          }

          return { ...task, assigned_to_name, roadmap_phase, roadmap_title };
        })
      );
      return tasksWithDetails;
    },
    enabled: open,
  });

  const handleExport = async () => {
    if (!tasks || tasks.length === 0) return;

    let filteredTasks = tasks;
    if (filterStatus === "active") {
      filteredTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
    } else if (filterStatus === "completed") {
      filteredTasks = tasks.filter((t) => t.status === "completed");
    }

    if (filteredTasks.length === 0) return;

    const filterLabel = filterStatus === "all" ? "All Tasks" : filterStatus === "active" ? "Active Only" : "Completed Only";

    const buildFn = async () => {
      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: "Site Diary Tasks",
        reportSubtitle: groupByRoadmap ? "Tasks Grouped by Roadmap Phase" : "All Tasks",
        projectName: project?.name || "Project",
        projectNumber: project?.project_number || undefined,
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
      };

      const pdfData: SiteDiaryPdfData = {
        coverData,
        tasks: filteredTasks,
        projectName: project?.name || "Project",
        filterLabel,
      };
      return buildSiteDiaryPdf(pdfData);
    };

    await generateAndPersist(buildFn, {
      storageBucket: "site-diary-reports",
      dbTable: "site_diary_reports",
      foreignKeyColumn: "project_id",
      foreignKeyValue: projectId,
      projectId,
      reportName: `Site_Diary_Tasks_${project?.name || "Export"}`,
    });

    setOpen(false);
  };

  const linkedCount = tasks?.filter((t) => t.roadmap_title).length || 0;
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

          <div className="space-y-2">
            <Label>Task Status Filter</Label>
            <RadioGroup value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal">All Tasks</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="font-normal">Active Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="completed" />
                <Label htmlFor="completed" className="font-normal">Completed Only</Label>
              </div>
            </RadioGroup>
          </div>

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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isGenerating || !tasks?.length}>
            {isGenerating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              "Export PDF"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
