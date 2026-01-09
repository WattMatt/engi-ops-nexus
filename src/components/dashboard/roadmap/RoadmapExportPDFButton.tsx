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
import { Eye, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { getDueDateStatus } from "@/utils/roadmapReviewCalculations";
import { 
  initializePDF, 
  STANDARD_MARGINS as BASE_MARGINS,
} from "@/utils/pdfExportBase";
import { generateCoverPage } from "@/utils/pdfCoverPageSimple";
import { 
  PDF_BRAND_COLORS, 
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  getPriorityColor,
  getHealthColor 
} from "@/utils/roadmapReviewPdfStyles";
import {
  STANDARD_MARGINS,
  getContentArea,
  CARD_STYLE,
  addAllHeadersAndFooters,
  checkSafePageBreak,
  drawStyledCard,
  drawConnectionLine,
  drawConnectionNode,
  getPhaseColor,
} from "@/utils/pdfStandardsHelper";
import { PDFPreviewBeforeExport } from "@/components/cost-reports/pdf-export/components/PDFPreviewBeforeExport";
import { 
  checkPDFCompliance, 
  createComplianceTracker,
  ComplianceReport,
  ComplianceTrackingData
} from "@/utils/pdfComplianceChecker";

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
  comments?: string;
  parent_id?: string | null;
  sort_order?: number;
}

// Hierarchical node structure
interface RoadmapNode {
  item: RoadmapItem;
  children: RoadmapNode[];
  level: number;
}

// Phase colors - Vibrant professional palette
const PHASE_COLORS: { [key: string]: [number, number, number] } = {
  "Planning & Preparation": [59, 130, 246],   // Blue-500
  "Budget & Assessment": [34, 197, 94],       // Green-500
  "Tender & Procurement": [168, 85, 247],     // Purple-500
  "Construction": [249, 115, 22],             // Orange-500
  "Documentation": [14, 165, 233],            // Sky-500
  "Commissioning": [236, 72, 153],            // Pink-500
  "Handover": [20, 184, 166],                 // Teal-500
  default: [99, 102, 241],                    // Indigo-500
};

