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

      // === MERMAID-STYLE FLOWCHART ===
      // Professional engineering flowchart with boxes, arrows and hierarchical structure
      
      // Engineering color palette
      const FLOW_COLORS: Record<string, [number, number, number]> = {
        boxBorder: [71, 85, 105],        // Slate-600
        boxBg: [255, 255, 255],          // White
        boxBgCompleted: [240, 253, 244], // Green-50
        arrow: [100, 116, 139],          // Slate-500
        text: [30, 41, 59],              // Slate-800
        subText: [100, 116, 139],        // Slate-500
        phaseBox: [241, 245, 249],       // Slate-100
        phaseBorder: [51, 65, 85],       // Slate-700
      };

      // Layout constants
      const boxWidth = 50;
      const boxHeight = 14;
      const boxRadius = 2;
      const arrowHeadSize = 2;
      const verticalGap = 18;
      const horizontalGap = 8;
      const centerX = pageWidth / 2;

      // Helper: Draw arrow
      const drawArrow = (fromX: number, fromY: number, toX: number, toY: number, label?: string) => {
        doc.setDrawColor(...FLOW_COLORS.arrow);
        doc.setLineWidth(0.6);
        doc.line(fromX, fromY, toX, toY);
        
        // Arrow head
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const x1 = toX - arrowHeadSize * Math.cos(angle - Math.PI / 6);
        const y1 = toY - arrowHeadSize * Math.sin(angle - Math.PI / 6);
        const x2 = toX - arrowHeadSize * Math.cos(angle + Math.PI / 6);
        const y2 = toY - arrowHeadSize * Math.sin(angle + Math.PI / 6);
        doc.setFillColor(...FLOW_COLORS.arrow);
        doc.triangle(toX, toY, x1, y1, x2, y2, "F");
        
        // Label on arrow
        if (label) {
          const midX = (fromX + toX) / 2;
          const midY = (fromY + toY) / 2;
          doc.setFontSize(6);
          doc.setTextColor(...FLOW_COLORS.subText);
          doc.setFont(PDF_TYPOGRAPHY.fonts.body, "italic");
          doc.text(label, midX + 2, midY - 1);
        }
      };

      // Helper: Draw flowchart box
      const drawFlowBox = (x: number, y: number, width: number, height: number, text: string, isCompleted: boolean = false, isPhase: boolean = false) => {
        const bgColor = isPhase ? FLOW_COLORS.phaseBox : (isCompleted ? FLOW_COLORS.boxBgCompleted : FLOW_COLORS.boxBg);
        const borderColor = isPhase ? FLOW_COLORS.phaseBorder : FLOW_COLORS.boxBorder;
        
        doc.setFillColor(...bgColor);
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(isPhase ? 0.8 : 0.5);
        doc.roundedRect(x, y, width, height, boxRadius, boxRadius, "FD");
        
        // Completion indicator
        if (isCompleted && !isPhase) {
          doc.setFillColor(22, 101, 52);
          doc.circle(x + 4, y + height / 2, 1.5, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(4);
          doc.text("✓", x + 4, y + height / 2 + 0.5, { align: "center" });
        }
        
        // Text - centered
        doc.setTextColor(...FLOW_COLORS.text);
        doc.setFontSize(isPhase ? 8 : 7);
        doc.setFont(PDF_TYPOGRAPHY.fonts.body, isPhase ? "bold" : "normal");
        
        // Truncate text to fit
        let displayText = text;
        const maxWidth = width - (isCompleted ? 10 : 6);
        while (doc.getTextWidth(displayText) > maxWidth && displayText.length > 5) {
          displayText = displayText.substring(0, displayText.length - 4) + "...";
        }
        
        doc.text(displayText, x + width / 2, y + height / 2 + 1.5, { align: "center" });
        
        return { centerX: x + width / 2, bottomY: y + height, topY: y };
      };

      // Group items by phase preserving hierarchy
      interface FlowNode {
        id: string;
        title: string;
        isCompleted: boolean;
        children: FlowNode[];
        phase: string;
      }

      const buildFlowNodes = (nodes: RoadmapNode[]): FlowNode[] => {
        return nodes.map(n => ({
          id: n.item.id,
          title: n.item.title,
          isCompleted: n.item.is_completed || false,
          phase: n.item.phase || "Uncategorized",
          children: buildFlowNodes(n.children)
        }));
      };

      // Render flowchart for each phase
      let previousPhaseBottom = yPos;

      for (const phase of phases) {
        const phaseNodes = groupedByPhase[phase];
        const flowNodes = buildFlowNodes(phaseNodes);
        
        // Calculate space needed
        const flatCount = flowNodes.reduce((acc, n) => acc + 1 + n.children.length, 0);
        const estimatedHeight = 20 + flatCount * (boxHeight + 8);
        yPos = checkSafePageBreak(doc, yPos, Math.min(estimatedHeight, 80));
        
        // Phase header box
        const phaseBoxWidth = 70;
        const phaseBoxX = centerX - phaseBoxWidth / 2;
        const phaseResult = drawFlowBox(phaseBoxX, yPos, phaseBoxWidth, 12, phase, false, true);
        
        // Arrow from previous phase
        if (previousPhaseBottom < yPos - 5) {
          drawArrow(centerX, previousPhaseBottom + 2, centerX, yPos - 1);
        }
        
        yPos += 18;
        
        // Render items in this phase
        const itemCount = flowNodes.length;
        
        if (itemCount === 1) {
          // Single item - center it
          const item = flowNodes[0];
          const itemX = centerX - boxWidth / 2;
          drawArrow(centerX, yPos - 6, centerX, yPos - 1);
          const result = drawFlowBox(itemX, yPos, boxWidth, boxHeight, item.title, item.isCompleted);
          
          // Render children if any
          if (item.children.length > 0) {
            yPos += boxHeight + 8;
            const childrenWidth = item.children.length * (boxWidth + horizontalGap) - horizontalGap;
            const startChildX = centerX - childrenWidth / 2;
            
            // Arrow down to children
            drawArrow(centerX, yPos - 8, centerX, yPos - 1);
            
            // Horizontal line connecting children
            if (item.children.length > 1) {
              doc.setDrawColor(...FLOW_COLORS.arrow);
              doc.setLineWidth(0.5);
              doc.line(startChildX + boxWidth / 2, yPos - 1, startChildX + childrenWidth - boxWidth / 2, yPos - 1);
            }
            
            item.children.forEach((child, idx) => {
              const childX = startChildX + idx * (boxWidth + horizontalGap);
              // Vertical connector to each child
              doc.line(childX + boxWidth / 2, yPos - 1, childX + boxWidth / 2, yPos);
              drawFlowBox(childX, yPos, boxWidth, boxHeight, child.title, child.isCompleted);
            });
            yPos += boxHeight;
          } else {
            yPos += boxHeight;
          }
        } else if (itemCount > 1) {
          // Multiple items - arrange horizontally with center connector
          const totalWidth = Math.min(itemCount * (boxWidth + horizontalGap) - horizontalGap, contentWidth - 10);
          const adjustedBoxWidth = Math.min(boxWidth, (totalWidth - (itemCount - 1) * horizontalGap) / itemCount);
          const startX = centerX - totalWidth / 2;
          
          // Arrow and horizontal connector
          drawArrow(centerX, yPos - 6, centerX, yPos - 1);
          doc.setDrawColor(...FLOW_COLORS.arrow);
          doc.setLineWidth(0.5);
          doc.line(startX + adjustedBoxWidth / 2, yPos - 1, startX + totalWidth - adjustedBoxWidth / 2, yPos - 1);
          
          flowNodes.forEach((item, idx) => {
            const itemX = startX + idx * (adjustedBoxWidth + horizontalGap);
            // Vertical connector
            doc.line(itemX + adjustedBoxWidth / 2, yPos - 1, itemX + adjustedBoxWidth / 2, yPos);
            drawFlowBox(itemX, yPos, adjustedBoxWidth, boxHeight, item.title, item.isCompleted);
          });
          
          yPos += boxHeight;
          
          // Render children for items that have them
          const itemsWithChildren = flowNodes.filter(n => n.children.length > 0);
          if (itemsWithChildren.length > 0) {
            yPos += 10;
            
            itemsWithChildren.forEach((item, parentIdx) => {
              if (item.children.length > 0) {
                const parentX = startX + flowNodes.indexOf(item) * (adjustedBoxWidth + horizontalGap);
                const parentCenterX = parentX + adjustedBoxWidth / 2;
                
                // Children row
                const childrenWidth = Math.min(item.children.length * (40 + 4) - 4, 120);
                const startChildX = parentCenterX - childrenWidth / 2;
                const childBoxWidth = Math.min(40, (childrenWidth - (item.children.length - 1) * 4) / item.children.length);
                
                // Arrow down
                drawArrow(parentCenterX, yPos - 10, parentCenterX, yPos - 1);
                
                // Horizontal connector
                if (item.children.length > 1) {
                  doc.setDrawColor(...FLOW_COLORS.arrow);
                  doc.line(startChildX + childBoxWidth / 2, yPos - 1, startChildX + childrenWidth - childBoxWidth / 2, yPos - 1);
                }
                
                item.children.forEach((child, idx) => {
                  const childX = startChildX + idx * (childBoxWidth + 4);
                  doc.line(childX + childBoxWidth / 2, yPos - 1, childX + childBoxWidth / 2, yPos);
                  drawFlowBox(childX, yPos, childBoxWidth, 10, child.title, child.isCompleted);
                });
              }
            });
            
            yPos += 12;
          }
        }
        
        previousPhaseBottom = yPos;
        yPos += 12;
      }
      
      yPos += 5;

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
