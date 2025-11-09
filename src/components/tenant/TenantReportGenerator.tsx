import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ReportOptionsDialog, ReportOptions } from "./ReportOptionsDialog";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";

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
    
    // Layout configuration based on mode
    const isCompact = options.kpiLayout === 'compact';
    const fontSize = {
      title: isCompact ? 20 : 24,
      cardLabel: isCompact ? 8 : 9,
      cardValue: isCompact ? 18 : 22,
      cardValueSmall: isCompact ? 14 : 16,
      cardValueLarge: isCompact ? 12 : 14,
      sectionTitle: isCompact ? 10 : 12,
      legendText: isCompact ? 8 : 9,
      progressLabel: isCompact ? 7 : 8,
      progressPercent: isCompact ? 7 : 8,
    };
    const spacing = {
      headerHeight: isCompact ? 30 : 40,
      cardHeight: isCompact ? 25 : 32,
      cardSpacing: isCompact ? 8 : 12,
      sectionSpacing: isCompact ? 12 : 18,
      chartRadius: isCompact ? 16 : 22,
      progressRow: isCompact ? 14 : 18,
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
    
    // Header section
    doc.setFillColor(theme.header[0], theme.header[1], theme.header[2]);
    doc.rect(0, 0, pageWidth, spacing.headerHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(fontSize.title);
    doc.setFont("helvetica", "bold");
    doc.text("Project Overview & KPIs", 20, spacing.headerHeight / 2 + 3);

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

    let yPos = spacing.headerHeight + (isCompact ? 10 : 15);

    // KPI Cards in 2-column grid
    const cardWidth = (pageWidth - 50) / 2;
    const cardHeight = spacing.cardHeight;
    const cardSpacing = 10;
    const leftColX = 20;
    const rightColX = 20 + cardWidth + cardSpacing;

    // Helper function to draw a card with theme and icons
    const drawCard = (x: number, y: number, label: string, value: string, icon?: string) => {
      // Background
      doc.setFillColor(theme.cardBg[0], theme.cardBg[1], theme.cardBg[2]);
      
      if (options.kpiAppearance.showBorders) {
        doc.setDrawColor(theme.cardBorder[0], theme.cardBorder[1], theme.cardBorder[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
      } else {
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      }

      let contentX = x + 4;
      
      // Icon (if enabled)
      if (options.kpiAppearance.showIcons && icon) {
        doc.setFillColor(theme.accent[0], theme.accent[1], theme.accent[2]);
        doc.circle(x + 6, y + (isCompact ? 8 : 10), 2.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.text(icon, x + 6, y + (isCompact ? 9 : 11), { align: 'center' });
        contentX = x + 12;
      }
      
      // Label
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(fontSize.cardLabel);
      doc.setFont("helvetica", "normal");
      doc.text(label, contentX, y + (isCompact ? 7 : 9));
      
      // Value
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(value.length > 8 ? fontSize.cardValueSmall : fontSize.cardValue);
      doc.setFont("helvetica", "bold");
      doc.text(value, contentX, y + (isCompact ? 19 : 23));
    };

    // Card 1: Total Tenants
    if (options.kpiCards.totalTenants) {
      drawCard(leftColX, yPos, "TOTAL TENANTS", totalTenants.toString(), "T");
    }

    // Card 2: Total Area
    if (options.kpiCards.totalArea) {
      drawCard(rightColX, yPos, "TOTAL AREA", `${totalArea.toFixed(0)} m²`, "A");
    }

    // Check if we should move to next row
    const hasFirstRow = options.kpiCards.totalTenants || options.kpiCards.totalArea;
    if (hasFirstRow) {
      yPos += cardHeight + spacing.cardSpacing;
    }

    // Card 3: Total DB Cost
    if (options.kpiCards.totalDbCost) {
      drawCard(leftColX, yPos, "TOTAL DB COST", `R${totalDbCost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, "D");
    }

    // Card 4: Total Lighting Cost
    if (options.kpiCards.totalLightingCost) {
      drawCard(rightColX, yPos, "TOTAL LIGHTING COST", `R${totalLightingCost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, "L");
    }

    // Check if we should add spacing after second row
    const hasSecondRow = options.kpiCards.totalDbCost || options.kpiCards.totalLightingCost;
    if (hasSecondRow) {
      yPos += cardHeight + spacing.sectionSpacing;
    } else if (hasFirstRow) {
      yPos += spacing.sectionSpacing;
    }

    // Category Breakdown with Donut Chart (if category field selected)
    if (options.tenantFields.category && Object.keys(categoryCounts).length > 0) {
      const sectionHeight = isCompact ? 55 : 70;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, yPos, pageWidth - 40, sectionHeight, 2, 2, 'F');
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(fontSize.sectionTitle);
      doc.setFont("helvetica", "bold");
      doc.text("Category Distribution", 25, yPos + (isCompact ? 10 : 12));

      // Donut Chart
      const chartCenterX = isCompact ? 45 : 55;
      const chartCenterY = yPos + (isCompact ? 32 : 40);
      const chartRadius = spacing.chartRadius;
      
      const categoryColors: Record<string, [number, number, number]> = {
        standard: [59, 130, 246],
        fast_food: [239, 68, 68],
        restaurant: [34, 197, 94],
        national: [168, 85, 247]
      };

      let startAngle = -Math.PI / 2; // Start at top
      const categories = Object.entries(categoryCounts);
      
      categories.forEach(([category, count]) => {
        const percentage = count / totalTenants;
        const endAngle = startAngle + (percentage * 2 * Math.PI);
        const color = categoryColors[category] || [100, 116, 139];
        
        // Draw donut slice using triangles for smooth arcs
        for (let angle = startAngle; angle < endAngle; angle += 0.05) {
          const nextAngle = Math.min(angle + 0.05, endAngle);
          const x1 = chartCenterX + chartRadius * Math.cos(angle);
          const y1 = chartCenterY + chartRadius * Math.sin(angle);
          const x2 = chartCenterX + chartRadius * Math.cos(nextAngle);
          const y2 = chartCenterY + chartRadius * Math.sin(nextAngle);
          
          doc.setFillColor(color[0], color[1], color[2]);
          doc.triangle(chartCenterX, chartCenterY, x1, y1, x2, y2, 'F');
        }
        
        startAngle = endAngle;
      });

      // Center hole for donut effect
      doc.setFillColor(248, 250, 252);
      doc.circle(chartCenterX, chartCenterY, chartRadius * 0.55, 'F');

      // Legend
      let legendY = yPos + (isCompact ? 18 : 22);
      const legendX = isCompact ? 75 : 90;
      const legendSpacing = isCompact ? 8 : 10;
      
      categories.forEach(([category, count]) => {
        const color = categoryColors[category] || [100, 116, 139];
        const percentage = ((count / totalTenants) * 100).toFixed(0);
        
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(legendX, legendY - 2.5, 3, 3, 0.5, 0.5, 'F');
        
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(fontSize.legendText);
        doc.setFont("helvetica", "normal");
        doc.text(`${getCategoryLabel(category)}`, legendX + 5, legendY);
        
        doc.setFont("helvetica", "bold");
        doc.text(`${count} (${percentage}%)`, legendX + 40, legendY);
        
        legendY += legendSpacing;
      });

      yPos += sectionHeight + spacing.sectionSpacing;
    }

    // Progress Tracking with Enhanced Bars
    const progressFields = [
      { key: 'sowReceived', label: 'SOW Received', value: sowReceived },
      { key: 'layoutReceived', label: 'Layout Received', value: layoutReceived },
      { key: 'dbOrdered', label: 'DB Ordered', value: dbOrdered },
      { key: 'lightingOrdered', label: 'Lighting Ordered', value: lightingOrdered },
    ];

    const visibleProgress = progressFields.filter(item => {
      if (item.key === 'sowReceived') return options.tenantFields.sowReceived;
      if (item.key === 'layoutReceived') return options.tenantFields.layoutReceived;
      if (item.key === 'dbOrdered') return options.tenantFields.dbOrdered;
      if (item.key === 'lightingOrdered') return options.tenantFields.lightingOrdered;
      return false;
    });

    if (visibleProgress.length > 0) {
      const progressHeight = visibleProgress.length * spacing.progressRow + (isCompact ? 18 : 22);
      doc.setFillColor(theme.cardBg[0], theme.cardBg[1], theme.cardBg[2]);
      doc.roundedRect(20, yPos, pageWidth - 40, progressHeight, 2, 2, 'F');
      
      if (options.kpiAppearance.showBorders) {
        doc.setDrawColor(theme.cardBorder[0], theme.cardBorder[1], theme.cardBorder[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(20, yPos, pageWidth - 40, progressHeight, 2, 2, 'S');
      }
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(fontSize.sectionTitle);
      doc.setFont("helvetica", "bold");
      doc.text("Completion Progress", 25, yPos + (isCompact ? 10 : 12));

      let progressY = yPos + (isCompact ? 20 : 24);
      visibleProgress.forEach(item => {
        const percentage = (item.value / totalTenants * 100);
        
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(fontSize.progressLabel);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, 25, progressY);
        
        doc.setFont("helvetica", "bold");
        doc.text(`${item.value}/${totalTenants}`, 62, progressY);
        
        // Progress bar
        const barX = 85;
        const barWidth = pageWidth - 125;
        const barHeight = 5;
        const filledWidth = (percentage / 100) * barWidth;
        
        // Background
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(barX, progressY - 3, barWidth, barHeight, 1.5, 1.5, 'F');
        
        // Filled portion with color based on percentage
        if (filledWidth > 0) {
          let barColor: [number, number, number];
          if (percentage >= 75) barColor = [34, 197, 94];
          else if (percentage >= 50) barColor = [59, 130, 246];
          else if (percentage >= 25) barColor = [251, 191, 36];
          else barColor = [239, 68, 68];
          
          doc.setFillColor(barColor[0], barColor[1], barColor[2]);
          doc.roundedRect(barX, progressY - 3, filledWidth, barHeight, 1.5, 1.5, 'F');
        }
        
        // Percentage
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(fontSize.progressPercent);
        doc.setFont("helvetica", "bold");
        doc.text(`${percentage.toFixed(0)}%`, barX + barWidth + 2, progressY);
        
        progressY += spacing.progressRow;
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
    
    // Draw legend with colored circles
    const legendY = 32;
    const legendX = 20;
    
    // Completed circle
    doc.setFillColor(34, 197, 94); // Green
    doc.circle(legendX + 3, legendY - 2, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("✓", legendX + 3, legendY + 0.5, { align: 'center' });
    
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("= Completed/Received", legendX + 10, legendY);
    
    // Pending circle
    const pendingX = legendX + 80;
    doc.setFillColor(239, 68, 68); // Red
    doc.circle(pendingX + 3, legendY - 2, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("✗", pendingX + 3, legendY + 0.5, { align: 'center' });
    
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("= Pending/Not Received", pendingX + 10, legendY);

    // Calculate completion statistics
    const totalTenants = tenants.length;
    const sowReceived = tenants.filter(t => t.sow_received).length;
    const layoutReceived = tenants.filter(t => t.layout_received).length;
    const dbOrdered = tenants.filter(t => t.db_ordered).length;
    const lightingOrdered = tenants.filter(t => t.lighting_ordered).length;

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
          case 'dbCost': row.push(tenant.db_cost ? `R${tenant.db_cost.toFixed(2)}` : '-'); break;
          case 'lightingOrdered': row.push(tenant.lighting_ordered ? '✓' : '✗'); break;
          case 'lightingCost': row.push(tenant.lighting_cost ? `R${tenant.lighting_cost.toFixed(2)}` : '-'); break;
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
            if (['sowReceived', 'layoutReceived', 'dbOrdered', 'lightingOrdered'].includes(key)) {
              return [index, { halign: 'center', cellWidth: 15 }];
            }
            return [index, {}];
          }).filter(([_, style]) => Object.keys(style).length > 0)
        )
      },
      didDrawCell: (data) => {
        // Custom rendering for checkbox cells with colored backgrounds
        const key = fieldKeys[data.column.index];
        if (['sowReceived', 'layoutReceived', 'dbOrdered', 'lightingOrdered'].includes(key) && data.section === 'body') {
          const cellValue = data.cell.raw as string;
          if (cellValue === '✓' || cellValue === '✗') {
            const isChecked = cellValue === '✓';
            
            // Calculate center position for the circle
            const centerX = data.cell.x + data.cell.width / 2;
            const centerY = data.cell.y + data.cell.height / 2;
            const radius = 3;
            
            // Draw colored circle background
            if (isChecked) {
              doc.setFillColor(34, 197, 94); // Green
            } else {
              doc.setFillColor(239, 68, 68); // Red
            }
            doc.circle(centerX, centerY, radius, 'F');
            
            // Draw white symbol on top
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(cellValue, centerX, centerY + 2.5, { align: 'center' });
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
      
      // Professional header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
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
    
    // Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
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
    
    // Only show Tenant Documents Index if the option is enabled
    if (options.includeTenantDocumentIndex) {
      // Tenant Documents section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Tenant Documents Index", 20, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "italic");
      doc.text("Documents are organized by tenant in the appendix. Each tenant's section includes:", 20, yPos);
      yPos += 5;
      doc.text("• Scope of Work (SOW) documents", 25, yPos);
      yPos += 5;
      doc.text("• Layout plans and drawings", 25, yPos);
      yPos += 5;
      doc.text("• Cost breakdowns and quotations", 25, yPos);
      yPos += 10;
      
      // Table header
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Shop Number", 20, yPos);
      doc.text("Shop Name", 65, yPos);
      doc.text("Category", 130, yPos);
      doc.text("Status", 165, yPos);
      
      // Draw line under header
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);
      yPos += 8;
      
      // List all tenants with their status
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      tenants.forEach((tenant, idx) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
          
          // Repeat header on new page
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("Shop Number", 20, yPos);
          doc.text("Shop Name", 65, yPos);
          doc.text("Category", 130, yPos);
          doc.text("Status", 165, yPos);
          doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);
          yPos += 8;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
        }
        
        const isComplete = isTenantComplete(tenant);
        
        doc.setTextColor(0, 0, 0);
        doc.text(tenant.shop_number, 20, yPos);
        doc.text(tenant.shop_name.substring(0, 25), 65, yPos);
        doc.text(getCategoryLabel(tenant.shop_category), 130, yPos);
        
        // Status indicator
        if (isComplete) {
          doc.setTextColor(22, 163, 74); // Green
          doc.text("✓ Complete", 165, yPos);
        } else {
          doc.setTextColor(234, 179, 8); // Yellow
          doc.text("⚠ In Progress", 165, yPos);
        }
        
        yPos += 6;
      });
    }
    
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
      
      // Fetch company details for standardized cover page
      const companyDetails = await fetchCompanyDetails();
      console.log('[TENANT REPORT] Company details fetched:', companyDetails);

      // Generate pages based on options
      if (options.includeCoverPage) {
        console.log('[TENANT REPORT] Generating standardized cover page');
        await generateCoverPage(doc, {
          title: "Tenant Tracker Report",
          projectName: projectName,
          subtitle: "Tenant Schedule & Progress Analysis",
          revision: `Rev.${nextRevision}`,
        }, companyDetails);
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
