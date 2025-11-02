import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

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

  const generateCoverPage = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cover background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text("TENANT TRACKER REPORT", pageWidth / 2, 80, { align: 'center' });

    // Project name
    doc.setFontSize(24);
    doc.setFont("helvetica", "normal");
    doc.text(projectName, pageWidth / 2, 110, { align: 'center' });

    // Date
    doc.setFontSize(14);
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`Generated: ${currentDate}`, pageWidth / 2, 140, { align: 'center' });

    // Decorative line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(2);
    doc.line(50, 160, pageWidth - 50, 160);

    // Footer
    doc.setFontSize(12);
    doc.text("WM Consulting", pageWidth / 2, pageHeight - 30, { align: 'center' });
  };

  const generateKPIPage = (doc: jsPDF) => {
    doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Professional header section
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("Project Overview & KPIs", 20, 30);

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
    const costReported = tenants.filter(t => t.cost_reported).length;

    let yPos = 65;
    const cardWidth = 85;
    const cardHeight = 45;
    const cardSpacing = 10;

    // Professional KPI Cards Row 1
    // Card 1: Total Tenants
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, cardWidth, cardHeight, 3, 3, 'FD');
    
    doc.setFillColor(41, 128, 185);
    doc.circle(30, yPos + 10, 4, 'F');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL TENANTS", 40, yPos + 12);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(totalTenants.toString(), 25, yPos + 35);

    // Card 2: Total Area
    const card2X = 20 + cardWidth + cardSpacing;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 3, 3, 'FD');
    
    doc.setFillColor(46, 204, 113);
    doc.circle(card2X + 10, yPos + 10, 4, 'F');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL AREA", card2X + 20, yPos + 12);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(`${totalArea.toFixed(0)} m²`, card2X + 5, yPos + 35);

    yPos += cardHeight + cardSpacing;

    // Professional KPI Cards Row 2
    // Card 3: Total DB Cost
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(20, yPos, cardWidth, cardHeight, 3, 3, 'FD');
    
    doc.setFillColor(230, 126, 34);
    doc.circle(30, yPos + 10, 4, 'F');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL DB COST", 40, yPos + 12);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`R${totalDbCost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, yPos + 35);

    // Card 4: Total Lighting Cost
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 3, 3, 'FD');
    
    doc.setFillColor(241, 196, 15);
    doc.circle(card2X + 10, yPos + 10, 4, 'F');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("LIGHTING COST", card2X + 20, yPos + 12);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`R${totalLightingCost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, card2X + 5, yPos + 35);

    yPos += cardHeight + 20;

    // Category Breakdown Section
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(20, yPos, pageWidth - 40, 60, 3, 3, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Category Breakdown", 30, yPos + 15);

    let categoryY = yPos + 28;
    const categoryColors: Record<string, [number, number, number]> = {
      standard: [52, 152, 219],
      fast_food: [231, 76, 60],
      restaurant: [46, 204, 113],
      national: [155, 89, 182]
    };

    Object.entries(categoryCounts).forEach(([category, count]) => {
      const color = categoryColors[category] || [128, 128, 128];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(35, categoryY, 3, 'F');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`${getCategoryLabel(category)}`, 45, categoryY + 2);
      
      doc.setFont("helvetica", "bold");
      doc.text(`${count} tenant${count !== 1 ? 's' : ''}`, 130, categoryY + 2);
      
      categoryY += 10;
    });

    yPos += 70;

    // Progress Tracking Section
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(20, yPos, pageWidth - 40, 80, 3, 3, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Progress Tracking", 30, yPos + 15);

    const progressData = [
      { label: 'SOW Received', value: sowReceived, color: [41, 128, 185] },
      { label: 'Layout Received', value: layoutReceived, color: [46, 204, 113] },
      { label: 'DB Ordered', value: dbOrdered, color: [230, 126, 34] },
      { label: 'Lighting Ordered', value: lightingOrdered, color: [241, 196, 15] },
      { label: 'Cost Reported', value: costReported, color: [155, 89, 182] },
    ];

    let progressY = yPos + 28;
    progressData.forEach(item => {
      const percentage = (item.value / totalTenants * 100);
      
      // Label and count
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, 30, progressY);
      
      doc.setFont("helvetica", "bold");
      doc.text(`${item.value}/${totalTenants}`, 85, progressY);
      
      // Progress bar
      const barX = 105;
      const barWidth = 80;
      const barHeight = 6;
      const filledWidth = (percentage / 100) * barWidth;
      
      // Background
      doc.setFillColor(220, 220, 220);
      doc.roundedRect(barX, progressY - 4, barWidth, barHeight, 1, 1, 'F');
      
      // Filled portion
      if (filledWidth > 0) {
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.roundedRect(barX, progressY - 4, filledWidth, barHeight, 1, 1, 'F');
      }
      
      // Percentage text
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`${percentage.toFixed(0)}%`, barX + barWidth + 3, progressY);
      
      progressY += 12;
    });

    // Page footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(`Page 2`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  const generateTenantSchedule = (doc: jsPDF) => {
    doc.addPage();
    
    // Page header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Tenant Schedule", 20, 25);

    const tableData = tenants.map(tenant => [
      tenant.shop_number,
      tenant.shop_name,
      getCategoryLabel(tenant.shop_category),
      tenant.area?.toFixed(2) || '-',
      tenant.db_size_allowance || '-',
      tenant.db_size_scope_of_work || '-',
      tenant.sow_received ? '✓' : '✗',
      tenant.layout_received ? '✓' : '✗',
      tenant.db_ordered ? '✓' : '✗',
      tenant.db_cost ? `R${tenant.db_cost.toFixed(2)}` : '-',
      tenant.lighting_ordered ? '✓' : '✗',
      tenant.lighting_cost ? `R${tenant.lighting_cost.toFixed(2)}` : '-',
    ]);

    autoTable(doc, {
      startY: 35,
      head: [[
        'Shop #',
        'Shop Name',
        'Category',
        'Area (m²)',
        'DB Allow.',
        'DB SOW',
        'SOW',
        'Layout',
        'DB Ord',
        'DB Cost',
        'Light Ord',
        'Light Cost'
      ]],
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
        0: { cellWidth: 15 },
        1: { cellWidth: 25 },
        2: { cellWidth: 18 },
        3: { cellWidth: 15 },
        4: { cellWidth: 17 },
        5: { cellWidth: 17 },
        6: { cellWidth: 10 },
        7: { cellWidth: 10 },
        8: { cellWidth: 12 },
        9: { cellWidth: 18 },
        10: { cellWidth: 15 },
        11: { cellWidth: 18 },
      },
      didDrawPage: (data) => {
        // Add page number
        const pageHeight = doc.internal.pageSize.getHeight();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
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

      // Download the composite image
      const response = await fetch(floorPlanRecord.composite_image_url);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      doc.addPage();
      
      // Professional header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Floor Plan with Tenant Zones", 20, 25);

      // Add the composite image
      const maxWidth = pageWidth - 40;
      const maxHeight = pageHeight - 80;
      
      // Calculate aspect ratio to fit the image properly
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = base64Image;
      });
      
      let imgWidth = maxWidth;
      let imgHeight = (img.height / img.width) * maxWidth;
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (img.width / img.height) * maxHeight;
      }
      
      const imgX = (pageWidth - imgWidth) / 2;
      const imgY = 50;

      doc.addImage(base64Image, 'PNG', imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');

      // Add legend/note at bottom
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Colored zones represent tenant spaces as configured in Floor Plan Masking.", 20, pageHeight - 20);

      // Page footer
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
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

  const handleGenerateReport = async () => {
    if (tenants.length === 0) {
      toast.error("No tenants to generate report");
      return;
    }

    setIsGenerating(true);
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

      // Generate pages
      generateCoverPage(doc);
      generateKPIPage(doc);
      generateTenantSchedule(doc);
      await generateLayoutPages(doc);

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
    <Button
      onClick={handleGenerateReport}
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
  );
};
