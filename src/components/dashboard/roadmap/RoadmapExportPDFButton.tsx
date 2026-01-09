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
  parent_id?: string | null;
  sort_order?: number;
}

// Hierarchical node structure
interface RoadmapNode {
  item: RoadmapItem;
  children: RoadmapNode[];
  level: number;
}

// Phase colors - Professional engineering palette (muted slate tones)
const PHASE_COLORS: { [key: string]: [number, number, number] } = {
  "Planning & Preparation": [51, 65, 85],    // Slate-700
  "Budget & Assessment": [71, 85, 105],      // Slate-600
  "Tender & Procurement": [100, 116, 139],   // Slate-500
  "Construction": [55, 65, 81],              // Gray-700
  "Documentation": [75, 85, 99],             // Gray-600
  "Commissioning": [82, 82, 91],             // Zinc-600
  "Handover": [63, 63, 70],                  // Zinc-700
  default: [148, 163, 184],                  // Slate-400
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

      // === MERMAID-STYLE FLOW DIAGRAM ===
      // Professional engineering flowchart with vertical timeline and connected nodes
      const timelineX = margins.left + 12; // Center line for nodes
      const nodeRadius = 5;
      const nodeCardGap = 8;
      const cardStartX = margins.left + 25; // Card starts after node
      const cardWidth = contentWidth - 30;
      const itemSpacing = 6;

      // Engineering color palette - muted professional tones
      const FLOW_COLORS: Record<string, [number, number, number]> = {
        timeline: [100, 116, 139],      // Slate-500 for main line
        node: [71, 85, 105],            // Slate-600 for nodes
        nodeCompleted: [22, 101, 52],   // Green-800 for completed
        connector: [148, 163, 184],     // Slate-400 for connectors
        cardBorder: [203, 213, 225],    // Slate-300 for card borders
        cardBg: [248, 250, 252],        // Slate-50 for card background
        text: [30, 41, 59],             // Slate-800 for text
        subText: [100, 116, 139],       // Slate-500 for subtext
      };

      // Flatten all items for simple vertical flow
      const flattenPhaseItems = (nodes: RoadmapNode[]): { item: RoadmapItem; phase: string }[] => {
        const result: { item: RoadmapItem; phase: string }[] = [];
        const addNodes = (nodeList: RoadmapNode[], phase: string) => {
          nodeList.forEach(node => {
            result.push({ item: node.item, phase: node.item.phase || phase });
            if (node.children.length > 0) {
              addNodes(node.children, node.item.phase || phase);
            }
          });
        };
        for (const phase of phases) {
          addNodes(groupedByPhase[phase], phase);
        }
        return result;
      };

      const allItems = flattenPhaseItems(tree);
      
      // Draw title for flow diagram section
      doc.setFillColor(...PDF_BRAND_COLORS.primary);
      doc.roundedRect(margins.left, yPos, contentWidth, 10, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
      doc.setFont(PDF_TYPOGRAPHY.fonts.heading, "bold");
      doc.text("Project Workflow", margins.left + 5, yPos + 7);
      
      const totalCompleted = allItems.filter(i => i.item.is_completed).length;
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
      doc.text(`${totalCompleted}/${allItems.length} completed (${Math.round(totalCompleted / allItems.length * 100)}%)`, 
        pageWidth - margins.right - 5, yPos + 7, { align: "right" });
      
      yPos += 18;
      
      // Track start position for timeline
      const flowStartY = yPos;
      
      // Render each item as a flow node
      allItems.forEach((itemData, index) => {
        const { item, phase } = itemData;
        const isLast = index === allItems.length - 1;
        const isCompleted = item.is_completed;
        const dueStatus = getDueDateStatus(item.due_date);
        
        // Calculate card height based on content
        const hasDescription = item.description && item.description.length > 0;
        const cardHeight = hasDescription ? 22 : 16;
        
        // Check for page break
        yPos = checkSafePageBreak(doc, yPos, cardHeight + itemSpacing + 10);
        
        // Draw vertical timeline line (before this node to next)
        if (!isLast) {
          doc.setDrawColor(...FLOW_COLORS.timeline);
          doc.setLineWidth(1.2);
          doc.line(timelineX, yPos + nodeRadius, timelineX, yPos + cardHeight + itemSpacing);
        }
        
        // Draw horizontal connector from node to card
        doc.setDrawColor(...FLOW_COLORS.connector);
        doc.setLineWidth(0.8);
        doc.line(timelineX + nodeRadius, yPos + cardHeight / 2, cardStartX, yPos + cardHeight / 2);
        
        // Draw node circle
        const nodeColor = isCompleted ? FLOW_COLORS.nodeCompleted : FLOW_COLORS.node;
        doc.setFillColor(...nodeColor);
        doc.setDrawColor(...nodeColor);
        doc.circle(timelineX, yPos + cardHeight / 2, nodeRadius, "FD");
        
        // Draw checkmark or number inside node
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(PDF_TYPOGRAPHY.fonts.body, "bold");
        if (isCompleted) {
          doc.text("✓", timelineX, yPos + cardHeight / 2 + 0.8, { align: "center" });
        } else {
          doc.text(String(index + 1), timelineX, yPos + cardHeight / 2 + 0.8, { align: "center" });
        }
        
        // Draw card
        const cardBorderColor: [number, number, number] = isCompleted ? FLOW_COLORS.nodeCompleted : 
          dueStatus === "overdue" ? [153, 27, 27] : // Red-800
          dueStatus === "soon" ? [146, 64, 14] : // Amber-800
          FLOW_COLORS.cardBorder;
        
        doc.setFillColor(...FLOW_COLORS.cardBg);
        doc.setDrawColor(...cardBorderColor);
        doc.setLineWidth(0.5);
        doc.roundedRect(cardStartX, yPos, cardWidth, cardHeight, 3, 3, "FD");
        
        // Left accent bar
        doc.setFillColor(...nodeColor);
        doc.roundedRect(cardStartX, yPos, 3, cardHeight, 1.5, 1.5, "F");
        
        // Item title
        doc.setTextColor(...FLOW_COLORS.text);
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
        doc.setFont(PDF_TYPOGRAPHY.fonts.body, isCompleted ? "normal" : "bold");
        
        let title = item.title;
        const maxTitleWidth = cardWidth - 60;
        while (doc.getTextWidth(title) > maxTitleWidth && title.length > 10) {
          title = title.substring(0, title.length - 4) + "...";
        }
        
        const titleY = hasDescription ? yPos + 7 : yPos + cardHeight / 2 + 1;
        doc.text(title, cardStartX + 8, titleY);
        
        // Phase label (subtle)
        doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
        doc.setTextColor(...FLOW_COLORS.subText);
        doc.text(phase, cardStartX + cardWidth - 5, titleY, { align: "right" });
        
        // Description if present
        if (hasDescription) {
          doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
          doc.setTextColor(...FLOW_COLORS.subText);
          let desc = item.description!;
          if (desc.length > 80) desc = desc.substring(0, 77) + "...";
          doc.text(desc, cardStartX + 8, yPos + 14);
        }
        
        // Due date on right side
        if (item.due_date) {
          const dateColor: [number, number, number] = dueStatus === "overdue" ? [153, 27, 27] : 
            dueStatus === "soon" ? [146, 64, 14] : FLOW_COLORS.subText;
          doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
          doc.setTextColor(...dateColor);
          const dateStr = format(new Date(item.due_date), "MMM d");
          doc.text(dateStr, cardStartX + cardWidth - 5, yPos + cardHeight - 4, { align: "right" });
        }
        
        yPos += cardHeight + itemSpacing;
      });
      
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
