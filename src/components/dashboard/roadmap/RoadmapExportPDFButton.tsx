/**
 * Project Roadmap PDF Export Button
 * Clean pdfmake implementation - no jsPDF
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  createDocument, 
  fetchCompanyDetails, 
  generateCoverPageContent,
} from "@/utils/pdfmake";
import {
  buildProjectRoadmapContent,
  type ProjectRoadmapData,
  type RoadmapExportOptions,
} from "@/utils/pdfmake/projectRoadmapBuilder";

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

  // Fetch project data
  const { data: projectData, isLoading } = useQuery({
    queryKey: ["project-roadmap-export", projectId],
    queryFn: async (): Promise<ProjectRoadmapData> => {
      // Fetch project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, name, client_name, status")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch roadmap items using correct table name
      const { data: items } = await supabase
        .from("project_roadmap_items")
        .select("id, title, phase, priority, start_date, due_date, is_completed, description, comments, parent_id, sort_order")
        .eq("project_id", projectId)
        .order("sort_order");

      // Fetch company settings
      const { data: company } = await supabase
        .from("company_settings")
        .select("company_name, company_logo_url")
        .limit(1)
        .maybeSingle();

      // Map data to clean types
      const mappedItems = (items || []).map((item) => ({
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
      }));

      return {
        project: {
          id: project.id,
          name: project.name,
          client_name: project.client_name || undefined,
          status: project.status || undefined,
        },
        items: mappedItems,
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
      console.log('[RoadmapExport] Starting PDF generation...');
      
      // Build document content
      const roadmapContent = buildProjectRoadmapContent(projectData, options);

      // Create document builder
      const doc = createDocument({ orientation: 'portrait' });

      // Add cover page if enabled
      if (options.includeCoverPage) {
        try {
          const companyDetails = await fetchCompanyDetails();
          const coverContent = await generateCoverPageContent(
            {
              title: 'Project Roadmap Review',
              projectName: projectData.project.name,
              subtitle: 'Flow Diagram & Meeting Notes',
              date: new Date(),
              revision: '1.0',
            },
            companyDetails
          );
          doc.add(coverContent);
          doc.addPageBreak();
        } catch (coverError) {
          console.warn('[RoadmapExport] Cover page failed, continuing without:', coverError);
        }
      }

      // Add roadmap content
      doc.add(roadmapContent);

      // Set document info
      doc.setInfo({
        title: `${projectData.project.name} - Project Roadmap`,
        author: 'EngiOps',
        subject: 'Project Roadmap Review',
        creator: 'EngiOps PDF Export',
      });

      // Add header and footer for all pages
      doc.withStandardHeader('Project Roadmap', projectData.project.name);
      doc.withStandardFooter(true);

      // Generate filename
      const filename = `Roadmap_${projectData.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

      console.log('[RoadmapExport] Downloading PDF:', filename);
      
      // Use direct download - streams to file without memory issues
      await doc.download(filename);

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
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="gap-2"
      >
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
            <div className="text-sm text-muted-foreground">
              Configure your export options below.
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Include in Export</h4>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="coverPage"
                  checked={options.includeCoverPage}
                  onCheckedChange={() => handleOptionChange("includeCoverPage")}
                />
                <Label htmlFor="coverPage" className="text-sm">
                  Cover Page
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="meetingHeader"
                  checked={options.includeMeetingHeader}
                  onCheckedChange={() => handleOptionChange("includeMeetingHeader")}
                />
                <Label htmlFor="meetingHeader" className="text-sm">
                  Meeting Header
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completed"
                  checked={options.includeCompleted}
                  onCheckedChange={() => handleOptionChange("includeCompleted")}
                />
                <Label htmlFor="completed" className="text-sm">
                  Completed Items
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pending"
                  checked={options.includePending}
                  onCheckedChange={() => handleOptionChange("includePending")}
                />
                <Label htmlFor="pending" className="text-sm">
                  Pending Items
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="actionItems"
                  checked={options.includeActionItems}
                  onCheckedChange={() => handleOptionChange("includeActionItems")}
                />
                <Label htmlFor="actionItems" className="text-sm">
                  Action Items Section
                </Label>
              </div>
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
                <div className="text-muted-foreground">
                  {projectData.items.length} roadmap items
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || isLoading || !projectData}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
