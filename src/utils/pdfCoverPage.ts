/**
 * PDF Cover Page Generator
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIGRATION STATUS: SUPPORTS BOTH jsPDF AND PDFMAKE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This module provides cover page generation for both:
 * - jsPDF (legacy) - generateCoverPage function accepts jsPDF doc
 * - pdfmake (new) - generateCoverPageContent returns Content array
 * 
 * NEW CODE SHOULD USE PDFMAKE:
 * ```typescript
 * import { generateCoverPageContent } from '@/utils/pdfmake/coverPage';
 * ```
 */

import jsPDF from "jspdf";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Content } from 'pdfmake/interfaces';
import { PDF_COLORS, FONT_SIZES, PAGE_SIZES, imageToBase64, spacer } from './pdfmake';

export interface CoverPageOptions {
  /** Main title at top of page (e.g., "Financial Evaluation", "Cable Schedule") */
  title: string;
  /** Project or report name (e.g., "Segonyana Mall", "Generator Report") */
  projectName: string;
  /** Subtitle below project name (e.g., "Centre Standby Plant", "Schedule #123") */
  subtitle: string;
  /** Revision information (e.g., "Rev 0", "Rev 1") */
  revision: string;
  /** Optional date override (defaults to current date if not provided) */
  date?: string;
}

export interface CompanyDetails {
  /** Company name from settings (defaults to "WATSON MATTHEUS...") */
  companyName: string;
  /** URL to company logo from storage (optional) */
  logoUrl?: string;
  /** Contact person name from logged-in user's employee record */
  contactName: string;
  /** Contact phone number from employee record or default */
  contactPhone: string;
  /** Client/recipient name for "Prepared For" section */
  clientName?: string;
  /** Client logo URL for cover pages */
  clientLogoUrl?: string;
  /** Client address line 1 */
  clientAddressLine1?: string;
  /** Client address line 2 */
  clientAddressLine2?: string;
  /** Client phone number */
  clientPhone?: string;
}

/**
 * Fetches company settings and current user details for the cover page.
 */
export async function fetchCompanyDetails(): Promise<CompanyDetails> {
  // Fetch company settings
  const { data: companySettings } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const logoUrl = companySettings?.company_logo_url;
  const companyName = companySettings?.company_name || "WATSON MATTHEUS CONSULTING ELECTRICAL ENGINEERS (PTY) LTD";
  const clientName = companySettings?.client_name;
  const clientLogoUrl = companySettings?.client_logo_url;
  const clientAddressLine1 = companySettings?.client_address_line1;
  const clientAddressLine2 = companySettings?.client_address_line2;
  const clientPhone = companySettings?.client_phone;

  // Fetch current user details
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  // Get user profile for full name
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", currentUser?.id)
    .maybeSingle();

  // Try to get employee details for phone number
  const { data: employeeData } = await supabase
    .from("employees")
    .select("phone")
    .eq("user_id", currentUser?.id)
    .maybeSingle();

  const contactName = profileData?.full_name || currentUser?.email?.split("@")[0] || "Contact Person";
  const contactPhone = employeeData?.phone || "(012) 665 3487";

  return {
    companyName,
    logoUrl,
    contactName,
    contactPhone,
    clientName,
    clientLogoUrl,
    clientAddressLine1,
    clientAddressLine2,
    clientPhone,
  };
}

/**
 * Generate default modern cover page using jsPDF
 * @deprecated Use generateCoverPageContent for pdfmake instead
 */
