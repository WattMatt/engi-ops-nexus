import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

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
    
    // Page header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Project Overview & KPIs", 20, 25);

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

    let yPos = 45;

    // Summary Stats Cards
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    
    // Card 1: Total Tenants
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 80, 30, 'F');
    doc.text("Total Tenants", 25, yPos + 10);
    doc.setFontSize(20);
    doc.text(totalTenants.toString(), 25, yPos + 23);

    // Card 2: Total Area
    doc.setFontSize(12);
    doc.rect(110, yPos, 80, 30, 'F');
    doc.text("Total Area", 115, yPos + 10);
    doc.setFontSize(20);
    doc.text(`${totalArea.toFixed(2)} m²`, 115, yPos + 23);

    yPos += 40;

    // Card 3: Total DB Cost
    doc.setFontSize(12);
    doc.rect(20, yPos, 80, 30, 'F');
    doc.text("Total DB Cost", 25, yPos + 10);
    doc.setFontSize(20);
    doc.text(`R${totalDbCost.toFixed(2)}`, 25, yPos + 23);

    // Card 4: Total Lighting Cost
    doc.setFontSize(12);
    doc.rect(110, yPos, 80, 30, 'F');
    doc.text("Total Lighting Cost", 115, yPos + 10);
    doc.setFontSize(20);
    doc.text(`R${totalLightingCost.toFixed(2)}`, 115, yPos + 23);

    yPos += 50;

    // Category Breakdown
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Category Breakdown", 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    Object.entries(categoryCounts).forEach(([category, count]) => {
      doc.text(`${getCategoryLabel(category)}: ${count} tenant${count !== 1 ? 's' : ''}`, 25, yPos);
      yPos += 8;
    });

    yPos += 10;

    // Progress Tracking
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Progress Tracking", 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    const progressData = [
      { label: 'SOW Received', value: `${sowReceived}/${totalTenants}`, percentage: (sowReceived / totalTenants * 100).toFixed(1) },
      { label: 'Layout Received', value: `${layoutReceived}/${totalTenants}`, percentage: (layoutReceived / totalTenants * 100).toFixed(1) },
      { label: 'DB Ordered', value: `${dbOrdered}/${totalTenants}`, percentage: (dbOrdered / totalTenants * 100).toFixed(1) },
      { label: 'Lighting Ordered', value: `${lightingOrdered}/${totalTenants}`, percentage: (lightingOrdered / totalTenants * 100).toFixed(1) },
      { label: 'Cost Reported', value: `${costReported}/${totalTenants}`, percentage: (costReported / totalTenants * 100).toFixed(1) },
    ];

    progressData.forEach(item => {
      doc.text(`${item.label}: ${item.value} (${item.percentage}%)`, 25, yPos);
      
      // Progress bar
      const barWidth = 100;
      const barHeight = 4;
      const filledWidth = (parseFloat(item.percentage) / 100) * barWidth;
      
      doc.setFillColor(220, 220, 220);
      doc.rect(130, yPos - 3, barWidth, barHeight, 'F');
      doc.setFillColor(41, 128, 185);
      doc.rect(130, yPos - 3, filledWidth, barHeight, 'F');
      
      yPos += 10;
    });

    // Add page number
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Page 2`, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
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
    // Filter tenants that have layout images (if the field exists)
    const tenantsWithLayouts = tenants.filter(t => t.layout_received && t.layout_image_url);

    if (tenantsWithLayouts.length === 0) {
      // Add a page noting that layouts are tracked but images need to be uploaded
      doc.addPage();
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Tenant Layouts", 20, 25);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${tenants.filter(t => t.layout_received).length} layouts marked as received.`, 20, 45);
      doc.text("Layout images can be attached for inclusion in future reports.", 20, 55);
      
      const pageHeight = doc.internal.pageSize.getHeight();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(10);
      doc.text(`Page ${currentPage}`, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
      return;
    }

    for (const tenant of tenantsWithLayouts) {
      try {
        if (!tenant.layout_image_url) continue;

        // Download the image from storage
        const { data: imageData, error } = await supabase.storage
          .from('floor-plans')
          .download(tenant.layout_image_url);

        if (error || !imageData) {
          console.error(`Failed to download layout for ${tenant.shop_number}:`, error);
          continue;
        }

        // Convert blob to base64
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onloadend = resolve;
          reader.readAsDataURL(imageData);
        });
        
        const base64Image = reader.result as string;

        doc.addPage();
        
        // Page header
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(`${tenant.shop_number} - ${tenant.shop_name}`, 20, 25);

        // Tenant details
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Category: ${getCategoryLabel(tenant.shop_category)}`, 20, 35);
        doc.text(`Area: ${tenant.area?.toFixed(2) || '-'} m²`, 20, 43);
        doc.text(`DB Allowance: ${tenant.db_size_allowance || '-'}`, 20, 51);
        doc.text(`DB Scope of Work: ${tenant.db_size_scope_of_work || '-'}`, 20, 59);

        // Add the layout image
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxWidth = pageWidth - 40;
        const maxHeight = pageHeight - 100;

        // Add image with appropriate sizing
        doc.addImage(base64Image, 'PNG', 20, 70, maxWidth, maxHeight, undefined, 'FAST');

        // Add page number
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10);
        doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      } catch (error) {
        console.error(`Error adding layout for ${tenant.shop_number}:`, error);
      }
    }
  };

  const handleGenerateReport = async () => {
    if (tenants.length === 0) {
      toast.error("No tenants to generate report");
      return;
    }

    setIsGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // Generate pages
      generateCoverPage(doc);
      generateKPIPage(doc);
      generateTenantSchedule(doc);
      await generateLayoutPages(doc);

      // Save the PDF
      const fileName = `Tenant_Report_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success("Report generated successfully");
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
