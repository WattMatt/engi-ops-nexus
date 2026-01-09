import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { PDF_BRAND_COLORS, PDF_TYPOGRAPHY, PDF_LAYOUT } from "./roadmapReviewPdfStyles";

export interface CoverPageData {
  project_name: string;
  client_name: string;
  report_title: string;
  report_date: string;
  revision: string;
  subtitle?: string;
  contact_name?: string;
  contact_phone?: string;
  project_id?: string;
  contact_id?: string;
}

/**
 * Generates a standards-compliant cover page per PDF_DESIGN_STANDARDS.md
 * - Title: 28pt Bold (Section 4)
 * - Logo: Max 45mm × 18mm (Section 1)
 * - Margins: 25/22/18/18mm (Section 6)
 */
export async function generateCoverPage(
  doc: jsPDF,
  reportData: CoverPageData
): Promise<void> {
  console.log("Generating standards-compliant cover page");
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Standard margins per PDF_DESIGN_STANDARDS.md
  const margins = {
    top: 25,
    bottom: 22,
    left: 18,
    right: 18
  };
  
  // Fetch company settings
  const { data: settings } = await supabase
    .from("company_settings" as any)
    .select("*")
    .limit(1)
    .maybeSingle();
  
  const companyDetails = settings;
  
  // Fetch project contact if available
  let projectContact = null;
  if (reportData.contact_id) {
    const { data: contact } = await supabase
      .from("project_contacts" as any)
      .select("*")
      .eq('id', reportData.contact_id)
      .maybeSingle();
    projectContact = contact;
  } else if (reportData.project_id) {
    const { data: contacts } = await supabase
      .from("project_contacts" as any)
      .select("*")
      .eq('project_id', reportData.project_id)
      .eq('is_primary', true)
      .order('contact_type', { ascending: true })
      .limit(1);
    
    if (contacts && contacts.length > 0) {
      projectContact = contacts[0];
    }
  }
  
  // === GRADIENT ACCENT BAR (left side) ===
  const barWidth = 8;
  const gradientSteps = 30;
  const stepHeight = pageHeight / gradientSteps;
  
  for (let i = 0; i < gradientSteps; i++) {
    // Gradient from primary to primaryLight
    const ratio = i / gradientSteps;
    const r = Math.round(PDF_BRAND_COLORS.primary[0] + (PDF_BRAND_COLORS.primaryLight[0] - PDF_BRAND_COLORS.primary[0]) * ratio);
    const g = Math.round(PDF_BRAND_COLORS.primary[1] + (PDF_BRAND_COLORS.primaryLight[1] - PDF_BRAND_COLORS.primary[1]) * ratio);
    const b = Math.round(PDF_BRAND_COLORS.primary[2] + (PDF_BRAND_COLORS.primaryLight[2] - PDF_BRAND_COLORS.primary[2]) * ratio);
    
    doc.setFillColor(r, g, b);
    doc.rect(0, i * stepHeight, barWidth, stepHeight + 1, 'F');
  }
  
  // === COMPANY LOGO (centered at top) ===
  let logoEndY = margins.top + 30;
  
  if (companyDetails && 'company_logo_url' in companyDetails && companyDetails.company_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Max logo size: 45mm × 18mm per standards
          const maxWidth = 45;
          const maxHeight = 18;
          const aspectRatio = img.width / img.height;
          let logoWidth = maxWidth;
          let logoHeight = logoWidth / aspectRatio;
          if (logoHeight > maxHeight) {
            logoHeight = maxHeight;
            logoWidth = logoHeight * aspectRatio;
          }
          
          // Center the logo horizontally
          const logoX = (pageWidth - logoWidth) / 2;
          doc.addImage(img, "PNG", logoX, margins.top + 10, logoWidth, logoHeight);
          logoEndY = margins.top + 10 + logoHeight + 15;
          resolve();
        };
        img.onerror = () => resolve(); // Continue without logo
        img.src = companyDetails.company_logo_url as string;
      });
    } catch (e) {
      console.log("Could not load logo, continuing without it");
    }
  }
  
  // === DECORATIVE LINE BELOW LOGO ===
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, logoEndY, pageWidth / 2 + 40, logoEndY);
  
  // === TITLE SECTION (28pt Bold per standards) ===
  const titleY = logoEndY + 25;
  
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.title); // 28pt per standards
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_BRAND_COLORS.text);
  doc.text(reportData.report_title || 'Project Report', pageWidth / 2, titleY, { align: 'center' });
  
  // Subtitle (if provided)
  let subtitleY = titleY + 12;
  if (reportData.subtitle) {
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2); // 14pt
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    doc.text(reportData.subtitle, pageWidth / 2, subtitleY, { align: 'center' });
    subtitleY += 15;
  }
  
  // Project name (larger, prominent)
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h1); // 18pt
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text(reportData.project_name, pageWidth / 2, subtitleY + 10, { align: 'center' });
  
  // Client name
  if (reportData.client_name) {
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3); // 12pt
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    doc.text(reportData.client_name, pageWidth / 2, subtitleY + 22, { align: 'center' });
  }
  
  // === PREPARED FOR / BY SECTIONS ===
  let yPos = pageHeight - 100; // Moved up for better spacing
  const sectionStartX = margins.left + barWidth + 10;
  const rightSectionX = pageWidth - 90;
  
  // Horizontal divider above sections
  doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
  doc.setLineWidth(0.3);
  doc.line(sectionStartX, yPos - 10, pageWidth - margins.right, yPos - 10);
  
  // PREPARED FOR section
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.body); // 10pt
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('PREPARED FOR:', sectionStartX, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_BRAND_COLORS.text);
  yPos += 8;
  
  if (projectContact) {
    const lineHeight = 6;
    if (projectContact.organization_name) {
      doc.text(projectContact.organization_name, sectionStartX, yPos);
      yPos += lineHeight;
    }
    if (projectContact.contact_person_name) {
      doc.text(projectContact.contact_person_name, sectionStartX, yPos);
      yPos += lineHeight;
    }
    if (projectContact.address_line1) {
      doc.text(projectContact.address_line1, sectionStartX, yPos);
      yPos += lineHeight;
    }
    if (projectContact.phone) {
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
      doc.text(`Tel: ${projectContact.phone}`, sectionStartX, yPos);
      yPos += lineHeight;
    }
    if (projectContact.email) {
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
      doc.text(`Email: ${projectContact.email}`, sectionStartX, yPos);
    }
  }
  
  // PREPARED BY section
  yPos = pageHeight - 100;
  
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('PREPARED BY:', rightSectionX, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_BRAND_COLORS.text);
  yPos += 8;
  
  if (companyDetails && 'company_name' in companyDetails && typeof companyDetails.company_name === 'string') {
    const lines = doc.splitTextToSize(companyDetails.company_name as string, 75);
    doc.text(lines, rightSectionX, yPos);
  }
  
  // === DATE AND REVISION (bottom) ===
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_BRAND_COLORS.text);
  doc.text(`Date: ${reportData.report_date}`, sectionStartX, pageHeight - 25);
  doc.text(`Revision: ${reportData.revision}`, rightSectionX, pageHeight - 25);
  
  console.log('Standards-compliant cover page created successfully');
}
