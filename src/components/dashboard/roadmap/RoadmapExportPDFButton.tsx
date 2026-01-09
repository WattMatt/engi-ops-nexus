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
import jsPDF from "jspdf";
import { format } from "date-fns";
import { getDueDateStatus } from "@/utils/roadmapReviewCalculations";
import { 
  initializePDF, 
  addPageNumbers, 
  STANDARD_MARGINS,
  checkPageBreak 
} from "@/utils/pdfExportBase";
import { generateCoverPage } from "@/utils/pdfCoverPageSimple";
import { 
  PDF_BRAND_COLORS, 
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  getPriorityColor,
  getHealthColor 
} from "@/utils/roadmapReviewPdfStyles";

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

interface RoadmapItem {
  id: string;
  title: string;
  phase?: string;
  priority?: string;
  start_date?: string;
  due_date?: string;
  is_completed?: boolean;
  description?: string;
  parent_id?: string | null;
}

// Phase colors for visual flow
const PHASE_COLORS: { [key: string]: [number, number, number] } = {
  "Planning & Preparation": PDF_BRAND_COLORS.primaryLight,
  "Budget & Assessment": PDF_BRAND_COLORS.success,
  "Tender & Procurement": PDF_BRAND_COLORS.warning,
  "Construction": PDF_BRAND_COLORS.danger,
  "Commissioning": [139, 92, 246],
  "Handover": [6, 182, 212],
  default: PDF_BRAND_COLORS.gray,
};