export async function generateCoverPage(
  doc: jsPDF,
  options: CoverPageOptions,
  companyDetails: CompanyDetails,
  contactDetails?: any
): Promise<void> {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPos = 0;

  // Modern color definitions
  const colors = {
    primary: [30, 58, 138] as [number, number, number],
    secondary: [59, 130, 246] as [number, number, number],
    accent: [99, 102, 241] as [number, number, number],
    light: [241, 245, 249] as [number, number, number],
    neutral: [71, 85, 105] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    text: [15, 23, 42] as [number, number, number]
  };
  
  // Modern gradient left accent bar
  const barWidth = 12;
  for (let i = 0; i < pageHeight; i += 3) {
    const ratio = i / pageHeight;
    const r = Math.round(colors.primary[0] + (colors.secondary[0] - colors.primary[0]) * ratio);
    const g = Math.round(colors.primary[1] + (colors.secondary[1] - colors.primary[1]) * ratio);
    const b = Math.round(colors.primary[2] + (colors.secondary[2] - colors.primary[2]) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(0, i, barWidth, 3, 'F');
  }
  
  // Main title with modern styling
  doc.setTextColor(...colors.primary);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, pageWidth / 2, 70, { align: "center" });
  
  // Subtle underline
  doc.setDrawColor(...colors.secondary);
  doc.setLineWidth(0.8);
  const titleWidth = doc.getTextWidth(options.title);
  doc.line(pageWidth / 2 - titleWidth / 2, 73, pageWidth / 2 + titleWidth / 2, 73);
  
  // Project name - larger, bold heading
  yPos = 95;
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.text);
  doc.text(options.projectName, pageWidth / 2, yPos, { align: "center" });
  
  // Subtitle with accent color
  yPos += 32;
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.secondary);
  doc.text(options.subtitle, pageWidth / 2, yPos, { align: "center" });
  
  // Add client logo if available
  const clientLogoUrl = contactDetails?.logo_url || companyDetails.clientLogoUrl;
  if (clientLogoUrl) {
    try {
      const clientLogoResponse = await fetch(clientLogoUrl);
      if (clientLogoResponse.ok) {
        const clientLogoBlob = await clientLogoResponse.blob();
        if (clientLogoBlob && clientLogoBlob.size > 0 && clientLogoBlob.type.startsWith('image/')) {
          const clientLogoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              if (result && result.length > 100) resolve(result);
              else reject(new Error('Invalid data URL'));
            };
            reader.onerror = () => reject(new Error('Failed to read logo blob'));
            reader.readAsDataURL(clientLogoBlob);
          });
          
          const clientLogoWidth = 45;
          const clientLogoHeight = 32;
          const clientLogoX = pageWidth - clientLogoWidth - 28;
          const clientLogoY = 135;
          
          doc.setFillColor(...colors.light);
          doc.roundedRect(clientLogoX - 5, clientLogoY - 5, clientLogoWidth + 10, clientLogoHeight + 10, 3, 3, 'F');
          doc.addImage(clientLogoDataUrl, 'PNG', clientLogoX, clientLogoY, clientLogoWidth, clientLogoHeight);
        }
      }
    } catch (error) {
      console.error("Failed to add client logo to PDF:", error);
    }
  }
  
  // Company details section
  yPos = 175;
  
  // Light background card
  doc.setFillColor(...colors.light);
  doc.roundedRect(22, yPos - 4, pageWidth - 44, 50, 3, 3, 'F');
  
  doc.setTextColor(...colors.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PREPARED BY:", 28, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.text);
  doc.text(companyDetails.companyName.toUpperCase(), 28, yPos);
  
  yPos += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.neutral);
  doc.text("141 Witch Hazel Ave,", 28, yPos);
  
  yPos += 6;
  doc.text("Highveld Techno Park, Building 1A", 28, yPos);
  
  yPos += 6;
  doc.text(`Tel: ${companyDetails.contactPhone}`, 28, yPos);
  
  yPos += 6;
  doc.text(`Contact: ${companyDetails.contactName}`, 28, yPos);
  
  // Add company logo
  if (companyDetails.logoUrl) {
    try {
      console.log('Attempting to load logo from:', companyDetails.logoUrl);
      const logoResponse = await fetch(companyDetails.logoUrl);
      
      if (!logoResponse.ok) {
        throw new Error(`Failed to fetch logo: ${logoResponse.status} ${logoResponse.statusText}`);
      }

      const logoBlob = await logoResponse.blob();
      if (logoBlob.size === 0) {
        throw new Error('Logo blob is empty');
      }

      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string' && reader.result.length > 100) {
            resolve(reader.result);
          } else {
            reject(new Error('Invalid data URL result'));
          }
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(logoBlob);
      });
      
      const logoWidth = 35;
      const logoHeight = 26;
      const logoX = pageWidth - logoWidth - 28;
      const logoY = 152;
      
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
      console.log('Logo added successfully');
    } catch (error) {
      console.error("Failed to add logo to PDF:", error);
      // Add a placeholder or error text if logo fails, so we know it tried
      doc.setFontSize(8);
      doc.setTextColor(255, 0, 0);
      doc.text("Logo Error", pageWidth - 50, 160);
    }
  } else {
    console.warn('No logoUrl provided in companyDetails');
  }
  
  // Modern divider
  yPos = 225;
  doc.setDrawColor(...colors.light);
  doc.setLineWidth(0.3);
  doc.line(25, yPos, pageWidth - 25, yPos);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1.2);
  doc.line(25, yPos + 1, pageWidth - 25, yPos + 1);
  
  // PREPARED FOR section
  if (contactDetails) {
    yPos = 238;
    
    doc.setFillColor(...colors.light);
    doc.roundedRect(22, yPos - 4, pageWidth - 44, 40, 3, 3, 'F');
    
    doc.setTextColor(...colors.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PREPARED FOR:", 28, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.text);
    doc.text(contactDetails.organization_name?.toUpperCase() || '', 28, yPos);
    
    yPos += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.neutral);
    
    if (contactDetails.contact_person_name) {
      doc.text(`Attn: ${contactDetails.contact_person_name}`, 28, yPos);
      yPos += 6;
    }
    
    if (contactDetails.address_line1) {
      doc.text(contactDetails.address_line1, 28, yPos);
      yPos += 6;
    }
    
    if (contactDetails.phone) {
      doc.text(`Tel: ${contactDetails.phone}`, 28, yPos);
    }
  }
  
  // Date and Revision section
  yPos = contactDetails ? 305 : 243;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.neutral);
  const dateLabel = "Date:";
  const dateValue = options.date || format(new Date(), "dd MMMM yyyy");
  doc.text(dateLabel, 28, yPos);
  doc.text(dateValue, 28 + doc.getTextWidth(dateLabel) + 2, yPos);
  
  const revisionLabel = "Revision:";
  const revisionValue = options.revision;
  const revisionLabelX = pageWidth / 2 - 20;
  doc.text(revisionLabel, revisionLabelX, yPos);
  doc.text(revisionValue, revisionLabelX + doc.getTextWidth(revisionLabel) + 2, yPos);
}

