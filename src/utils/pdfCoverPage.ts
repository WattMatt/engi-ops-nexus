/**
 * Generates a cover page for PDF exports.
 * 
 * Supports three modes:
 * 1. Word Template (.docx): Fills placeholders and converts to PDF via edge function
 * 2. PDF/Image Template: Loads existing file and overlays dynamic text
 * 3. Default Modern: Generates a default modern cover page with gradient accent
 * 
 * Word Template Placeholders:
 * - {{project_name}} - Project name
 * - {{client_name}} - Client/company name
 * - {{report_title}} - Type of report
 * - {{report_date}} - Current date
 * - {{revision}} - Report revision/version
 * - {{contact_name}} - Contact person name
 * - {{contact_phone}} - Contact phone number
 * - {{company_name}} - Company name
 * 
 * Usage:
 * ```typescript
 * const doc = new jsPDF();
 * const companyDetails = await fetchCompanyDetails();
 * await generateCoverPage(doc, {
 *   title: "Cost Report",
 *   projectName: "Main Building",
 *   subtitle: "Electrical Installation",
 *   revision: "Rev. 1.0"
 * }, companyDetails);
 * ```
 */

import jsPDF from "jspdf";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

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
 * Create placeholder data from report options and company details
 * 
 * IMPORTANT: Image placeholders (logos) are NOT supported via text replacement.
 * Your Word template must have actual logo images already embedded in the document.
 * Only text placeholders like {{project_name}}, {{date}}, etc. will be replaced.
 */
function createPlaceholderData(
  options: CoverPageOptions,
  companyDetails: CompanyDetails,
  contactDetails?: any
): Record<string, string> {
  // Use provided date or default to current date
  const reportDate = options.date || new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Use contact details if provided, otherwise fall back to company defaults
  const preparedForName = contactDetails?.organization_name || companyDetails.clientName;
  const preparedForAddress1 = contactDetails?.address_line1 || companyDetails.clientAddressLine1;
  const preparedForAddress2 = contactDetails?.address_line2 || companyDetails.clientAddressLine2;
  const preparedForPhone = contactDetails?.phone || companyDetails.clientPhone;
  const preparedForEmail = contactDetails?.email || '';
  const preparedForContact = contactDetails?.contact_person_name || '';

  return {
    project_name: options.projectName || 'Untitled Project',
    client_name: companyDetails.clientName || 'Client Name',
    report_title: options.title || 'Report',
    report_date: reportDate,
    date: reportDate, // Also send 'date' for templates that use {{date}}
    revision: options.revision || 'Rev. 1.0',
    contact_name: companyDetails.contactName || '',
    contact_phone: companyDetails.contactPhone || '',
    company_name: companyDetails.companyName || '',
    subtitle: options.subtitle || '',
    // Client/recipient information for "Prepared For" section (multiple naming conventions for compatibility)
    prepared_for_name: preparedForName,
    prepared_for_company: preparedForName, // Alternative naming
    prepared_for_address1: preparedForAddress1,
    prepared_for_address: preparedForAddress1, // Alternative naming
    prepared_for_address2: preparedForAddress2,
    prepared_for_phone: preparedForPhone,
    prepared_for_tel: preparedForPhone, // Alternative naming
    prepared_for_email: preparedForEmail,
    prepared_for_contact: preparedForContact,
  };
  // NOTE: We do NOT include logo URLs here because docxtemplater cannot
  // insert images from URLs without additional paid modules.
  // Logos must be pre-embedded as actual images in the Word template.
}

/**
 * Convert Word template to PDF with filled placeholders
 */
async function convertWordTemplateToPDF(
  templateUrl: string,
  placeholderData: Record<string, string>,
  imagePlaceholders?: Record<string, string>
): Promise<string> {
  console.log('Converting Word template to PDF with placeholders:', placeholderData);
  if (imagePlaceholders) {
    console.log('Image placeholders:', imagePlaceholders);
  }
  
  const { data, error } = await supabase.functions.invoke('convert-word-to-pdf', {
    body: {
      templateUrl,
      placeholderData,
      imagePlaceholders
    }
  });

  if (error) {
    throw new Error(`Word to PDF conversion failed: ${error.message}`);
  }

  if (!data?.pdfUrl) {
    throw new Error('No PDF URL returned from conversion');
  }

  console.log('Word template converted successfully:', data.pdfUrl);
  return data.pdfUrl;
}

/**
 * Add overlay text on template-based cover pages
 */
function addOverlayText(
  doc: jsPDF,
  options: CoverPageOptions,
  companyDetails: CompanyDetails,
  contactDetails?: any
): void {
  const pageWidth = doc.internal.pageSize.width;
  
  const colors = {
    primary: [30, 58, 138] as [number, number, number],
    secondary: [59, 130, 246] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    text: [15, 23, 42] as [number, number, number]
  };
  
  doc.setTextColor(...colors.primary);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, pageWidth / 2, 70, { align: "center" });
  
  doc.setFontSize(26);
  doc.setTextColor(...colors.text);
  doc.text(options.projectName, pageWidth / 2, 95, { align: "center" });
  
  doc.setFontSize(16);
  doc.setTextColor(...colors.secondary);
  doc.text(options.subtitle, pageWidth / 2, 127, { align: "center" });
  
  // Date and revision
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.white);
  doc.text(format(new Date(), "EEEE, dd MMMM yyyy"), 30, 273);
  doc.text(options.revision.replace("Rev.", "Rev "), pageWidth / 2 + 10, 273);
}

