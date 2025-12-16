/**
 * Lighting Report PDF Generator
 * Generates comprehensive lighting reports with schedules, specifications, and analysis
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { initializePDF, STANDARD_MARGINS, addSectionHeader, addBodyText, addPageNumbers } from "./pdfExportBase";
import { LightingReportConfig } from "@/components/lighting/reports/LightingReportTab";
import { format } from "date-fns";

interface ProjectData {
  project_name: string;
  project_number: string;
  client_name?: string;
}

interface TenantScheduleData {
  shop_number: string;
  shop_name: string;
  area: number;
  items: {
    fitting_code: string;
    description: string;
    quantity: number;
    wattage: number;
    total_wattage: number;
    status: string;
    supply_cost: number;
    install_cost: number;
  }[];
}

interface FittingSpec {
  manufacturer: string;
  model_number: string;
  wattage: number;
  lumens: number | null;
  color_temperature: number | null;
  cri: number | null;
  ip_rating: string | null;
  fitting_type: string;
  quantity_used: number;
}

export const generateLightingReportPDF = async (
  projectId: string,
  config: LightingReportConfig
): Promise<void> => {
  const doc = initializePDF({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Fetch project data
  const { data: project } = await supabase
    .from('projects')
    .select('project_name, project_number')
    .eq('id', projectId)
    .single();

  const projectData: ProjectData = {
    project_name: project?.project_name || 'Untitled Project',
    project_number: project?.project_number || '',
  };

  let currentPage = 1;
  const tocEntries: { title: string; page: number }[] = [];

  // Cover Page
  if (config.includesCoverPage) {
    generateCoverPage(doc, projectData, pageWidth, pageHeight);
    currentPage++;
  }

  // Table of Contents placeholder (will be filled later)
  let tocPageStart = currentPage;
  if (config.includeTableOfContents) {
    doc.addPage();
    currentPage++;
  }

  // Executive Summary
  if (config.sections.executiveSummary) {
    doc.addPage();
    tocEntries.push({ title: 'Executive Summary', page: currentPage });
    generateExecutiveSummary(doc, projectId, pageWidth);
    currentPage++;
  }

  // Schedule by Tenant
  if (config.sections.scheduleByTenant) {
    const scheduleData = await fetchScheduleData(projectId);
    if (scheduleData.length > 0) {
      doc.addPage();
      tocEntries.push({ title: 'Lighting Schedule by Tenant', page: currentPage });
      currentPage = await generateScheduleByTenant(doc, scheduleData, currentPage);
    }
  }

  // Specification Sheets
  if (config.sections.specificationSheets) {
    const specs = await fetchSpecifications(projectId);
    if (specs.length > 0) {
      doc.addPage();
      tocEntries.push({ title: 'Specification Summary', page: currentPage });
      generateSpecificationSummary(doc, specs, pageWidth);
      currentPage++;
    }
  }

  // Cost Summary
  if (config.sections.costSummary) {
    const scheduleData = await fetchScheduleData(projectId);
    doc.addPage();
    tocEntries.push({ title: 'Cost Summary', page: currentPage });
    generateCostSummary(doc, scheduleData, pageWidth);
    currentPage++;
  }

  // Energy Analysis
  if (config.sections.energyAnalysis) {
    const scheduleData = await fetchScheduleData(projectId);
    doc.addPage();
    tocEntries.push({ title: 'Energy Analysis', page: currentPage });
    generateEnergyAnalysis(doc, scheduleData, pageWidth);
    currentPage++;
  }

  // Fill in Table of Contents
  if (config.includeTableOfContents) {
    generateTableOfContents(doc, tocEntries, tocPageStart, pageWidth);
  }

  // Add page numbers
  addPageNumbers(doc, config.includesCoverPage ? 2 : 1);

  // Save the PDF
  const fileName = `Lighting_Report_${projectData.project_number || 'Report'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

const generateCoverPage = (
  doc: jsPDF,
  projectData: ProjectData,
  pageWidth: number,
  pageHeight: number
): void => {
  // Background
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Title
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('LIGHTING REPORT', pageWidth / 2, pageHeight / 3, { align: 'center' });

  // Project Name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'normal');
  doc.text(projectData.project_name, pageWidth / 2, pageHeight / 3 + 20, { align: 'center' });

  // Project Number
  if (projectData.project_number) {
    doc.setFontSize(14);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Project: ${projectData.project_number}`, pageWidth / 2, pageHeight / 3 + 35, { align: 'center' });
  }

  // Date
  doc.setFontSize(12);
  doc.text(format(new Date(), 'dd MMMM yyyy'), pageWidth / 2, pageHeight - 40, { align: 'center' });
};

const generateTableOfContents = (
  doc: jsPDF,
  entries: { title: string; page: number }[],
  tocPage: number,
  pageWidth: number
): void => {
  doc.setPage(tocPage);
  
  let y = addSectionHeader(doc, 'Table of Contents', STANDARD_MARGINS.top);
  y += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  entries.forEach((entry, index) => {
    doc.setTextColor(51, 65, 85);
    doc.text(`${index + 1}. ${entry.title}`, STANDARD_MARGINS.left, y);
    
    doc.setTextColor(100, 116, 139);
    const pageText = `Page ${entry.page}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - STANDARD_MARGINS.right - pageTextWidth, y);
    
    y += 8;
  });
};

const generateExecutiveSummary = async (
  doc: jsPDF,
  projectId: string,
  pageWidth: number
): Promise<void> => {
  let y = addSectionHeader(doc, 'Executive Summary', STANDARD_MARGINS.top);
  y += 10;

  addBodyText(doc, 'This report provides a comprehensive overview of the lighting design and', STANDARD_MARGINS.left, y);
  y += 6;
  addBodyText(doc, 'specifications for this project, including schedules, costs, and energy analysis.', STANDARD_MARGINS.left, y);
};

const fetchScheduleData = async (projectId: string): Promise<TenantScheduleData[]> => {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, shop_name, shop_number, area')
    .eq('project_id', projectId);

  const { data: schedules } = await supabase
    .from('project_lighting_schedules')
    .select(`
      id,
      tenant_id,
      quantity,
      approval_status,
      lighting_fittings (
        manufacturer,
        model_number,
        wattage,
        supply_cost,
        install_cost
      )
    `)
    .eq('project_id', projectId);

  return (tenants || []).map(tenant => {
    const tenantItems = (schedules || [])
      .filter(s => s.tenant_id === tenant.id)
      .map(s => {
        const fitting = s.lighting_fittings as any;
        const wattage = fitting?.wattage || 0;
        const quantity = s.quantity || 1;
        return {
          fitting_code: fitting?.model_number || 'N/A',
          description: fitting ? `${fitting.manufacturer} ${fitting.model_number}` : 'Unknown',
          quantity,
          wattage,
          total_wattage: wattage * quantity,
          status: s.approval_status || 'pending',
          supply_cost: (fitting?.supply_cost || 0) * quantity,
          install_cost: (fitting?.install_cost || 0) * quantity,
        };
      });

    return {
      shop_number: tenant.shop_number || '',
      shop_name: tenant.shop_name || 'Unnamed',
      area: tenant.area || 0,
      items: tenantItems,
    };
  }).filter(t => t.items.length > 0);
};

const generateScheduleByTenant = async (
  doc: jsPDF,
  schedules: TenantScheduleData[],
  startPage: number
): Promise<number> => {
  let currentPage = startPage;
  let y = addSectionHeader(doc, 'Lighting Schedule by Tenant', STANDARD_MARGINS.top);
  y += 10;

  for (const schedule of schedules) {
    // Tenant header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${schedule.shop_number} - ${schedule.shop_name} (${schedule.area}m²)`, STANDARD_MARGINS.left, y);
    y += 8;

    // Items table
    const tableData = schedule.items.map((item, index) => [
      (index + 1).toString(),
      item.fitting_code,
      item.description,
      item.quantity.toString(),
      `${item.wattage}W`,
      `${item.total_wattage}W`,
      item.status,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Code', 'Description', 'Qty', 'Wattage', 'Total W', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      margin: STANDARD_MARGINS,
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Check for page break
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      currentPage++;
      y = STANDARD_MARGINS.top;
    }
  }

  return currentPage;
};

const fetchSpecifications = async (projectId: string): Promise<FittingSpec[]> => {
  const { data: schedules } = await supabase
    .from('project_lighting_schedules')
    .select(`
      quantity,
      lighting_fittings (
        id,
        manufacturer,
        model_number,
        wattage,
        lumens,
        color_temperature,
        cri,
        ip_rating,
        fitting_type
      )
    `)
    .eq('project_id', projectId);

  const fittingMap = new Map<string, FittingSpec>();

  (schedules || []).forEach(schedule => {
    const fitting = schedule.lighting_fittings as any;
    if (!fitting) return;

    const existing = fittingMap.get(fitting.id);
    if (existing) {
      existing.quantity_used += schedule.quantity || 1;
    } else {
      fittingMap.set(fitting.id, {
        manufacturer: fitting.manufacturer,
        model_number: fitting.model_number,
        wattage: fitting.wattage,
        lumens: fitting.lumens,
        color_temperature: fitting.color_temperature,
        cri: fitting.cri,
        ip_rating: fitting.ip_rating,
        fitting_type: fitting.fitting_type || 'General',
        quantity_used: schedule.quantity || 1,
      });
    }
  });

  return Array.from(fittingMap.values());
};

const generateSpecificationSummary = (
  doc: jsPDF,
  specs: FittingSpec[],
  pageWidth: number
): void => {
  let y = addSectionHeader(doc, 'Specification Summary', STANDARD_MARGINS.top);
  y += 10;

  const tableData = specs.map(spec => [
    spec.manufacturer,
    spec.model_number,
    `${spec.wattage}W`,
    spec.lumens ? `${spec.lumens} lm` : 'N/A',
    spec.color_temperature ? `${spec.color_temperature}K` : 'N/A',
    spec.cri?.toString() || 'N/A',
    spec.ip_rating || 'N/A',
    spec.quantity_used.toString(),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Manufacturer', 'Model', 'Wattage', 'Lumens', 'CCT', 'CRI', 'IP', 'Qty']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    margin: STANDARD_MARGINS,
  });
};

const generateCostSummary = (
  doc: jsPDF,
  schedules: TenantScheduleData[],
  pageWidth: number
): void => {
  let y = addSectionHeader(doc, 'Cost Summary', STANDARD_MARGINS.top);
  y += 10;

  let totalSupply = 0;
  let totalInstall = 0;

  const tableData = schedules.map(schedule => {
    const supply = schedule.items.reduce((sum, item) => sum + item.supply_cost, 0);
    const install = schedule.items.reduce((sum, item) => sum + item.install_cost, 0);
    totalSupply += supply;
    totalInstall += install;

    return [
      schedule.shop_number,
      schedule.shop_name,
      `R${supply.toLocaleString()}`,
      `R${install.toLocaleString()}`,
      `R${(supply + install).toLocaleString()}`,
    ];
  });

  // Add totals row
  tableData.push([
    '',
    'TOTAL',
    `R${totalSupply.toLocaleString()}`,
    `R${totalInstall.toLocaleString()}`,
    `R${(totalSupply + totalInstall).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Shop #', 'Tenant', 'Supply Cost', 'Install Cost', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    margin: STANDARD_MARGINS,
  });
};

const generateEnergyAnalysis = (
  doc: jsPDF,
  schedules: TenantScheduleData[],
  pageWidth: number
): void => {
  let y = addSectionHeader(doc, 'Energy Analysis', STANDARD_MARGINS.top);
  y += 10;

  const operatingHours = 12; // Default hours per day
  const electricityRate = 2.5; // R/kWh

  const tableData = schedules.map(schedule => {
    const totalWattage = schedule.items.reduce((sum, item) => sum + item.total_wattage, 0);
    const monthlyKwh = (totalWattage * operatingHours * 30) / 1000;
    const annualKwh = monthlyKwh * 12;
    const annualCost = annualKwh * electricityRate;

    return [
      schedule.shop_number,
      schedule.shop_name,
      `${totalWattage}W`,
      `${monthlyKwh.toFixed(1)} kWh`,
      `${annualKwh.toFixed(0)} kWh`,
      `R${annualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Shop #', 'Tenant', 'Load', 'Monthly kWh', 'Annual kWh', 'Annual Cost']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    margin: STANDARD_MARGINS,
  });

  // Add notes
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`* Based on ${operatingHours} operating hours per day at R${electricityRate}/kWh`, STANDARD_MARGINS.left, finalY);
};