// Build hierarchical tree from flat items
function buildItemTree(items: RoadmapItem[]): RoadmapNode[] {
  const itemMap = new Map<string, RoadmapNode>();
  const rootNodes: RoadmapNode[] = [];

  // First pass: create nodes for all items
  items.forEach((item) => {
    itemMap.set(item.id, { item, children: [], level: 0 });
  });

  // Second pass: build parent-child relationships
  items.forEach((item) => {
    const node = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parentNode = itemMap.get(item.parent_id)!;
      node.level = parentNode.level + 1;
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Sort children by sort_order
  const sortChildren = (nodes: RoadmapNode[]) => {
    nodes.sort((a, b) => (a.item.sort_order || 0) - (b.item.sort_order || 0));
    nodes.forEach((node) => sortChildren(node.children));
  };
  sortChildren(rootNodes);

  return rootNodes;
}

// Group root nodes by phase
function groupByPhase(nodes: RoadmapNode[]): Record<string, RoadmapNode[]> {
  return nodes.reduce((acc, node) => {
    const phase = node.item.phase || "Uncategorized";
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(node);
    return acc;
  }, {} as Record<string, RoadmapNode[]>);
}

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
  
  // Preview mode state
  const [showPreview, setShowPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);

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

  const getPhaseColorLocal = (phase: string): [number, number, number] => {
    return PHASE_COLORS[phase] || PHASE_COLORS.default;
  };

  const generateFlowDiagramPDF = async () => {
    if (!projectData?.project) {
      toast.error("Project data not available");
      return;
    }

    setIsExporting(true);
    
    // Initialize compliance tracker
    const complianceData = createComplianceTracker();
    complianceData.hasCoverPage = options.includeCoverPage;
    complianceData.margins = {
      top: STANDARD_MARGINS.top,
      bottom: STANDARD_MARGINS.bottom,
      left: STANDARD_MARGINS.left,
      right: STANDARD_MARGINS.right
    };
    complianceData.headerHeight = 18;
    complianceData.footerHeight = 15;
    complianceData.hasPageNumbers = true;
    complianceData.cardPadding = 4;
    complianceData.colorsUsed.set('primary', PDF_BRAND_COLORS.primary);

    try {
      const doc = initializePDF({ orientation: 'portrait' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margins = PDF_LAYOUT.margins;
      const contentWidth = pageWidth - margins.left - margins.right;
      const contentArea = getContentArea();

      const { project, items, company } = projectData;
      
      // Filter items based on options
      const filteredItems = items.filter((item) => {
        if (item.is_completed && !options.includeCompleted) return false;
        if (!item.is_completed && !options.includePending) return false;
        return true;
      });

      // Build hierarchical tree
      const tree = buildItemTree(filteredItems);
      const groupedByPhase = groupByPhase(tree);
      const phases = Object.keys(groupedByPhase);
      
      const completedItems = items.filter((item) => item.is_completed);
      const pendingItems = items.filter((item) => !item.is_completed);
      const progress = items.length > 0 
        ? Math.round((completedItems.length / items.length) * 100) 
        : 0;
        
      // Track font sizes used
      complianceData.fontSizesUsed.add(PDF_TYPOGRAPHY.sizes.h1);
      complianceData.fontSizesUsed.add(PDF_TYPOGRAPHY.sizes.h2);
      complianceData.fontSizesUsed.add(PDF_TYPOGRAPHY.sizes.h3);
      complianceData.fontSizesUsed.add(PDF_TYPOGRAPHY.sizes.body);
      complianceData.fontSizesUsed.add(PDF_TYPOGRAPHY.sizes.small);
      complianceData.fontSizesUsed.add(PDF_TYPOGRAPHY.sizes.tiny);

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

      let yPos = contentArea.startY;

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

      // === WYSIWYG LIST FORMAT (Matching UI exactly) ===
      
      // Colors matching the UI
      const UI_COLORS: Record<string, [number, number, number]> = {
        phaseHeader: [30, 58, 138],      // Blue-900
        phaseHeaderBg: [239, 246, 255],  // Blue-50
        rowBg: [255, 255, 255],          // White
        text: [15, 23, 42],              // Slate-900
        subText: [100, 116, 139],        // Slate-500
        border: [226, 232, 240],         // Slate-200
        checkbox: [203, 213, 225],       // Slate-300
        checkboxChecked: [59, 130, 246], // Blue-500
        strikethrough: [148, 163, 184],  // Slate-400
        notesBg: [254, 243, 199],        // Amber-100
        notesText: [146, 64, 14],        // Amber-800
        completed: [22, 163, 74],        // Green-600
      };

      const baseIndent = 10;
      const indentPerLevel = 12;
      const rowHeight = 8;
      const noteRowHeight = 10;
      
      // Helper: Draw checkbox
      const drawCheckbox = (x: number, y: number, checked: boolean) => {
        const size = 4;
        if (checked) {
          doc.setFillColor(...UI_COLORS.checkboxChecked);
          doc.roundedRect(x, y - size/2, size, size, 0.5, 0.5, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(5);
          doc.text("✓", x + size/2, y + 1, { align: "center" });
        } else {
          doc.setDrawColor(...UI_COLORS.checkbox);
          doc.setLineWidth(0.4);
          doc.roundedRect(x, y - size/2, size, size, 0.5, 0.5, "S");
        }
      };

      // Helper: Render item with proper indentation
      const renderItem = (node: RoadmapNode, level: number) => {
        const item = node.item;
        const hasNote = item.comments && item.comments.trim().length > 0;
        const totalHeight = rowHeight + (hasNote ? noteRowHeight : 0);
        
        // Check for page break
        if (yPos + totalHeight > contentArea.endY) {
          doc.addPage();
          yPos = contentArea.startY;
        }
        
        const indent = baseIndent + (level * indentPerLevel);
        const isCompleted = item.is_completed;
        
        // Checkbox
        drawCheckbox(margins.left + indent, yPos + rowHeight / 2, !!isCompleted);
        
        // Title (with strikethrough if completed)
        const titleX = margins.left + indent + 7;
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
        
        if (isCompleted) {
          doc.setTextColor(...UI_COLORS.strikethrough);
          doc.text(item.title, titleX, yPos + rowHeight / 2 + 1);
          // Draw strikethrough line
          const textWidth = doc.getTextWidth(item.title);
          doc.setDrawColor(...UI_COLORS.strikethrough);
          doc.setLineWidth(0.3);
          doc.line(titleX, yPos + rowHeight / 2 + 0.5, titleX + textWidth, yPos + rowHeight / 2 + 0.5);
        } else {
          doc.setTextColor(...UI_COLORS.text);
          doc.text(item.title, titleX, yPos + rowHeight / 2 + 1);
        }
        
        // Dates on the right (matching UI with Start/End labels)
        const dateEndX = pageWidth - margins.right - 5;
        const dateStartX = dateEndX - 35;
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
        doc.setTextColor(...UI_COLORS.subText);
        doc.setFont(PDF_TYPOGRAPHY.fonts.body, "normal");
        
        // Start date
        const startDateText = item.start_date 
          ? format(new Date(item.start_date), "dd MMM") 
          : "-";
        doc.text(`Start: ${startDateText}`, dateStartX, yPos + rowHeight / 2 + 0.5);
        
        // End date  
        const endDateText = item.due_date 
          ? format(new Date(item.due_date), "dd MMM") 
          : "-";
        doc.text(`End: ${endDateText}`, dateEndX, yPos + rowHeight / 2 + 0.5, { align: "right" });
        
        yPos += rowHeight;
        
        // Render note box if present (matching UI's yellow highlight)
        if (hasNote) {
          const noteIndent = margins.left + indent + 7;
          const noteWidth = pageWidth - margins.right - noteIndent - 5;
          
          // Yellow background box
          doc.setFillColor(...UI_COLORS.notesBg);
          doc.roundedRect(noteIndent, yPos, noteWidth, noteRowHeight - 2, 1, 1, "F");
          
          // Note text
          doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
          doc.setTextColor(...UI_COLORS.notesText);
          doc.setFont(PDF_TYPOGRAPHY.fonts.body, "italic");
          
          let noteText = item.comments!.trim();
          const maxNoteWidth = noteWidth - 6;
          while (doc.getTextWidth(noteText) > maxNoteWidth && noteText.length > 20) {
            noteText = noteText.substring(0, noteText.length - 4) + "...";
          }
          
          doc.text(noteText, noteIndent + 3, yPos + noteRowHeight / 2 + 0.5);
          doc.setFont(PDF_TYPOGRAPHY.fonts.body, "normal");
          
          yPos += noteRowHeight;
        }
        
        // Render children with increased indent
        node.children.forEach(child => renderItem(child, level + 1));
      };

      // Draw main header (matching UI)
      doc.setFillColor(...UI_COLORS.phaseHeader);
      doc.roundedRect(margins.left, yPos, contentWidth, 14, 2, 2, "F");
      
      // Progress bar background
      const progressBarWidth = contentWidth * 0.4;
      const progressBarX = margins.left + 5;
      doc.setFillColor(255, 255, 255, 0.3);
      doc.roundedRect(progressBarX, yPos + 9, progressBarWidth, 3, 1, 1, "F");
      
      // Progress bar fill
      const totalItems = items.length;
      const completedCount = items.filter(i => i.is_completed).length;
      const progressPct = totalItems > 0 ? completedCount / totalItems : 0;
      doc.setFillColor(...UI_COLORS.completed);
      doc.roundedRect(progressBarX, yPos + 9, progressBarWidth * progressPct, 3, 1, 1, "F");
      
      // Title and stats
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
      doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
      doc.text("Project Roadmap", margins.left + 5, yPos + 7);
      
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
      doc.setFont(PDF_TYPOGRAPHY.fonts.body, "normal");
      doc.text(`${completedCount}/${totalItems} completed (${Math.round(progressPct * 100)}%)`, 
        pageWidth - margins.right - 5, yPos + 7, { align: "right" });
      
      yPos += 20;

      // Render each phase
      for (const phase of phases) {
        const phaseNodes = groupedByPhase[phase];
        
        // Flatten to count items
        const countItems = (nodes: RoadmapNode[]): number => {
          return nodes.reduce((sum, n) => sum + 1 + countItems(n.children), 0);
        };
        const countCompleted = (nodes: RoadmapNode[]): number => {
          return nodes.reduce((sum, n) => (n.item.is_completed ? 1 : 0) + countCompleted(n.children), 0);
        };
        
        const phaseTotal = countItems(phaseNodes);
        const phaseCompleted = countCompleted(phaseNodes);
        
        // Check for page break
        if (yPos + 20 > contentArea.endY) {
          doc.addPage();
          yPos = contentArea.startY;
        }
        
        // Phase header (collapsible style like UI)
        doc.setFillColor(...UI_COLORS.phaseHeaderBg);
        doc.setDrawColor(...UI_COLORS.border);
        doc.setLineWidth(0.3);
        doc.roundedRect(margins.left, yPos, contentWidth, 10, 2, 2, "FD");
        
        // Collapse icon (chevron)
        doc.setTextColor(...UI_COLORS.phaseHeader);
        doc.setFontSize(8);
        doc.text("▼", margins.left + 5, yPos + 6.5);
        
        // Phase name
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
        doc.setFont(PDF_TYPOGRAPHY.fonts.body, "bold");
        doc.text(phase, margins.left + 12, yPos + 7);
        
        // Phase count
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
        doc.setFont(PDF_TYPOGRAPHY.fonts.body, "normal");
        doc.setTextColor(...UI_COLORS.subText);
        doc.text(`(${phaseCompleted}/${phaseTotal})`, margins.left + 12 + doc.getTextWidth(phase) + 3, yPos + 7);
        
        yPos += 14;
        
        // Render items in this phase
        phaseNodes.forEach(node => renderItem(node, 0));
        
        yPos += 6; // Gap between phases
      }
      
      yPos += 10;

      // === MEETING NOTES PAGE ===
      if (options.includeActionItems) {
        doc.addPage();
        yPos = contentArea.startY;
        
        // Track table row heights for compliance
        complianceData.tableRowHeights.push(8, 10, 12); // Header, decision rows, action rows
        
        doc.setFillColor(...PDF_BRAND_COLORS.primary);
        doc.roundedRect(margins.left, yPos, contentWidth, 15, 3, 3, "F");
        doc.setTextColor(...PDF_BRAND_COLORS.white);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Meeting Notes & Action Items", margins.left + 5, yPos + 10);
        
        yPos += 25; // Increased spacing after header
        
        // Key decisions section
        doc.setTextColor(...PDF_BRAND_COLORS.primary);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Key Decisions", margins.left, yPos);
        yPos += 7; // Increased spacing
        
        doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
        doc.setLineWidth(0.3);
        for (let i = 0; i < 4; i++) { // Reduced from 5 to 4 rows
          doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
          doc.rect(margins.left, yPos, contentWidth, 10, "FD");
          yPos += 10;
        }
        
        yPos += 12; // Increased spacing between sections
        
        // Action items table - check if we need a page break
        yPos = checkSafePageBreak(doc, yPos, 120); // Ensure enough space for table
        
        doc.setTextColor(...PDF_BRAND_COLORS.primary);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Action Items", margins.left, yPos);
        yPos += 7; // Increased spacing
        
        // Header row (min 6mm per standards)
        doc.setFillColor(...PDF_BRAND_COLORS.tableHeader);
        doc.rect(margins.left, yPos, contentWidth, 8, "F");
        doc.setTextColor(...PDF_BRAND_COLORS.white);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
        doc.text("Action", margins.left + 3, yPos + 5);
        doc.text("Owner", margins.left + 100, yPos + 5);
        doc.text("Due Date", margins.left + 135, yPos + 5);
        doc.text("Status", margins.left + 165, yPos + 5);
        yPos += 8;
        
        // Empty rows for handwriting (reduced to 6 to save space)
        for (let i = 0; i < 6; i++) {
          doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
          doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
          doc.rect(margins.left, yPos, contentWidth, 12, "FD");
          doc.line(margins.left + 97, yPos, margins.left + 97, yPos + 12);
          doc.line(margins.left + 132, yPos, margins.left + 132, yPos + 12);
          doc.line(margins.left + 162, yPos, margins.left + 162, yPos + 12);
          yPos += 12;
        }
        
        yPos += 12; // Increased spacing
        
        // Check if we have space for follow-up and signature sections
        const remainingSpace = contentArea.endY - yPos;
        const followUpHeight = 30;
        const signatureHeight = 35;
        const totalNeeded = followUpHeight + signatureHeight + 15;
        
        if (remainingSpace < totalNeeded) {
          doc.addPage();
          yPos = contentArea.startY;
        }
        
        // Follow-up section
        doc.setTextColor(...PDF_BRAND_COLORS.primary);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Next Meeting / Follow-up", margins.left, yPos);
        yPos += 7;
        
        doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
        doc.rect(margins.left, yPos, contentWidth, 22, "D"); // Slightly reduced height
        
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
        doc.setTextColor(...PDF_BRAND_COLORS.gray);
        doc.text("Date: _______________  Time: _______________  Location: _______________________", margins.left + 5, yPos + 7);
        doc.text("Agenda Items:", margins.left + 5, yPos + 15);
        
        yPos += 32;
        
        // Signature section
        doc.setTextColor(...PDF_BRAND_COLORS.primary);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
        doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
        doc.text("Approval / Sign-off", margins.left, yPos);
        yPos += 8;
        
        const sigWidth = (contentWidth - 10) / 2;
        doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
        doc.rect(margins.left, yPos, sigWidth, 22, "D");
        doc.rect(margins.left + sigWidth + 10, yPos, sigWidth, 22, "D");
        
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
        doc.setTextColor(...PDF_BRAND_COLORS.gray);
        doc.text("Project Manager:", margins.left + 3, yPos + 6);
        doc.text("Client Representative:", margins.left + sigWidth + 13, yPos + 6);
        doc.text("Date:", margins.left + 3, yPos + 18);
        doc.text("Date:", margins.left + sigWidth + 13, yPos + 18);
      }

      // Add headers and footers to all pages (except cover)
      await addAllHeadersAndFooters(
        doc, 
        "Project Roadmap Review", 
        project.name,
        options.includeCoverPage ? 2 : 1
      );

      // Generate blob for preview instead of saving directly
      const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_Roadmap_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      const blob = doc.output('blob');
      
      // Run compliance check
      const report = checkPDFCompliance(complianceData, fileName);
      
      // Set preview state
      setPdfBlob(blob);
      setPdfFileName(fileName);
      setComplianceReport(report);
      setShowDialog(false);
      setShowPreview(true);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle confirmed export
  const handleConfirmExport = async () => {
    if (!pdfBlob || !pdfFileName) return;
    
    setIsSaving(true);
    try {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("PDF exported successfully");
      setShowPreview(false);
      setPdfBlob(null);
      setComplianceReport(null);
    } catch (error) {
      toast.error("Failed to download PDF");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle cancel
  const handleCancelExport = () => {
    setPdfBlob(null);
    setPdfFileName("");
    setComplianceReport(null);
    setShowDialog(true);
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
              Generate a hierarchical flow diagram PDF for project review meetings with editable fields for notes and action items.
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
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* PDF Preview Dialog */}
      <PDFPreviewBeforeExport
        open={showPreview}
        onOpenChange={setShowPreview}
        pdfBlob={pdfBlob}
        fileName={pdfFileName}
        onConfirm={handleConfirmExport}
        onCancel={handleCancelExport}
        isSaving={isSaving}
        complianceReport={complianceReport || undefined}
      />
    </>
  );
}