/**
 * Generate default modern cover page (fallback)
 */
async function generateDefaultCoverPage(
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
  
  // PREPARED FOR section (if contact is selected)
  if (contactDetails) {
    yPos = 145;
    
    // Light background card for "Prepared For"
    doc.setFillColor(...colors.light);
    doc.roundedRect(22, 141, pageWidth - 44, 40, 3, 3, 'F');
    
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
    
    if (contactDetails.address_line2) {
      doc.text(contactDetails.address_line2, 28, yPos);
      yPos += 6;
    }
    
    if (contactDetails.phone) {
      doc.text(`Tel: ${contactDetails.phone}`, 28, yPos);
    }
    
    // Add contact logo if available
    if (contactDetails.logo_url) {
      try {
        const contactLogoResponse = await fetch(contactDetails.logo_url);
        const contactLogoBlob = await contactLogoResponse.blob();
        const contactLogoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(contactLogoBlob);
        });
        
        // Position contact logo on the right side
        const contactLogoWidth = 35;
        const contactLogoHeight = 26;
        const contactLogoX = pageWidth - contactLogoWidth - 28;
        const contactLogoY = 151;
        
        doc.addImage(contactLogoDataUrl, 'PNG', contactLogoX, contactLogoY, contactLogoWidth, contactLogoHeight);
      } catch (error) {
        console.error("Failed to add contact logo to PDF:", error);
      }
    }
  }
  
  // Modern divider with shadow effect
  yPos = contactDetails ? 195 : 185;
  doc.setDrawColor(...colors.light);
  doc.setLineWidth(0.3);
  doc.line(25, yPos, pageWidth - 25, yPos);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1.2);
  doc.line(25, yPos + 1, pageWidth - 25, yPos + 1);
  
  // Company details section with modern card-like appearance
  yPos = contactDetails ? 208 : 198;
  
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
  doc.text("141 Which Hazel ave,", 28, yPos);
  
  yPos += 6;
  doc.text("Highveld Techno Park, Building 1A", 28, yPos);
  
  yPos += 6;
  doc.text(`Tel: ${companyDetails.contactPhone}`, 28, yPos);
  
  yPos += 6;
  doc.text(`Contact: ${companyDetails.contactName}`, 28, yPos);
  
  // Add company logo with clean positioning
  if (companyDetails.logoUrl) {
    try {
      const logoResponse = await fetch(companyDetails.logoUrl);
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
      
      // Position logo on the right side with proper spacing
      const logoWidth = 35;
      const logoHeight = 26;
      const logoX = pageWidth - logoWidth - 28;
      const logoY = contactDetails ? 215 : 205;
      
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.error("Failed to add logo to PDF:", error);
    }
  }
  
  // Modern divider
  yPos = contactDetails ? 257 : 247;
  doc.setDrawColor(...colors.light);
  doc.setLineWidth(0.3);
  doc.line(25, yPos, pageWidth - 25, yPos);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1.2);
  doc.line(25, yPos + 1, pageWidth - 25, yPos + 1);
  
  // Date and Revision section - simple text labels
  yPos = contactDetails ? 275 : 265;
  
  // Date label and value
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.neutral);
  const dateLabel = "Date:";
  const dateValue = options.date || format(new Date(), "dd MMMM yyyy");
  doc.text(dateLabel, 28, yPos);
  doc.text(dateValue, 28 + doc.getTextWidth(dateLabel) + 2, yPos);
  
  // Revision label and value
  const revisionLabel = "Revision:";
  const revisionValue = options.revision;
  const revisionLabelX = pageWidth / 2 - 20;
  doc.text(revisionLabel, revisionLabelX, yPos);
  doc.text(revisionValue, revisionLabelX + doc.getTextWidth(revisionLabel) + 2, yPos);
  
  // Page number - simple text
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.neutral);
  doc.text("1", pageWidth / 2, pageHeight - 10, { align: "center" });
}

/**
 * Main function to generate a cover page.
 * Handles Word templates, PDF templates, image templates, and default generation.
 */
