import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ReportOptionsDialog, ReportOptions } from "./ReportOptionsDialog";
import { generateCoverPage } from "@/utils/pdfCoverPageSimple";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  db_size_allowance: string | null;
  db_size_scope_of_work: string | null;
  shop_category: string;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  cost_reported: boolean;
  layout_image_url?: string | null;
}

interface TenantReportGeneratorProps {
  tenants: Tenant[];
  projectId: string;
  projectName: string;
}

export const TenantReportGenerator = ({ tenants, projectId, projectName }: TenantReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Debug logging
  console.log('[TenantReportGenerator] tenants:', tenants);
  console.log('[TenantReportGenerator] tenants.length:', tenants.length);
  console.log('[TenantReportGenerator] isGenerating:', isGenerating);
  console.log('[TenantReportGenerator] button disabled:', isGenerating || tenants.length === 0);

  const getCategoryLabel = (category: string) => {
    const labels = {
      standard: "Standard",
      fast_food: "Fast Food",
      restaurant: "Restaurant",
      national: "National"
    };
    return labels[category as keyof typeof labels] || category;
  };

  const isTenantComplete = (tenant: Tenant) => {
    return tenant.sow_received &&
           tenant.layout_received &&
           tenant.db_ordered &&
           tenant.lighting_ordered &&
           tenant.cost_reported &&
           tenant.area !== null &&
           tenant.db_cost !== null &&
           tenant.lighting_cost !== null;
  };


  const generateKPIPage = (doc: jsPDF, options: ReportOptions) => {
    doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add document organization note at top
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "italic");
    doc.text("Note: Documents are organized by tenant in the appendix section", pageWidth / 2, 8, { align: 'center' });
    
    // Layout configuration based on mode - reduced scale to fit on page
    const isCompact = options.kpiLayout === 'compact';
    const fontSize = {
      title: isCompact ? 16 : 18,
      cardLabel: isCompact ? 7 : 8,
      cardValue: isCompact ? 14 : 16,
      cardValueSmall: isCompact ? 11 : 13,
      cardValueLarge: isCompact ? 10 : 11,
      sectionTitle: isCompact ? 9 : 10,
      legendText: isCompact ? 7 : 8,
      progressLabel: isCompact ? 6 : 7,
      progressPercent: isCompact ? 6 : 7,
    };
    const spacing = {
      headerHeight: isCompact ? 22 : 28,
      cardHeight: isCompact ? 20 : 24,
      cardSpacing: isCompact ? 6 : 8,
      sectionSpacing: isCompact ? 8 : 12,
      chartRadius: isCompact ? 14 : 18,
      progressRow: isCompact ? 10 : 12,
    };

    // Color theme configuration
    const colorThemes = {
      professional: {
        header: [41, 128, 185],
        cardBg: [248, 250, 252],
        cardBorder: [226, 232, 240],
        accent: [59, 130, 246],
      },
      vibrant: {
        header: [139, 92, 246],
        cardBg: [250, 245, 255],
        cardBorder: [233, 213, 255],
        accent: [168, 85, 247],
      },
      minimal: {
        header: [71, 85, 105],
        cardBg: [255, 255, 255],
        cardBorder: [203, 213, 225],
        accent: [100, 116, 139],
      },
    };

    const theme = colorThemes[options.kpiAppearance.colorTheme];
    
    // Professional header with underline
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Project Overview & Key Performance Indicators", 20, 22);
    
    // Subtle underline
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Real-time project metrics and completion tracking", 20, 31);

    // Calculate metrics
    const totalTenants = tenants.length;
    const totalArea = tenants.reduce((sum, t) => sum + (t.area || 0), 0);
    const totalDbCost = tenants.reduce((sum, t) => sum + (t.db_cost || 0), 0);
    const totalLightingCost = tenants.reduce((sum, t) => sum + (t.lighting_cost || 0), 0);

    const categoryCounts = tenants.reduce((acc, t) => {
      acc[t.shop_category] = (acc[t.shop_category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dbOrdered = tenants.filter(t => t.db_ordered).length;
    const lightingOrdered = tenants.filter(t => t.lighting_ordered).length;
    const sowReceived = tenants.filter(t => t.sow_received).length;
    const layoutReceived = tenants.filter(t => t.layout_received).length;

    let yPos = 40;

    // Professional metric cards with borders and icons
    const drawMetricCard = (x: number, y: number, label: string, value: string, sublabel: string, iconLetter: string, color: [number, number, number]) => {
      const cardWidth = 45;
      const cardHeight = 28;
      
      // Card border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');
      
      // Top accent line
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(2);
      doc.line(x, y, x + cardWidth, y);
      
      // Icon circle
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(0.3);
      doc.circle(x + 8, y + 10, 4.5, 'FD');
      
      // Icon letter
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(iconLetter, x + 8, y + 12, { align: 'center' });
      
      // Label
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + 16, y + 8);
      
      // Value
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const displayValue = value.length > 11 ? value.substring(0, 9) + '...' : value;
      doc.text(displayValue, x + 16, y + 16);
      
      // Sublabel
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(sublabel, x + 16, y + 21);
    };

    // Draw metric cards in grid
    if (options.kpiCards.totalTenants) {
      drawMetricCard(20, yPos, "TOTAL TENANTS", totalTenants.toString(), "Active units", "T", [59, 130, 246]);
    }
    if (options.kpiCards.totalArea) {
      drawMetricCard(70, yPos, "TOTAL AREA", totalArea.toFixed(0), "Square meters", "A", [34, 197, 94]);
    }
    if (options.kpiCards.totalDbCost) {
      const costK = (totalDbCost / 1000).toFixed(0);
      drawMetricCard(120, yPos, "DB COST", `R${costK}k`, "Distribution boards", "D", [168, 85, 247]);
    }
    if (options.kpiCards.totalLightingCost) {
      const costK = (totalLightingCost / 1000).toFixed(0);
      drawMetricCard(170, yPos, "LIGHTING COST", `R${costK}k`, "Lighting fixtures", "L", [251, 191, 36]);
    }

    yPos += 38;

    // Section divider
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Overall completion gauge
    const totalProgress = (sowReceived + layoutReceived + dbOrdered + lightingOrdered) / (totalTenants * 4);
    const progressPercent = (totalProgress * 100);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Overall Project Completion", 20, yPos);
    
    yPos += 4;
    
    // Large progress bar
    const barX = 20;
    const barWidth = 100;
    const barHeight = 12;
    
    // Background
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(barX, yPos, barWidth, barHeight, 2, 2, 'F');
    
    // Progress fill
    const fillWidth = (progressPercent / 100) * barWidth;
    if (fillWidth > 0) {
      let progressColor: [number, number, number];
      if (progressPercent >= 75) progressColor = [34, 197, 94];
      else if (progressPercent >= 50) progressColor = [59, 130, 246];
      else if (progressPercent >= 25) progressColor = [251, 191, 36];
      else progressColor = [239, 68, 68];
      
      doc.setFillColor(progressColor[0], progressColor[1], progressColor[2]);
      doc.roundedRect(barX, yPos, fillWidth, barHeight, 2, 2, 'F');
    }
    
    // Percentage text on bar
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    if (fillWidth > 15) {
      doc.text(`${progressPercent.toFixed(1)}%`, barX + fillWidth - 2, yPos + 8, { align: 'right' });
    } else {
      doc.setTextColor(60, 60, 60);
      doc.text(`${progressPercent.toFixed(1)}%`, barX + fillWidth + 2, yPos + 8);
    }
    
    // Status label
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Complete", barX + barWidth + 4, yPos + 8);

    yPos += 20;

    // Category distribution (if enabled)
    if (options.tenantFields.category && Object.keys(categoryCounts).length > 0) {
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Category Distribution", 20, yPos);
      
      yPos += 8;
      
      const categoryColors: Record<string, [number, number, number]> = {
        standard: [59, 130, 246],
        fast_food: [239, 68, 68],
        restaurant: [34, 197, 94],
        national: [168, 85, 247]
      };
      
      const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
      const maxBarWidth = 85;
      
      categories.forEach(([category, count]) => {
        const percentage = (count / totalTenants) * 100;
        const barWidth = (count / totalTenants) * maxBarWidth;
        const color = categoryColors[category] || [100, 116, 139];
        
        // Label
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const labelText = getCategoryLabel(category);
        doc.text(labelText, 22, yPos + 4);
        
        // Bar background
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(65, yPos, maxBarWidth, 7, 1.5, 1.5, 'F');
        
        // Bar fill
        if (barWidth > 0) {
          doc.setFillColor(color[0], color[1], color[2]);
          doc.roundedRect(65, yPos, barWidth, 7, 1.5, 1.5, 'F');
        }
        
        // Count and percentage
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(`${count} units`, 155, yPos + 4);
        
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text(`(${percentage.toFixed(0)}%)`, 175, yPos + 4);
        
        yPos += 10;
      });
      
      yPos += 5;
    }

    // Task completion status
    const progressFields = [
      { key: 'sowReceived', label: 'Scope of Work', value: sowReceived, abbr: 'SOW' },
      { key: 'layoutReceived', label: 'Layout Plans', value: layoutReceived, abbr: 'LAY' },
      { key: 'dbOrdered', label: 'Distribution Board', value: dbOrdered, abbr: 'DB' },
      { key: 'lightingOrdered', label: 'Lighting Fixtures', value: lightingOrdered, abbr: 'LGT' },
    ];

    const visibleProgress = progressFields.filter(item => {
      if (item.key === 'sowReceived') return options.tenantFields.sowReceived;
      if (item.key === 'layoutReceived') return options.tenantFields.layoutReceived;
      if (item.key === 'dbOrdered') return options.tenantFields.dbOrdered;
      if (item.key === 'lightingOrdered') return options.tenantFields.lightingOrdered;
      return false;
    });

    if (visibleProgress.length > 0) {
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Task Completion Tracking", 20, yPos);
      
      yPos += 8;
      
      visibleProgress.forEach((item, idx) => {
        const percentage = (item.value / totalTenants * 100);
        
        // Task row with professional styling
        const rowHeight = 11;
        
        // Alternating background for better readability
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(20, yPos - 2, 170, rowHeight, 'F');
        }
        
        // Abbreviation badge
        doc.setFillColor(220, 220, 220);
        doc.roundedRect(22, yPos, 12, 6, 1, 1, 'F');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.text(item.abbr, 28, yPos + 4, { align: 'center' });
        
        // Task label
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, 38, yPos + 4);
        
        // Progress fraction
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`${item.value}/${totalTenants}`, 95, yPos + 4);
        
        // Progress bar
        const barX = 120;
        const barWidth = 45;
        const barHeight = 5;
        const barFill = (percentage / 100) * barWidth;
        
        // Bar background
        doc.setFillColor(235, 235, 235);
        doc.roundedRect(barX, yPos + 1, barWidth, barHeight, 1, 1, 'F');
        
        // Bar fill with color
        if (barFill > 0) {
          let barColor: [number, number, number];
          if (percentage >= 75) barColor = [34, 197, 94];
          else if (percentage >= 50) barColor = [59, 130, 246];
          else if (percentage >= 25) barColor = [251, 191, 36];
          else barColor = [239, 68, 68];
          
          doc.setFillColor(barColor[0], barColor[1], barColor[2]);
          doc.roundedRect(barX, yPos + 1, barFill, barHeight, 1, 1, 'F');
        }
        
        // Percentage
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(`${percentage.toFixed(0)}%`, 170, yPos + 4);
        
        yPos += rowHeight;
      });
    }

    // Page footer
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.text(`Page 2`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  const generateTenantSchedule = (doc: jsPDF, options: ReportOptions) => {
    doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Page header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Tenant Schedule", 20, 25);

    // Add legend for symbols with visual examples
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    
    // Draw legend with checkbox examples
    const legendY = 32;
    const legendX = 20;
    
    // Completed checkbox - filled green square with white check
    doc.setFillColor(34, 197, 94); // Green fill
    doc.rect(legendX, legendY - 4, 7, 7, 'F');
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.rect(legendX, legendY - 4, 7, 7, 'S');
    
    // Draw white checkmark
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.2);
    doc.line(legendX + 1.5, legendY, legendX + 2.8, legendY + 2);
    doc.line(legendX + 2.8, legendY + 2, legendX + 5.5, legendY - 2);
    
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("= Completed/Received", legendX + 10, legendY);
    
    // Pending checkbox - empty square with red X
    const pendingX = legendX + 80;
    doc.setFillColor(255, 255, 255); // White fill
    doc.rect(pendingX, legendY - 4, 7, 7, 'F');
    doc.setDrawColor(239, 68, 68); // Red border
    doc.setLineWidth(0.5);
    doc.rect(pendingX, legendY - 4, 7, 7, 'S');
    
    // Draw red X
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(1.2);
    doc.line(pendingX + 1.5, legendY - 3, pendingX + 5.5, legendY + 1);
    doc.line(pendingX + 5.5, legendY - 3, pendingX + 1.5, legendY + 1);
    
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("= Pending/Not Received", pendingX + 10, legendY);

    // Calculate completion statistics
    const totalTenants = tenants.length;
    const sowReceived = tenants.filter(t => t.sow_received).length;
    const layoutReceived = tenants.filter(t => t.layout_received).length;
    const dbOrdered = tenants.filter(t => t.db_ordered).length;
    const lightingOrdered = tenants.filter(t => t.lighting_ordered).length;
    const costReported = tenants.filter(t => t.cost_reported).length;

    // Calculate overall completion percentage
    let totalCompleted = 0;
    let totalPossible = 0;
    
    if (options.tenantFields.sowReceived) {
      totalCompleted += sowReceived;
      totalPossible += totalTenants;
    }
    if (options.tenantFields.layoutReceived) {
      totalCompleted += layoutReceived;
      totalPossible += totalTenants;
    }
    if (options.tenantFields.dbOrdered) {
      totalCompleted += dbOrdered;
      totalPossible += totalTenants;
    }
    if (options.tenantFields.lightingOrdered) {
      totalCompleted += lightingOrdered;
      totalPossible += totalTenants;
    }
    
    const overallCompletion = totalPossible > 0 ? ((totalCompleted / totalPossible) * 100).toFixed(1) : '0';

    // Draw summary box if any status fields are selected
    const hasStatusFields = options.tenantFields.sowReceived || 
                           options.tenantFields.layoutReceived || 
                           options.tenantFields.dbOrdered || 
                           options.tenantFields.lightingOrdered;
    
    let tableStartY = 38;
    
    if (hasStatusFields) {
      // Summary box - increased height for overall completion
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 36, pageWidth - 40, 30, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(20, 36, pageWidth - 40, 30, 2, 2, 'S');
      
      // Overall completion badge
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(pageWidth - 55, 39, 30, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${overallCompletion}%`, pageWidth - 40, 46, { align: 'center' });
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Overall", pageWidth - 40, 52, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Completion Summary:", 24, 42);
      
      let xPos = 24;
      const yPos = 50;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      if (options.tenantFields.sowReceived) {
        doc.text(`SOW: ${sowReceived}/${totalTenants}`, xPos, yPos);
        xPos += 30;
      }
      if (options.tenantFields.layoutReceived) {
        doc.text(`Layout: ${layoutReceived}/${totalTenants}`, xPos, yPos);
        xPos += 35;
      }
      if (options.tenantFields.dbOrdered) {
        doc.text(`DB Ordered: ${dbOrdered}/${totalTenants}`, xPos, yPos);
        xPos += 40;
      }
      if (options.tenantFields.lightingOrdered) {
        doc.text(`Lighting: ${lightingOrdered}/${totalTenants}`, xPos, yPos);
        xPos += 35;
      }
      if (options.tenantFields.costReported) {
        doc.text(`Cost Rpt: ${costReported}/${totalTenants}`, xPos, yPos);
        xPos += 40;
      }
      
      // Add percentage
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      xPos = 24;
      const yPos2 = 54;
      
      if (options.tenantFields.sowReceived) {
        const pct = ((sowReceived / totalTenants) * 100).toFixed(0);
        doc.text(`(${pct}%)`, xPos, yPos2);
        xPos += 30;
      }
      if (options.tenantFields.layoutReceived) {
        const pct = ((layoutReceived / totalTenants) * 100).toFixed(0);
        doc.text(`(${pct}%)`, xPos, yPos2);
        xPos += 35;
      }
      if (options.tenantFields.dbOrdered) {
        const pct = ((dbOrdered / totalTenants) * 100).toFixed(0);
        doc.text(`(${pct}%)`, xPos, yPos2);
        xPos += 40;
      }
      if (options.tenantFields.lightingOrdered) {
        const pct = ((lightingOrdered / totalTenants) * 100).toFixed(0);
        doc.text(`(${pct}%)`, xPos, yPos2);
        xPos += 35;
      }
      if (options.tenantFields.costReported) {
        const pct = ((costReported / totalTenants) * 100).toFixed(0);
        doc.text(`(${pct}%)`, xPos, yPos2);
      }
      
      tableStartY = 70;
    }

    // Build headers and data based on selected fields
    const headers: string[] = [];
    const fieldKeys: string[] = [];

    if (options.tenantFields.shopNumber) { headers.push('Shop #'); fieldKeys.push('shopNumber'); }
    if (options.tenantFields.shopName) { headers.push('Shop Name'); fieldKeys.push('shopName'); }
    if (options.tenantFields.category) { headers.push('Category'); fieldKeys.push('category'); }
    if (options.tenantFields.area) { headers.push('Area (m²)'); fieldKeys.push('area'); }
    if (options.tenantFields.dbAllowance) { headers.push('DB Allow.'); fieldKeys.push('dbAllowance'); }
    if (options.tenantFields.dbScopeOfWork) { headers.push('DB SOW'); fieldKeys.push('dbScopeOfWork'); }
    if (options.tenantFields.sowReceived) { headers.push('SOW'); fieldKeys.push('sowReceived'); }
    if (options.tenantFields.layoutReceived) { headers.push('Layout'); fieldKeys.push('layoutReceived'); }
    if (options.tenantFields.dbOrdered) { headers.push('DB Ord'); fieldKeys.push('dbOrdered'); }
    if (options.tenantFields.dbCost) { headers.push('DB Cost'); fieldKeys.push('dbCost'); }
    if (options.tenantFields.lightingOrdered) { headers.push('Light Ord'); fieldKeys.push('lightingOrdered'); }
    if (options.tenantFields.lightingCost) { headers.push('Light Cost'); fieldKeys.push('lightingCost'); }
    if (options.tenantFields.costReported) { headers.push('Cost Rpt'); fieldKeys.push('costReported'); }

    const tableData = tenants.map(tenant => {
      const row: string[] = [];
      fieldKeys.forEach(key => {
        switch(key) {
          case 'shopNumber': row.push(tenant.shop_number); break;
          case 'shopName': row.push(tenant.shop_name); break;
          case 'category': row.push(getCategoryLabel(tenant.shop_category)); break;
          case 'area': row.push(tenant.area?.toFixed(2) || '-'); break;
          case 'dbAllowance': row.push(tenant.db_size_allowance || '-'); break;
          case 'dbScopeOfWork': row.push(tenant.db_size_scope_of_work || '-'); break;
          case 'sowReceived': row.push(tenant.sow_received ? '✓' : '✗'); break;
          case 'layoutReceived': row.push(tenant.layout_received ? '✓' : '✗'); break;
          case 'dbOrdered': row.push(tenant.db_ordered ? '✓' : '✗'); break;
          case 'dbCost': 
            if (tenant.db_ordered && !tenant.db_cost) {
              row.push('By Tenant');
            } else {
              row.push(tenant.db_cost ? `R${tenant.db_cost.toFixed(2)}` : '-');
            }
            break;
          case 'lightingOrdered': row.push(tenant.lighting_ordered ? '✓' : '✗'); break;
          case 'lightingCost': 
            if (tenant.lighting_ordered && !tenant.lighting_cost) {
              row.push('By Tenant');
            } else {
              row.push(tenant.lighting_cost ? `R${tenant.lighting_cost.toFixed(2)}` : '-');
            }
            break;
          case 'costReported': row.push(tenant.cost_reported ? '✓' : '✗'); break;
        }
      });
      return row;
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
      },
      columnStyles: {
        // Make checkbox columns narrower and centered
        ...Object.fromEntries(
          fieldKeys.map((key, index) => {
            if (['sowReceived', 'layoutReceived', 'dbOrdered', 'lightingOrdered', 'costReported'].includes(key)) {
              return [index, { halign: 'center', cellWidth: 15 }];
            }
            return [index, {}];
          }).filter(([_, style]) => Object.keys(style).length > 0)
        )
      },
      didParseCell: (data) => {
        // Clear text for checkbox columns - we'll draw them manually
        if (data.section === 'body') {
          const key = fieldKeys[data.column.index];
          if (['sowReceived', 'layoutReceived', 'dbOrdered', 'lightingOrdered', 'costReported'].includes(key)) {
            data.cell.text = [''];
          }
        }
      },
      didDrawCell: (data) => {
        // Custom rendering for checkbox cells
        const key = fieldKeys[data.column.index];
        if (['sowReceived', 'layoutReceived', 'dbOrdered', 'lightingOrdered', 'costReported'].includes(key) && data.section === 'body') {
          const cellValue = data.cell.raw as string;
          if (cellValue === '✓' || cellValue === '✗') {
            const isChecked = cellValue === '✓';
            
            // Calculate center position for the checkbox
            const centerX = data.cell.x + data.cell.width / 2;
            const centerY = data.cell.y + data.cell.height / 2;
            const boxSize = 6;
            const halfBox = boxSize / 2;
            
            if (isChecked) {
              // Draw filled green square
              doc.setFillColor(34, 197, 94); // Green
              doc.rect(centerX - halfBox, centerY - halfBox, boxSize, boxSize, 'F');
              doc.setDrawColor(34, 197, 94);
              doc.setLineWidth(0.4);
              doc.rect(centerX - halfBox, centerY - halfBox, boxSize, boxSize, 'S');
              
              // Draw white checkmark
              doc.setDrawColor(255, 255, 255);
              doc.setLineWidth(1);
              doc.line(centerX - 2, centerY, centerX - 0.5, centerY + 1.5);
              doc.line(centerX - 0.5, centerY + 1.5, centerX + 2, centerY - 1.5);
            } else {
              // Draw white square with red border
              doc.setFillColor(255, 255, 255);
              doc.rect(centerX - halfBox, centerY - halfBox, boxSize, boxSize, 'F');
              doc.setDrawColor(239, 68, 68); // Red
              doc.setLineWidth(0.4);
              doc.rect(centerX - halfBox, centerY - halfBox, boxSize, boxSize, 'S');
              
              // Draw red X
              doc.setDrawColor(239, 68, 68);
              doc.setLineWidth(1);
              doc.line(centerX - 2, centerY - 2, centerX + 2, centerY + 2);
              doc.line(centerX + 2, centerY - 2, centerX - 2, centerY + 2);
            }
          }
        }
      },
      didDrawPage: (data) => {
        // Add page number
        const pageHeight = doc.internal.pageSize.getHeight();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`Page ${currentPage}`, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
      }
    });
  };

  const generateLayoutPages = async (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    try {
      // Fetch the floor plan masking composite image
      const { data: floorPlanRecord } = await supabase
        .from('project_floor_plans')
        .select('composite_image_url')
        .eq('project_id', projectId)
        .maybeSingle();

      if (!floorPlanRecord?.composite_image_url) {
        // Add a page noting that floor plan masking is available
        doc.addPage();
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("Floor Plan Layout", 20, 25);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Floor plan masking not yet configured for this project.", 20, 45);
        doc.text("Use the Floor Plan Masking tab to create tenant zones.", 20, 55);
        
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "italic");
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        return;
      }

      // Download the composite image with cache busting
      const imageUrl = `${floorPlanRecord.composite_image_url}?t=${Date.now()}`;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Convert blob to base64 - keep original PNG quality for floor plans
      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Load image to get dimensions
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = base64Image;
      });

      doc.addPage();
      
      // Page header - simple without color
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Floor Plan with Tenant Zones", 20, 25);

      // Add the image at high quality
      const maxWidth = pageWidth - 40;
      const maxHeight = pageHeight - 80;
      
      let imgWidth = maxWidth;
      let imgHeight = (img.height / img.width) * maxWidth;
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (img.width / img.height) * maxHeight;
      }
      
      const imgX = (pageWidth - imgWidth) / 2;
      const imgY = 50;

      // Use original PNG format with FAST compression (maintains quality)
      doc.addImage(base64Image, 'PNG', imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');

      // Add legend/note at bottom
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Legend:", 20, pageHeight - 40);
      
      // Green indicator - Complete
      doc.setFillColor(22, 163, 74); // #16A34A - Green
      doc.roundedRect(20, pageHeight - 35, 5, 5, 1, 1, 'F');
      doc.text("Complete - All required fields satisfied", 30, pageHeight - 31);
      
      // Red indicator - Incomplete
      doc.setFillColor(220, 38, 38); // #DC2626 - Red
      doc.roundedRect(20, pageHeight - 27, 5, 5, 1, 1, 'F');
      doc.text("In Progress - Outstanding items", 30, pageHeight - 23);
      
      // Gray indicator - Unassigned
      doc.setFillColor(156, 163, 175); // #9ca3af - Gray
      doc.roundedRect(20, pageHeight - 19, 5, 5, 1, 1, 'F');
      doc.text("Unassigned", 30, pageHeight - 15);
      
      // Note about updating preview
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "italic");
      doc.text("Note: Use 'Update Preview Colors' in Floor Plan Masking to refresh colors before generating reports.", 20, pageHeight - 12);

      // Page footer
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      
    } catch (error) {
      console.error('Error generating layout page:', error);
      // Add error page
      doc.addPage();
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Floor Plan Layout", 20, 25);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Unable to load floor plan image.", 20, 45);
    }
  };

  const generateTableOfContents = (doc: jsPDF, tenants: Tenant[], options: ReportOptions) => {
    doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header - simple without color
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Table of Contents", 20, 25);
    
    let yPos = 55;
    
    // Section headers
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Report Sections", 20, yPos);
    yPos += 10;
    
    // List main sections
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const sections = [
      "Project Overview & KPIs",
      "Floor Plan with Tenant Zones",
      "Tenant Schedule",
      "Tenant Documents (By Tenant)"
    ];
    
    sections.forEach((section, idx) => {
      doc.text(`${idx + 2}. ${section}`, 25, yPos);
      yPos += 7;
    });
    
    yPos += 10;
    
    // Page footer
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  const handleGenerateReport = async (options: ReportOptions) => {
    if (tenants.length === 0) {
      toast.error("No tenants to generate report");
      return;
    }

    setIsGenerating(true);
    setOptionsDialogOpen(false);
    
    try {
      // Get next revision number
      const { data: existingReports } = await supabase
        .from('tenant_tracker_reports')
        .select('revision_number')
        .eq('project_id', projectId)
        .order('revision_number', { ascending: false })
        .limit(1);

      const nextRevision = existingReports && existingReports.length > 0 
        ? existingReports[0].revision_number + 1 
        : 0;

      const doc = new jsPDF('p', 'mm', 'a4');

      console.log('[TENANT REPORT] Starting report generation with standardized cover page');

      // Generate pages based on options
      if (options.includeCoverPage) {
        console.log('[TENANT REPORT] Generating standardized cover page');
        await generateCoverPage(doc, {
          project_name: projectName,
          client_name: "",
          report_title: "Tenant Tracker Report",
          report_date: new Date().toLocaleDateString(),
          revision: `Rev.${nextRevision}`,
          subtitle: "Tenant Schedule & Progress Analysis",
          project_id: projectId,
          contact_id: options.contactId || undefined,
        });
        console.log('[TENANT REPORT] Standardized cover page generated successfully');
      }
      
      // Add table of contents after cover page if enabled
      if (options.includeTableOfContents) {
        generateTableOfContents(doc, tenants, options);
      }
      
      if (options.includeKPIPage) {
        generateKPIPage(doc, options);
      }
      if (options.includeFloorPlan) {
        await generateLayoutPages(doc);
      }
      if (options.includeTenantSchedule) {
        generateTenantSchedule(doc, options);
      }

      // Convert PDF to blob
      const pdfBlob = doc.output('blob');
      
      // Calculate metrics for database
      const totalArea = tenants.reduce((sum, t) => sum + (t.area || 0), 0);
      const totalDbCost = tenants.reduce((sum, t) => sum + (t.db_cost || 0), 0);
      const totalLightingCost = tenants.reduce((sum, t) => sum + (t.lighting_cost || 0), 0);

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const reportName = `Tenant_Report_${projectName.replace(/\s+/g, '_')}_Rev${nextRevision}_${timestamp}.pdf`;
      const filePath = `${projectId}/${reportName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('tenant-tracker-reports')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save report metadata to database
      const { error: dbError } = await supabase
        .from('tenant_tracker_reports')
        .insert({
          project_id: projectId,
          report_name: reportName,
          revision_number: nextRevision,
          file_path: filePath,
          file_size: pdfBlob.size,
          generated_by: user?.id,
          tenant_count: tenants.length,
          total_area: totalArea,
          total_db_cost: totalDbCost,
          total_lighting_cost: totalLightingCost
        });

      if (dbError) throw dbError;

      // Invalidate reports query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tenant-tracker-reports', projectId] });

      toast.success(`Report saved as Rev.${nextRevision}`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOptionsDialogOpen(true)}
        disabled={isGenerating || tenants.length === 0}
        variant="default"
        size="default"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Generate Report
          </>
        )}
      </Button>

      <ReportOptionsDialog
        open={optionsDialogOpen}
        onOpenChange={setOptionsDialogOpen}
        onGenerate={handleGenerateReport}
        isGenerating={isGenerating}
        projectId={projectId}
      />
    </>
  );
};
