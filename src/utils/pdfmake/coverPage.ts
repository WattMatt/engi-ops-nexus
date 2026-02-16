/**
 * PDFMake Cover Page Generator
 * Creates professional cover pages for PDF reports
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { PDF_COLORS, FONT_SIZES } from './styles';
import { PAGE_SIZES, mmToPoints } from './config';
import { imageToBase64, formatDate, spacer, horizontalLine } from './helpers';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface CoverPageOptions {
  title: string;
  projectName: string;
  projectNumber?: string;
  subtitle?: string;
  revision?: string;
  date?: string | Date;
}

export interface CompanyDetails {
  companyName: string;
  logoUrl?: string;
  contactName: string;
  contactPhone: string;
  clientName?: string;
  clientLogoUrl?: string;
  clientAddressLine1?: string;
  clientAddressLine2?: string;
  clientPhone?: string;
}

export interface ContactDetails {
  organization_name?: string;
  contact_person_name?: string;
  address_line1?: string;
  address_line2?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

/**
 * Fetch company and user details for the cover page
 */
export async function fetchCompanyDetails(): Promise<CompanyDetails> {
  const { data: companySettings } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', currentUser?.id)
    .maybeSingle();

  const { data: employeeData } = await supabase
    .from('employees')
    .select('phone')
    .eq('user_id', currentUser?.id)
    .maybeSingle();

  return {
    companyName: companySettings?.company_name || 'Company Name',
    logoUrl: companySettings?.company_logo_url,
    contactName: profileData?.full_name || currentUser?.email?.split('@')[0] || 'Contact Person',
    contactPhone: employeeData?.phone || '(012) 665 3487',
    clientName: companySettings?.client_name,
    clientLogoUrl: companySettings?.client_logo_url,
    clientAddressLine1: companySettings?.client_address_line1,
    clientAddressLine2: companySettings?.client_address_line2,
    clientPhone: companySettings?.client_phone,
  };
}

/**
 * Generate cover page content
 */
export async function generateCoverPageContent(
  options: CoverPageOptions,
  companyDetails: CompanyDetails,
  contactDetails?: ContactDetails
): Promise<Content[]> {
  const pageWidth = PAGE_SIZES.A4.width;
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
        linearGradient: [PDF_COLORS.primary, PDF_COLORS.secondary],
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
    margin: [40, 0, 0, 0] as Margins,
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
    margin: [0, 5, 0, 20] as Margins,
  });

  // Project name
  content.push({
    text: options.projectName,
    fontSize: FONT_SIZES.title + 2,
    bold: true,
    color: PDF_COLORS.text,
    alignment: 'center',
    margin: [40, 0, 0, 15] as Margins,
  });

  // Subtitle
  if (options.subtitle) {
    content.push({
      text: options.subtitle,
      fontSize: FONT_SIZES.h3,
      color: PDF_COLORS.secondary,
      alignment: 'center',
      margin: [40, 0, 0, 30] as Margins,
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
        margin: [40, 20, 0, 20] as Margins,
      });
    } catch (error) {
      console.error('Failed to load company logo:', error);
    }
  }

  content.push(spacer(20));

  // Prepared By section with background card
  const preparedByY = 175;
  content.push({
    canvas: [
      {
        type: 'rect',
        x: 22,
        y: 0,
        w: PAGE_SIZES.A4.width - 44,
        h: 60, // Approximate height for content
        r: 3,
        color: '#f1f5f9', // Slate 50
        lineColor: '#e2e8f0', // Slate 200 border
        lineWidth: 0.5
      },
    ],
    absolutePosition: { x: 0, y: preparedByY - 10 },
  });

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
    margin: [60, 0, 0, 20] as Margins,
  });

  // Divider
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 50,
        y1: 0,
        x2: pageWidth - 80,
        y2: 0,
        lineWidth: 0.5,
        lineColor: PDF_COLORS.border,
      },
    ],
    margin: [0, 10, 0, 10] as Margins,
  });

  // Prepared For section (if contact details provided)
  if (contactDetails?.organization_name || companyDetails.clientName) {
    const clientName = contactDetails?.organization_name || companyDetails.clientName;
    const preparedForY = preparedByY + 70; // Approximation based on stack height

    content.push({
      canvas: [
        {
          type: 'rect',
          x: 22,
          y: 0,
          w: PAGE_SIZES.A4.width - 44,
          h: 50,
          r: 3,
          color: '#f1f5f9',
          lineColor: '#e2e8f0',
          lineWidth: 0.5
        },
      ],
      absolutePosition: { x: 0, y: preparedForY },
    });
    
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
      margin: [60, 20, 0, 30] as Margins, // Adjusted top margin to push down
    });
  }

  // Date and revision at bottom
  const reportDate = options.date 
    ? formatDate(options.date) 
    : format(new Date(), 'dd MMMM yyyy');
  
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
    margin: [60, 50, 40, 0] as Margins,
  });

  // Page break after cover
  content.push({ text: '', pageBreak: 'after' });

  return content;
}