export async function generateCoverPage(
  doc: jsPDF,
  options: CoverPageOptions,
  companyDetails: CompanyDetails,
  contactId?: string,
  skipTemplate: boolean = false
): Promise<void> {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Fetch contact information if contactId is provided
  let contactDetails = null;
  if (contactId) {
    const { data, error } = await supabase
      .from("project_contacts")
      .select("*")
      .eq("id", contactId)
      .single();
    
    if (!error && data) {
      contactDetails = data;
      console.log("📞 Using project contact for 'Prepared For':", contactDetails);
    }
  }
  
  // Skip template lookup if skipTemplate flag is true
  if (skipTemplate) {
    console.log("⚡ Skipping template lookup, using default code-generated cover page");
    await generateDefaultCoverPage(doc, options, companyDetails, contactDetails);
    return;
  }
  
  console.log("Fetching default cover page template...");
  
  // First, try the dedicated cover_page_templates table
  let { data: defaultTemplate } = await supabase
    .from("cover_page_templates" as any)
    .select("*")
    .eq("is_default", true)
    .maybeSingle();
  
  // If no template in cover_page_templates, check document_templates
  if (!defaultTemplate) {
    console.log("No template in cover_page_templates, checking document_templates...");
    
    let { data: docTemplate } = await supabase
      .from("document_templates" as any)
      .select("*")
      .eq('is_default_cover', true)
      .maybeSingle();
    
    if (!docTemplate) {
      const { data: fallbackTemplate } = await supabase
        .from("document_templates" as any)
        .select("*")
        .or('template_type.eq.cover_page,template_type.eq.custom')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      docTemplate = fallbackTemplate;
    }
    
    if (docTemplate && typeof docTemplate === 'object' && !Array.isArray(docTemplate) && 'name' in docTemplate) {
      defaultTemplate = {
        file_path: (docTemplate as any).file_url,
        file_name: (docTemplate as any).file_name,
        name: (docTemplate as any).name,
        is_url: true,
      } as any;
    }
  }

  // If a template exists, process it
  if (defaultTemplate) {
    try {
      const template = defaultTemplate as any;
      console.log("🎨 Loading cover template:", {
        name: template.name,
        file_name: template.file_name,
        file_path: template.file_path,
        is_url: template.is_url
      });
      
      let templateUrl: string;
      
      if (template.is_url || template.file_path?.startsWith('http')) {
        templateUrl = template.file_path;
        console.log("📍 Using direct URL:", templateUrl);
      } else {
        const { data } = supabase.storage
          .from("cover-page-templates")
          .getPublicUrl(template.file_path);
        templateUrl = data.publicUrl;
        console.log("📍 Generated public URL:", templateUrl);
      }
      
      if (templateUrl) {
        const fileName = template.file_name?.toLowerCase() || '';
        const isWordDoc = fileName.endsWith('.docx') || fileName.endsWith('.doc');
        const isPdf = fileName.endsWith('.pdf');
        const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                       fileName.endsWith('.png') || fileName.endsWith('.webp');
        
        console.log("📄 File detection:", {
          fileName,
          isWordDoc,
          isPdf,
          isImage
        });
        
        if (isWordDoc) {
          // Word template: Fill placeholders and convert to PDF
          console.log('✏️ Detected Word template, filling placeholders...');
          const placeholderData = createPlaceholderData(options, companyDetails, contactDetails);
          console.log('📝 Placeholder data:', placeholderData);
          
          // Prepare image placeholders
          const imagePlaceholders: Record<string, string> = {};
          if (companyDetails.clientLogoUrl) {
            imagePlaceholders['client_image'] = companyDetails.clientLogoUrl;
            console.log('📷 Adding client logo:', companyDetails.clientLogoUrl);
          }
          
          const convertedPdfUrl = await convertWordTemplateToPDF(templateUrl, placeholderData, imagePlaceholders);
          console.log('✅ Word template converted to PDF:', convertedPdfUrl);
          
          // Load the converted PDF and render it as a canvas
          const response = await fetch(convertedPdfUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch converted PDF: ${response.statusText}`);
          }
          const blob = await response.blob();
          console.log('📦 Converted PDF blob size:', blob.size, 'bytes');
          
          // Use PDF.js to render the PDF to a canvas
          const arrayBuffer = await blob.arrayBuffer();
          const { getDocument } = await import('pdfjs-dist');
          const pdfDoc = await getDocument({ data: arrayBuffer }).promise;
          const page = await pdfDoc.getPage(1);
          
          // Scale to A4 size at high quality
          const viewport = page.getViewport({ scale: 3 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Could not get canvas context');
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          }).promise;
          
          // Convert canvas to image and add to PDF
          const imageData = canvas.toDataURL('image/jpeg', 0.95);
          doc.addImage(imageData, "JPEG", 0, 0, pageWidth, pageHeight);
          console.log('🎉 Word template converted and loaded successfully');
          return;
          
        } else if (isPdf || isImage) {
          // PDF or image template: Load directly
          console.log(`Detected ${isPdf ? 'PDF' : 'image'} template, loading directly...`);
          const response = await fetch(templateUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          const imageType = isPdf ? "PDF" : "JPEG";
          doc.addImage(dataUrl, imageType, 0, 0, pageWidth, pageHeight);
          
          // Add overlay text on PDF/image templates
          addOverlayText(doc, options, companyDetails, contactDetails);
          console.log(`${isPdf ? 'PDF' : 'Image'} template loaded successfully`);
          return;
          
        } else {
          console.error(`Unsupported template format: ${fileName}`);
          throw new Error(`Template must be Word, PDF, or image format. Found: ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Error loading custom template, falling back to default:', error);
    }
  }

  // Fallback to default modern cover page
  await generateDefaultCoverPage(doc, options, companyDetails, contactDetails);
}
