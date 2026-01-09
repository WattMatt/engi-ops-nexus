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
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { getDueDateStatus } from "@/utils/roadmapReviewCalculations";

interface RoadmapExportPDFButtonProps {
  projectId: string;
}

interface ExportOptions {
  includeCompleted: boolean;
  includePending: boolean;
  includeNotes: boolean;
  includeProgressChart: boolean;
}

// PDF styling constants
const PDF_COLORS = {
  primary: [30, 58, 138] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  gray: [148, 163, 184] as [number, number, number],
  lightGray: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export function RoadmapExportPDFButton({ projectId }: RoadmapExportPDFButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeCompleted: true,
    includePending: true,
    includeNotes: true,
    includeProgressChart: true,
  });

  // Fetch project and roadmap data
  const { data: projectData } = useQuery({
    queryKey: ["project-roadmap-export", projectId],
    queryFn: async () => {
      const [projectRes, itemsRes, membersRes, companyRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("project_roadmap_items").select("*").eq("project_id", projectId).order("due_date"),
        supabase.from("project_members").select(`
          id, role, user_id,
          profiles:user_id (full_name, email)
        `).eq("project_id", projectId),
        supabase.from("company_settings").select("company_name, company_logo_url").limit(1).single(),
      ]);

      return {
        project: projectRes.data,
        items: itemsRes.data || [],
        members: membersRes.data || [],
        company: companyRes.data,
      };
    },
    enabled: showDialog,
  });

  const generatePDF = async () => {
    if (!projectData?.project) {
      toast.error("Project data not available");
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margins = { top: 20, bottom: 20, left: 18, right: 18 };
      const contentWidth = pageWidth - margins.left - margins.right;

      const { project, items, members, company } = projectData;
      const pendingItems = items.filter((item) => !item.is_completed);
      const completedItems = items.filter((item) => item.is_completed);
      const progress = items.length > 0 
        ? Math.round((completedItems.length / items.length) * 100) 
        : 0;

      // Sort pending items by due date and overdue status
      pendingItems.sort((a, b) => {
        const aStatus = getDueDateStatus(a.due_date);
        const bStatus = getDueDateStatus(b.due_date);
        if (aStatus === "overdue" && bStatus !== "overdue") return -1;
        if (bStatus === "overdue" && aStatus !== "overdue") return 1;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      // === COVER PAGE ===
      // Header background
      doc.setFillColor(...PDF_COLORS.primary);
      doc.rect(0, 0, pageWidth, 80, "F");

      // Company logo or name
      if (company?.company_logo_url) {
        try {
          doc.addImage(company.company_logo_url, "PNG", margins.left, 15, 40, 15);
        } catch {
          doc.setTextColor(...PDF_COLORS.white);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(company?.company_name || "Project Roadmap", margins.left, 25);
        }
      } else if (company?.company_name) {
        doc.setTextColor(...PDF_COLORS.white);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(company.company_name, margins.left, 25);
      }

      // Project title
      doc.setTextColor(...PDF_COLORS.white);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      const projectName = project.name.length > 35 
        ? project.name.substring(0, 32) + "..." 
        : project.name;
      doc.text(projectName, margins.left, 50);

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Project Roadmap Report", margins.left, 62);

      // Progress badge
      const progressColor = progress >= 70 ? PDF_COLORS.success : 
        progress >= 40 ? PDF_COLORS.warning : PDF_COLORS.danger;
      doc.setFillColor(...progressColor);
      doc.roundedRect(pageWidth - margins.right - 30, 45, 25, 14, 3, 3, "F");
      doc.setTextColor(...PDF_COLORS.white);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${progress}%`, pageWidth - margins.right - 17.5, 54, { align: "center" });

      // Project details section
      let yPos = 95;

      doc.setTextColor(...PDF_COLORS.primary);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Project Overview", margins.left, yPos);
      yPos += 10;

      // Summary stats
      const statsData = [
        ["Total Items", String(items.length)],
        ["Completed", String(completedItems.length)],
        ["Pending", String(pendingItems.length)],
        ["Overdue", String(pendingItems.filter(i => getDueDateStatus(i.due_date) === "overdue").length)],
        ["Progress", `${progress}%`],
      ];

      autoTable(doc, {
        startY: yPos,
        body: statsData,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 40 },
          1: { cellWidth: 30 },
        },
        margin: { left: margins.left },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Team members
      if (members.length > 0) {
        doc.setTextColor(...PDF_COLORS.primary);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Team Members", margins.left, yPos);
        yPos += 6;

        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const teamNames = members
          .map((m) => (m.profiles as any)?.full_name || "Unknown")
          .slice(0, 6)
          .join(", ");
        doc.text(teamNames + (members.length > 6 ? ` +${members.length - 6} more` : ""), margins.left, yPos);
        yPos += 15;
      }

      // Generation info
      doc.setTextColor(...PDF_COLORS.gray);
      doc.setFontSize(9);
      doc.text(`Generated: ${format(new Date(), "PPPP 'at' p")}`, margins.left, yPos);

      // === PENDING ITEMS PAGE ===
      if (options.includePending && pendingItems.length > 0) {
        doc.addPage();
        yPos = margins.top;

        // Header
        doc.setFillColor(...PDF_COLORS.primary);
        doc.rect(0, 0, pageWidth, 18, "F");
        doc.setTextColor(...PDF_COLORS.white);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${project.name} - Pending Items`, margins.left, 12);

        yPos = 30;

        doc.setTextColor(...PDF_COLORS.primary);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Pending Items (${pendingItems.length})`, margins.left, yPos);
        yPos += 8;

        const pendingTableData = pendingItems.map((item) => {
          const dueStatus = getDueDateStatus(item.due_date);
          return [
            item.title.length > 40 ? item.title.substring(0, 37) + "..." : item.title,
            item.due_date ? format(new Date(item.due_date), "MMM d, yyyy") : "-",
            (item.priority || "Normal").charAt(0).toUpperCase() + (item.priority || "normal").slice(1),
            dueStatus === "overdue" ? "OVERDUE" : dueStatus === "soon" ? "Due Soon" : "Pending",
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [["Task", "Due Date", "Priority", "Status"]],
          body: pendingTableData,
          theme: "striped",
          headStyles: {
            fillColor: PDF_COLORS.primary,
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: "bold",
          },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: PDF_COLORS.lightGray },
          margin: { left: margins.left, right: margins.right },
          tableWidth: contentWidth,
          columnStyles: {
            0: { cellWidth: contentWidth * 0.45 },
            1: { cellWidth: contentWidth * 0.20, halign: "center" },
            2: { cellWidth: contentWidth * 0.15, halign: "center" },
            3: { cellWidth: contentWidth * 0.20, halign: "center" },
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 3) {
              const cellValue = data.cell.raw as string;
              if (cellValue === "OVERDUE") {
                data.cell.styles.textColor = PDF_COLORS.danger;
                data.cell.styles.fontStyle = "bold";
              } else if (cellValue === "Due Soon") {
                data.cell.styles.textColor = PDF_COLORS.warning;
              }
            }
          },
        });

        // Notes section
        if (options.includeNotes) {
          yPos = (doc as any).lastAutoTable.finalY + 15;

          // Check if we need a new page
          if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = margins.top + 10;
          }

          doc.setDrawColor(...PDF_COLORS.primary);
          doc.setLineWidth(0.5);
          doc.line(margins.left, yPos, margins.left + 50, yPos);
          yPos += 6;

          doc.setTextColor(...PDF_COLORS.primary);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Notes & Actions", margins.left, yPos);
          yPos += 8;

          // Draw lines for notes
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          for (let i = 0; i < 5; i++) {
            doc.line(margins.left, yPos + i * 8, pageWidth - margins.right, yPos + i * 8);
          }
        }
      }

      // === COMPLETED ITEMS PAGE ===
      if (options.includeCompleted && completedItems.length > 0) {
        doc.addPage();
        yPos = margins.top;

        // Header
        doc.setFillColor(...PDF_COLORS.success);
        doc.rect(0, 0, pageWidth, 18, "F");
        doc.setTextColor(...PDF_COLORS.white);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${project.name} - Completed Items`, margins.left, 12);

        yPos = 30;

        doc.setTextColor(...PDF_COLORS.success);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Completed Items (${completedItems.length})`, margins.left, yPos);
        yPos += 8;

        const completedTableData = completedItems.map((item) => [
          item.title.length > 50 ? item.title.substring(0, 47) + "..." : item.title,
          (item.priority || "Normal").charAt(0).toUpperCase() + (item.priority || "normal").slice(1),
          "✓ Done",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Task", "Priority", "Status"]],
          body: completedTableData,
          theme: "striped",
          headStyles: {
            fillColor: PDF_COLORS.success,
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: "bold",
          },
          bodyStyles: { fontSize: 8, textColor: [100, 100, 100] },
          alternateRowStyles: { fillColor: [245, 255, 245] },
          margin: { left: margins.left, right: margins.right },
          tableWidth: contentWidth,
          columnStyles: {
            0: { cellWidth: contentWidth * 0.60 },
            1: { cellWidth: contentWidth * 0.20, halign: "center" },
            2: { cellWidth: contentWidth * 0.20, halign: "center" },
          },
        });
      }

      // Add page numbers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...PDF_COLORS.gray);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        doc.text(
          "Confidential - For Internal Use Only",
          margins.left,
          pageHeight - 10
        );
      }

      // Save the PDF
      const filename = `${project.name.replace(/[^a-z0-9]/gi, "_")}_Roadmap_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
      
      toast.success("Roadmap PDF exported successfully!");
      setShowDialog(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        <Download className="h-4 w-4 mr-2" />
        Export PDF
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Export Roadmap PDF
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Select what to include in the exported PDF report.
            </p>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pending"
                  checked={options.includePending}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includePending: !!checked }))
                  }
                />
                <Label htmlFor="pending" className="cursor-pointer">
                  Pending Items
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completed"
                  checked={options.includeCompleted}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeCompleted: !!checked }))
                  }
                />
                <Label htmlFor="completed" className="cursor-pointer">
                  Completed Items
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notes"
                  checked={options.includeNotes}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeNotes: !!checked }))
                  }
                />
                <Label htmlFor="notes" className="cursor-pointer">
                  Notes Section (for handwriting)
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={generatePDF} disabled={isExporting || !projectData}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
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