/**
 * Generate cover page content for pdfmake
 * This is the preferred method for new implementations
 */
export async function generateCoverPageContent(
  options: CoverPageOptions,
  companyDetails: CompanyDetails,
  contactDetails?: any
): Promise<Content[]> {
  const content: Content[] = [];

  // Gradient accent bar (left side)
  content.push({
    canvas: [
      {
        type: 'rect',
        x: 0,
        y: 0,
        w: 35,
        h: PAGE_SIZES.A4.height,
        color: PDF_COLORS.primary,
      },
    ],
    absolutePosition: { x: 0, y: 0 },
  });

  // Main title
  content.push(spacer(50));
  content.push({
    text: options.title.toUpperCase(),
    fontSize: FONT_SIZES.h1,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [40, 0, 0, 0],
  });

  // Title underline
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 150,
        y1: 0,
        x2: 400,
        y2: 0,
        lineWidth: 1,
        lineColor: PDF_COLORS.secondary,
      },
    ],
    margin: [0, 5, 0, 20],
  });

  // Project name
  content.push({
    text: options.projectName,
    fontSize: FONT_SIZES.title + 2,
    bold: true,
    color: PDF_COLORS.text,
    alignment: 'center',
    margin: [40, 0, 0, 15],
  });

  // Subtitle
  if (options.subtitle) {
    content.push({
      text: options.subtitle,
      fontSize: FONT_SIZES.h3,
      color: PDF_COLORS.secondary,
      alignment: 'center',
      margin: [40, 0, 0, 30],
    });
  }

  // Company logo
  if (companyDetails.logoUrl) {
    try {
      const logoBase64 = await imageToBase64(companyDetails.logoUrl);
      content.push({
        image: logoBase64,
        width: 100,
        alignment: 'center',
        margin: [40, 20, 0, 20],
      });
    } catch (error) {
      console.error('Failed to load company logo:', error);
    }
  }

  content.push(spacer(20));

  // Prepared By section
  content.push({
    stack: [
      {
        text: 'PREPARED BY:',
        fontSize: FONT_SIZES.small,
        bold: true,
        color: PDF_COLORS.primary,
      },
      spacer(5),
      {
        text: companyDetails.companyName.toUpperCase(),
        fontSize: FONT_SIZES.body,
        bold: true,
        color: PDF_COLORS.text,
      },
      {
        text: '141 Witch Hazel Ave,',
        fontSize: FONT_SIZES.small,
        color: PDF_COLORS.textMuted,
      },
      {
        text: 'Highveld Techno Park, Building 1A',
        fontSize: FONT_SIZES.small,
        color: PDF_COLORS.textMuted,
      },
      {
        text: `Tel: ${companyDetails.contactPhone}`,
        fontSize: FONT_SIZES.small,
        color: PDF_COLORS.textMuted,
      },
      {
        text: `Contact: ${companyDetails.contactName}`,
        fontSize: FONT_SIZES.small,
        color: PDF_COLORS.textMuted,
      },
    ],
    margin: [60, 0, 0, 20],
  });

  // Divider
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 50,
        y1: 0,
        x2: PAGE_SIZES.A4.width - 80,
        y2: 0,
        lineWidth: 0.5,
        lineColor: PDF_COLORS.border,
      },
    ],
    margin: [0, 10, 0, 10],
  });

  // Prepared For section
  if (contactDetails?.organization_name || companyDetails.clientName) {
    const clientName = contactDetails?.organization_name || companyDetails.clientName;
    
    content.push({
      stack: [
        {
          text: 'PREPARED FOR:',
          fontSize: FONT_SIZES.small,
          bold: true,
          color: PDF_COLORS.primary,
        },
        spacer(5),
        {
          text: clientName?.toUpperCase() || '',
          fontSize: FONT_SIZES.body,
          bold: true,
          color: PDF_COLORS.text,
        },
        ...(contactDetails?.contact_person_name 
          ? [{ text: `Attn: ${contactDetails.contact_person_name}`, fontSize: FONT_SIZES.small, color: PDF_COLORS.textMuted }] 
          : []),
        ...(contactDetails?.address_line1 || companyDetails.clientAddressLine1 
          ? [{ text: contactDetails?.address_line1 || companyDetails.clientAddressLine1, fontSize: FONT_SIZES.small, color: PDF_COLORS.textMuted }] 
          : []),
        ...(contactDetails?.phone || companyDetails.clientPhone 
          ? [{ text: `Tel: ${contactDetails?.phone || companyDetails.clientPhone}`, fontSize: FONT_SIZES.small, color: PDF_COLORS.textMuted }] 
          : []),
      ],
      margin: [60, 0, 0, 30],
    });
  }

  // Date and revision
  const reportDate = options.date || format(new Date(), 'dd MMMM yyyy');
  
  content.push({
    columns: [
      {
        text: `Date: ${reportDate}`,
        fontSize: FONT_SIZES.small,
        color: PDF_COLORS.textMuted,
      },
      {
        text: `${options.revision || 'Rev. 1.0'}`,
        fontSize: FONT_SIZES.small,
        color: PDF_COLORS.textMuted,
        alignment: 'right',
      },
    ],
    margin: [60, 50, 40, 0],
  });

  // Page break after cover
  content.push({ text: '', pageBreak: 'after' });

  return content;
}
