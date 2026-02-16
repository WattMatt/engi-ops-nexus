/**
 * Project Roadmap PDF Export Button — SVG engine
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { svgPagesToDownload } from "@/utils/svg-pdf/svgToPdfEngine";
import { buildRoadmapExportPdf, type RoadmapExportPdfData } from "@/utils/svg-pdf/roadmapExportPdfBuilder";
import { imageToBase64 } from "@/utils/svg-pdf/imageUtils";

interface RoadmapExportPDFButtonProps {
  projectId: string;
}

interface ExportOptions {
  includeCompleted: boolean;
  includePending: boolean;
  includeActionItems: boolean;
  includeMeetingHeader: boolean;
  includeCoverPage: boolean;
}

export function RoadmapExportPDFButton({ projectId }: RoadmapExportPDFButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeCompleted: true,
    includePending: true,
    includeActionItems: true,
    includeMeetingHeader: true,
    includeCoverPage: true,
  });

  const { data: projectData, isLoading } = useQuery({
    queryKey: ["project-roadmap-export", projectId],
    queryFn: async () => {
      const { data: project, error } = await supabase
        .from("projects")
        .select("id, name, client_name, status")
        .eq("id", projectId)
        .single();
      if (error) throw error;

      const { data: items } = await supabase
        .from("project_roadmap_items")
        .select("id, title, phase, priority, start_date, due_date, is_completed, description, comments, parent_id, sort_order")
        .eq("project_id", projectId)
        .order("sort_order");

      const { data: company } = await supabase
        .from("company_settings")
        .select("company_name, company_logo_url")
        .limit(1)
        .maybeSingle();

      return {
        project: {
          id: project.id,
          name: project.name,
          client_name: project.client_name || undefined,
          status: project.status || undefined,
        },
        items: (items || []).map(item => ({
          id: item.id,
          title: item.title,
          phase: item.phase || undefined,
          priority: item.priority || undefined,
          start_date: item.start_date || undefined,
          due_date: item.due_date || undefined,
          is_completed: item.is_completed || undefined,
          description: item.description || undefined,
          comments: item.comments || undefined,
          parent_id: item.parent_id,
          sort_order: item.sort_order || undefined,
        })),
        company: company ? {
          company_name: company.company_name || undefined,
          company_logo_url: company.company_logo_url || undefined,
        } : undefined,
      };
    },
    enabled: isDialogOpen,
  });

  const handleExport = async () => {
    if (!projectData?.project) {
      toast.error("Project data not available");
      return;
    }

    setIsExporting(true);
    try {
      let logoBase64: string | null = null;
      if (projectData.company?.company_logo_url) {
        try { logoBase64 = await imageToBase64(projectData.company.company_logo_url); } catch {}
      }

      const pdfData: RoadmapExportPdfData = {
        coverData: options.includeCoverPage ? {
          reportTitle: 'PROJECT ROADMAP',
          reportSubtitle: 'Flow Diagram & Meeting Notes',
          projectName: projectData.project.name,
          date: format(new Date(), 'dd MMMM yyyy'),
          revision: '1.0',
          companyLogoBase64: logoBase64,
          companyName: projectData.company?.company_name,
        } : undefined,
        project: projectData.project,
        items: projectData.items,
        options,
      };

      const svgPages = buildRoadmapExportPdf(pdfData);
      const filename = `Roadmap_${projectData.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      await svgPagesToDownload(svgPages, { filename });

      toast.success("PDF exported successfully");
      setIsDialogOpen(false);
    } catch (error) {
      console.error('[RoadmapExport] Export failed:', error);
      toast.error(error instanceof Error ? error.message : "Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleOptionChange = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2">
        <FileText className="h-4 w-4" />
        Export PDF
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Export Project Roadmap
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">Configure your export options below.</div>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Include in Export</h4>
              {([
                ['coverPage', 'includeCoverPage', 'Cover Page'],
                ['meetingHeader', 'includeMeetingHeader', 'Meeting Header'],
                ['completed', 'includeCompleted', 'Completed Items'],
                ['pending', 'includePending', 'Pending Items'],
                ['actionItems', 'includeActionItems', 'Action Items Section'],
              ] as const).map(([id, key, label]) => (
                <div key={id} className="flex items-center space-x-2">
                  <Checkbox id={id} checked={options[key]} onCheckedChange={() => handleOptionChange(key)} />
                  <Label htmlFor={id} className="text-sm">{label}</Label>
                </div>
              ))}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading project data...</span>
              </div>
            )}

            {projectData && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="font-medium">{projectData.project.name}</div>
                <div className="text-muted-foreground">{projectData.items.length} roadmap items</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting || isLoading || !projectData} className="gap-2">
              {isExporting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
              ) : (
                <><Download className="h-4 w-4" />Export PDF</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
