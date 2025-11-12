import jsPDF from "jspdf";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/**
 * STANDARD PDF COVER PAGE UTILITY
 * ================================
 * This utility provides a standardized cover page format for ALL PDF exports in the application.
 * 
 * MANDATORY USAGE:
 * All new PDF export features MUST use this utility to maintain consistent branding across all reports.
 * 
 * USAGE EXAMPLE:
 * ```typescript
 * import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
 * 
 * const handleExport = async () => {
 *   const doc = new jsPDF("portrait"); // or "landscape"
 *   
 *   // Fetch company details once
 *   const companyDetails = await fetchCompanyDetails();
 *   
 *   // Generate standardized cover page
 *   await generateCoverPage(doc, {
 *     title: "Your Report Type",           // e.g., "Financial Evaluation", "Cable Schedule"
 *     projectName: project.name,            // The main project/report name
 *     subtitle: "Your Subtitle",            // e.g., "Centre Standby Plant", "Schedule #123"
 *     revision: "Rev 1",                    // Revision information
 *   }, companyDetails);
 *   
 *   // Add your report content starting from page 2
 *   doc.addPage();
 *   // ... your report content here
 * };
 * ```
 * 
 * COVER PAGE FEATURES:
 * - Gradient blue accent bar on the left
 * - Centered titles in light blue
 * - Company name from company_settings table
 * - Contact person from logged-in user's employee record
 * - Company logo (if configured)
 * - Current date and revision in cyan
 * - Page number "1" at bottom
 * 
 * @module pdfCoverPage
 */

export interface CoverPageOptions {
  /** Main title at top of page (e.g., "Financial Evaluation", "Cable Schedule") */
  title: string;
  /** Project or report name (e.g., "Segonyana Mall", "Generator Report") */
  projectName: string;
  /** Subtitle below project name (e.g., "Centre Standby Plant", "Schedule #123") */
  subtitle: string;
  /** Revision information (e.g., "Rev 0", "Rev 1") */
  revision: string;
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
}

/**
 * Fetches company settings and current user details for the cover page.
 * This function retrieves:
 * - Company name and logo from company_settings table
 * - Logged-in user's details from employees table
 * 
 * @returns {Promise<CompanyDetails>} Company and contact information
 * 
 * @example
 * const companyDetails = await fetchCompanyDetails();
 * console.log(companyDetails.companyName); // "WATSON MATTHEUS..."
 * console.log(companyDetails.contactName); // "John Doe"
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
  };
}

/**
 * Generates a standardized cover page for ALL PDF reports.
 * 
 * This is the REQUIRED method for creating cover pages in all PDF exports.
 * The cover page includes:
 * - Gradient blue accent bar on left edge
 * - Centered titles in company branding colors
 * - Company details and logo
 * - Date and revision information
 * - Page number
 * 
 * IMPORTANT: Always call this on page 1, then add your content starting from page 2.
 * 
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {CoverPageOptions} options - Cover page content options
 * @param {CompanyDetails} companyDetails - Company and contact information from fetchCompanyDetails()
 * 
 * @example
 * // For a generator report
 * await generateCoverPage(doc, {
 *   title: "Financial Evaluation",
 *   projectName: "Segonyana Mall",
 *   subtitle: "Centre Standby Plant",
 *   revision: "Rev 3",
 * }, companyDetails);
 * 
 * @example
 * // For a cable schedule
 * await generateCoverPage(doc, {
 *   title: "Cable Schedule",
 *   projectName: schedule.schedule_name,
 *   subtitle: `Schedule #${schedule.schedule_number}`,
 *   revision: schedule.revision,
 * }, companyDetails);
 * 
 * @example
 * // For a cost report
 * await generateCoverPage(doc, {
 *   title: "Cost Report",
 *   projectName: report.project_name,
 *   subtitle: `Report #${report.report_number}`,
 *   revision: `Report ${report.report_number}`,
 * }, companyDetails);
 */
export async function generateCoverPage(
  doc: jsPDF,
  options: CoverPageOptions,
  companyDetails: CompanyDetails
): Promise<void> {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Check if there's a default cover page template
  const { data: defaultTemplate } = await supabase
    .from("cover_page_templates")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  // If a template exists, use it as the background
  if (defaultTemplate) {
    try {
      const { data } = supabase.storage
        .from("cover-page-templates")
        .getPublicUrl(defaultTemplate.file_path);

      if (data.publicUrl) {
        const response = await fetch(data.publicUrl);
        const blob = await response.blob();
        
        // Convert to base64
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        // Determine image type
        const imageType = defaultTemplate.file_type?.includes("pdf") ? "PDF" : "JPEG";
        
        // Add template as background (full page)
        doc.addImage(dataUrl, imageType, 0, 0, pageWidth, pageHeight);
      }
    } catch (error) {
      console.error("Failed to load cover page template:", error);
      // Fall through to generate default cover page
    }
  }

  // If no template or template failed, generate modern professional cover page
  if (!defaultTemplate) {
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
    
    // Modern divider with shadow effect
    yPos = 185;
    doc.setDrawColor(...colors.light);
    doc.setLineWidth(0.3);
    doc.line(25, yPos, pageWidth - 25, yPos);
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(1.2);
    doc.line(25, yPos + 1, pageWidth - 25, yPos + 1);
    
    // Company details section with modern card-like appearance
    yPos = 198;
    
    // Light background card
    doc.setFillColor(...colors.light);
    doc.roundedRect(22, 194, pageWidth - 44, 50, 3, 3, 'F');
    
    doc.setTextColor(...colors.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PREPARED BY", 28, yPos);
    
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
        const logoY = 205;
        
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.error("Failed to add logo to PDF:", error);
      }
    }
    
    // Modern divider
    yPos = 237;
    doc.setDrawColor(...colors.light);
    doc.setLineWidth(0.3);
    doc.line(25, yPos, pageWidth - 25, yPos);
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(1.2);
    doc.line(25, yPos + 1, pageWidth - 25, yPos + 1);
    
    // Date and Revision section - simple text labels
    yPos = 255;
    
    // Date label and value
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.neutral);
    const dateLabel = "Date:";
    const dateValue = format(new Date(), "dd MMMM yyyy");
    doc.text(dateLabel, 28, yPos);
    doc.text(dateValue, 28 + doc.getTextWidth(dateLabel) + 2, yPos);
    
    // Page number label and value  
    const pageLabel = "Page No:";
    const pageValue = "1";
    const pageLabelX = pageWidth - 60;
    doc.text(pageLabel, pageLabelX, yPos);
    doc.text(pageValue, pageLabelX + doc.getTextWidth(pageLabel) + 2, yPos);
    
    // Page number - simple text
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.neutral);
    doc.text("1", pageWidth / 2, pageHeight - 10, { align: "center" });
  }
  
  // Overlay text on template (if template exists)
  if (defaultTemplate) {
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
    
    // Date and revision in cards
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.white);
    doc.text(format(new Date(), "EEEE, dd MMMM yyyy"), 30, 273);
    doc.text(options.revision.replace("Rev.", "Rev "), pageWidth / 2 + 10, 273);
  }
}