export function RoadmapExportPDFButton({ projectId }: RoadmapExportPDFButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeCompleted: true,
    includePending: true,
    includeActionItems: true,
    includeMeetingHeader: true,
    includeCoverPage: true,
  });

  // Fetch project and roadmap data
  const { data: projectData } = useQuery({
    queryKey: ["project-roadmap-export", projectId],
    queryFn: async () => {
      const [projectRes, itemsRes, membersRes, companyRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("project_roadmap_items").select("*").eq("project_id", projectId).order("sort_order"),
        supabase.from("project_members").select(`
          id, role, user_id,
          profiles:user_id (full_name, email)
        `).eq("project_id", projectId),
        supabase.from("company_settings").select("company_name, company_logo_url").limit(1).single(),
      ]);

      return {
        project: projectRes.data,
        items: (itemsRes.data || []) as RoadmapItem[],
        members: membersRes.data || [],
        company: companyRes.data,
      };
    },
    enabled: showDialog,
  });

  const getPhaseColor = (phase: string): [number, number, number] => {
    return PHASE_COLORS[phase] || PHASE_COLORS.default;
  };

  const generateFlowDiagramPDF = async () => {
    if (!projectData?.project) {
      toast.error("Project data not available");
      return;
    }

    setIsExporting(true);

    try {
      // Use standardized PDF initialization
      const doc = initializePDF({ orientation: 'portrait' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margins = PDF_LAYOUT.margins;
      const contentWidth = pageWidth - margins.left - margins.right;

      const { project, items, company } = projectData;
      
      // Filter items based on options
      const pendingItems = items.filter((item) => !item.is_completed);
      const completedItems = items.filter((item) => item.is_completed);
      const displayItems = [
        ...(options.includePending ? pendingItems : []),
        ...(options.includeCompleted ? completedItems : []),
      ];

      // Group items by phase
      const groupedByPhase = displayItems.reduce((acc, item) => {
        const phase = item.phase || "Uncategorized";
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(item);
        return acc;
      }, {} as Record<string, RoadmapItem[]>);

      const phases = Object.keys(groupedByPhase);
      const progress = items.length > 0 
        ? Math.round((completedItems.length / items.length) * 100) 
        : 0;

      // === COVER PAGE ===
      if (options.includeCoverPage) {
        await generateCoverPage(doc, {
          project_name: project.name,
          client_name: project.client_name || '',
          report_title: 'Project Roadmap Review',
          report_date: format(new Date(), 'MMMM d, yyyy'),
          revision: '1.0',
          subtitle: 'Flow Diagram & Meeting Notes',
          project_id: projectId,
        });
        doc.addPage();
      }

      let yPos = margins.top;

      // === MEETING HEADER ===
      if (options.includeMeetingHeader) {
        doc.setFillColor(...PDF_BRAND_COLORS.lightGray);
        doc.roundedRect(margins.left, yPos, contentWidth, 35, 3, 3, "F");
        
        doc.setTextColor(...PDF_BRAND_COLORS.text);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h1);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Project Roadmap Review Meeting", margins.left + 5, yPos + 10);
        
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
        doc.setFont(PDF_TYPOGRAPHY.fonts.body, "normal");
        doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
        doc.text(`Date: ${format(new Date(), "PPPP")}`, margins.left + 5, yPos + 18);
        
        // Editable fields
        doc.text("Attendees: _______________________________________", margins.left + 5, yPos + 26);
        doc.text("Chairperson: ____________________", pageWidth - margins.right - 60, yPos + 26);
        
        yPos += 42;
      }

      // === PROJECT HEADER ===
      doc.setFillColor(...PDF_BRAND_COLORS.primary);
      doc.roundedRect(margins.left, yPos, contentWidth, 25, 3, 3, "F");
      
      doc.setTextColor(...PDF_BRAND_COLORS.white);
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.h1);
      doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
      const projectName = project.name.length > 40 
        ? project.name.substring(0, 37) + "..." 
        : project.name;
      doc.text(projectName, margins.left + 5, yPos + 10);
      
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
      doc.setFont(PDF_TYPOGRAPHY.fonts.body, "normal");
      doc.text("Project Roadmap Flow Diagram", margins.left + 5, yPos + 18);

      // Progress circle
      const circleX = pageWidth - margins.right - 15;
      const circleY = yPos + 12.5;
      const progressColor = getHealthColor(progress);
      doc.setFillColor(...progressColor);
      doc.circle(circleX, circleY, 10, "F");
      doc.setTextColor(...PDF_BRAND_COLORS.white);
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
      doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
      doc.text(`${progress}%`, circleX, circleY + 1, { align: "center" });
      
      yPos += 32;

      // === QUICK STATS ROW ===
      const statsBoxWidth = contentWidth / 4 - 3;
      const overdueCount = pendingItems.filter(i => getDueDateStatus(i.due_date) === "overdue").length;
      const stats = [
        { label: "Total", value: items.length, color: PDF_BRAND_COLORS.primary },
        { label: "Pending", value: pendingItems.length, color: PDF_BRAND_COLORS.warning },
        { label: "Completed", value: completedItems.length, color: PDF_BRAND_COLORS.success },
        { label: "Overdue", value: overdueCount, color: PDF_BRAND_COLORS.danger },
      ];
      
      stats.forEach((stat, i) => {
        const boxX = margins.left + i * (statsBoxWidth + 4);
        doc.setFillColor(...stat.color);
        doc.roundedRect(boxX, yPos, statsBoxWidth, 12, 2, 2, "F");
        doc.setTextColor(...PDF_BRAND_COLORS.white);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
        doc.setFont(PDF_TYPOGRAPHY.fonts.body, "normal");
        doc.text(stat.label, boxX + 3, yPos + 4);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text(String(stat.value), boxX + statsBoxWidth - 4, yPos + 9, { align: "right" });
      });
      
      yPos += 20;

      // === FLOW DIAGRAM - PHASES ===
      const cardWidth = contentWidth - 10;
      const itemHeight = 22;
      const phaseHeaderHeight = 14;
      const timelineX = margins.left + 5;

      for (const phase of phases) {
        const phaseItems = groupedByPhase[phase];
        const phaseColor = getPhaseColor(phase);
        
        // Check if we need a new page
        const requiredHeight = phaseHeaderHeight + (phaseItems.length * itemHeight) + 15;
        if (yPos + requiredHeight > pageHeight - margins.bottom) {
          doc.addPage();
          yPos = margins.top;
        }

        // Phase header with timeline node
        doc.setFillColor(...phaseColor);
        doc.circle(timelineX, yPos + 5, 4, "F");
        
        // Timeline line
        doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
        doc.setLineWidth(1);
        doc.line(timelineX, yPos + 10, timelineX, yPos + phaseHeaderHeight + (phaseItems.length * itemHeight) + 5);
        
        // Phase title bar
        doc.setFillColor(...phaseColor);
        doc.roundedRect(margins.left + 12, yPos, cardWidth - 10, phaseHeaderHeight, 2, 2, "F");
        doc.setTextColor(...PDF_BRAND_COLORS.white);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text(phase, margins.left + 16, yPos + 9);
        
        // Phase progress
        const phaseCompleted = phaseItems.filter(i => i.is_completed).length;
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
        doc.text(`${phaseCompleted}/${phaseItems.length}`, pageWidth - margins.right - 8, yPos + 9, { align: "right" });
        
        yPos += phaseHeaderHeight + 3;

        // Items within phase
        for (const item of phaseItems) {
          const dueStatus = getDueDateStatus(item.due_date);
          const isCompleted = item.is_completed;
          
          // Item card background colors
          const cardBg = isCompleted ? [187, 247, 208] as [number, number, number] : 
            dueStatus === "overdue" ? [254, 226, 226] as [number, number, number] :
            dueStatus === "soon" ? [254, 243, 199] as [number, number, number] : PDF_BRAND_COLORS.white;
          
          doc.setFillColor(...cardBg);
          doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
          doc.setLineWidth(0.3);
          doc.roundedRect(margins.left + 12, yPos, cardWidth - 10, itemHeight - 2, 2, 2, "FD");
          
          // Status indicator
          const statusColor = isCompleted ? PDF_BRAND_COLORS.success : 
            dueStatus === "overdue" ? PDF_BRAND_COLORS.danger :
            dueStatus === "soon" ? PDF_BRAND_COLORS.warning : PDF_BRAND_COLORS.gray;
          doc.setFillColor(...statusColor);
          doc.circle(margins.left + 18, yPos + (itemHeight - 2) / 2, 2.5, "F");
          
          // Checkmark if completed
          doc.setTextColor(...PDF_BRAND_COLORS.white);
          doc.setFontSize(PDF_TYPOGRAPHY.sizes.caption);
          if (isCompleted) {
            doc.text("✓", margins.left + 18, yPos + (itemHeight - 2) / 2 + 0.5, { align: "center" });
          }
          
          // Item title
          doc.setTextColor(...PDF_BRAND_COLORS.text);
          doc.setFontSize(PDF_TYPOGRAPHY.sizes.body - 1);
          doc.setFont(PDF_TYPOGRAPHY.fonts.body, isCompleted ? "normal" : "bold");
          const title = item.title.length > 40 ? item.title.substring(0, 37) + "..." : item.title;
          doc.text(title, margins.left + 25, yPos + 6);
          
          // Date range display (start_date → due_date)
          const hasStartDate = item.start_date;
          const hasDueDate = item.due_date;
          
          if (hasStartDate || hasDueDate) {
            doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
            doc.setFont(PDF_TYPOGRAPHY.fonts.body, "normal");
            doc.setTextColor(...statusColor);
            
            let dateStr = "";
            if (hasStartDate && hasDueDate) {
              dateStr = `${format(new Date(item.start_date!), "MMM d")} → ${format(new Date(item.due_date!), "MMM d, yyyy")}`;
            } else if (hasDueDate) {
              dateStr = `Due: ${format(new Date(item.due_date!), "MMM d, yyyy")}`;
            } else if (hasStartDate) {
              dateStr = `Start: ${format(new Date(item.start_date!), "MMM d, yyyy")}`;
            }
            doc.text(dateStr, margins.left + 25, yPos + 12);
          }
          
          // Priority badge
          if (item.priority && item.priority !== "normal") {
            const priorityColor = getPriorityColor(item.priority);
            doc.setFillColor(...priorityColor);
            const priorityX = pageWidth - margins.right - 30;
            doc.roundedRect(priorityX, yPos + 2, 18, 6, 1, 1, "F");
            doc.setTextColor(...PDF_BRAND_COLORS.white);
            doc.setFontSize(PDF_TYPOGRAPHY.sizes.caption);
            doc.text(item.priority.toUpperCase(), priorityX + 9, yPos + 6, { align: "center" });
          }
          
          // Comment line (for handwriting during meeting)
          if (options.includeActionItems) {
            doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
            doc.setLineWidth(0.2);
            const lineY = yPos + 16;
            doc.line(margins.left + 25, lineY, pageWidth - margins.right - 15, lineY);
            doc.setFontSize(PDF_TYPOGRAPHY.sizes.caption - 1);
            doc.setTextColor(...PDF_BRAND_COLORS.gray);
            doc.text("Action/Comment:", margins.left + 25, lineY - 1);
          }
          
          yPos += itemHeight;
        }
        
        yPos += PDF_LAYOUT.spacing.element * 2;
      }

      // === MEETING NOTES PAGE ===
      if (options.includeActionItems) {
        doc.addPage();
        yPos = margins.top;
        
        doc.setFillColor(...PDF_BRAND_COLORS.primary);
        doc.roundedRect(margins.left, yPos, contentWidth, 15, 3, 3, "F");
        doc.setTextColor(...PDF_BRAND_COLORS.white);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Meeting Notes & Action Items", margins.left + 5, yPos + 10);
        
        yPos += 22;
        
        // Key decisions section
        doc.setTextColor(...PDF_BRAND_COLORS.primary);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Key Decisions", margins.left, yPos);
        yPos += 5;
        
        doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
        doc.setLineWidth(0.3);
        for (let i = 0; i < 5; i++) {
          doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
          doc.rect(margins.left, yPos, contentWidth, 10, "FD");
          yPos += 10;
        }
        
        yPos += 10;
        
        // Action items table
        doc.setTextColor(...PDF_BRAND_COLORS.primary);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Action Items", margins.left, yPos);
        yPos += 5;
        
        // Header row
        doc.setFillColor(...PDF_BRAND_COLORS.tableHeader);
        doc.rect(margins.left, yPos, contentWidth, 8, "F");
        doc.setTextColor(...PDF_BRAND_COLORS.white);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
        doc.text("Action", margins.left + 3, yPos + 5);
        doc.text("Owner", margins.left + 100, yPos + 5);
        doc.text("Due Date", margins.left + 135, yPos + 5);
        doc.text("Status", margins.left + 165, yPos + 5);
        yPos += 8;
        
        // Empty rows for handwriting
        for (let i = 0; i < 8; i++) {
          doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
          doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
          doc.rect(margins.left, yPos, contentWidth, 12, "FD");
          // Vertical lines for columns
          doc.line(margins.left + 97, yPos, margins.left + 97, yPos + 12);
          doc.line(margins.left + 132, yPos, margins.left + 132, yPos + 12);
          doc.line(margins.left + 162, yPos, margins.left + 162, yPos + 12);
          yPos += 12;
        }
        
        yPos += 15;
        
        // Follow-up section
        doc.setTextColor(...PDF_BRAND_COLORS.primary);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Next Meeting / Follow-up", margins.left, yPos);
        yPos += 5;
        
        doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
        doc.rect(margins.left, yPos, contentWidth, 25, "D");
        
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
        doc.setTextColor(...PDF_BRAND_COLORS.gray);
        doc.text("Date: _______________  Time: _______________  Location: _______________________", margins.left + 5, yPos + 8);
        doc.text("Agenda Items:", margins.left + 5, yPos + 16);
        
        yPos += 35;
        
        // Signature section
        doc.setTextColor(...PDF_BRAND_COLORS.primary);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Approval / Sign-off", margins.left, yPos);
        yPos += 8;
        
        const sigWidth = (contentWidth - 10) / 2;
        doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
        doc.rect(margins.left, yPos, sigWidth, 20, "D");
        doc.rect(margins.left + sigWidth + 10, yPos, sigWidth, 20, "D");
        
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
        doc.setTextColor(...PDF_BRAND_COLORS.gray);
        doc.text("Project Manager:", margins.left + 3, yPos + 5);
        doc.text("Client Representative:", margins.left + sigWidth + 13, yPos + 5);
        doc.text("Date:", margins.left + 3, yPos + 17);
        doc.text("Date:", margins.left + sigWidth + 13, yPos + 17);
      }

      // Add page numbers (skip cover page if included)
      addPageNumbers(doc, options.includeCoverPage ? 2 : 1);

      // Save the PDF
      const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_Roadmap_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      toast.success("PDF exported successfully");
      setShowDialog(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Roadmap PDF</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Generate a flow diagram PDF for project review meetings with editable fields for notes and action items.
            </p>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCoverPage"
                  checked={options.includeCoverPage}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeCoverPage: checked === true }))
                  }
                />
                <Label htmlFor="includeCoverPage">Include cover page</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMeetingHeader"
                  checked={options.includeMeetingHeader}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeMeetingHeader: checked === true }))
                  }
                />
                <Label htmlFor="includeMeetingHeader">Include meeting header</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePending"
                  checked={options.includePending}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includePending: checked === true }))
                  }
                />
                <Label htmlFor="includePending">Include pending items</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCompleted"
                  checked={options.includeCompleted}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeCompleted: checked === true }))
                  }
                />
                <Label htmlFor="includeCompleted">Include completed items</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeActionItems"
                  checked={options.includeActionItems}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeActionItems: checked === true }))
                  }
                />
                <Label htmlFor="includeActionItems">Include action items & notes page</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={generateFlowDiagramPDF} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
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
