import jsPDF from "jspdf";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface CoverPageOptions {
  title: string;
  projectName: string;
  subtitle: string;
  revision: string;
}

export interface CompanyDetails {
  companyName: string;
  logoUrl?: string;
  contactName: string;
  contactPhone: string;
}

/**
 * Fetches company settings and current user details for the cover page
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
  
  // Try to get employee details for more information
  const { data: employeeData } = await supabase
    .from("employees")
    .select("first_name, last_name, phone")
    .eq("user_id", currentUser?.id)
    .maybeSingle();

  const contactName = employeeData 
    ? `${employeeData.first_name} ${employeeData.last_name}`
    : currentUser?.email?.split("@")[0] || "Contact Person";
  
  const contactPhone = employeeData?.phone || "(012) 665 3487";

  return {
    companyName,
    logoUrl,
    contactName,
    contactPhone,
  };
}

/**
 * Generates a standardized cover page for all reports
 */
export async function generateCoverPage(
  doc: jsPDF,
  options: CoverPageOptions,
  companyDetails: CompanyDetails
): Promise<void> {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPos = 0;

  // Color definitions matching Word template
  const titleColor = [133, 163, 207]; // Light blue for titles
  const cyanColor = [0, 191, 255]; // Cyan for date/revision values
  
  // Add left vertical accent bar with gradient effect (light blue)
  const barWidth = 8;
  for (let i = 0; i < pageHeight; i += 5) {
    const blueShade = 220 - (i / pageHeight) * 40; // Gradient from light to darker
    doc.setFillColor(blueShade, blueShade + 15, 250);
    doc.rect(0, i, barWidth, 5, 'F');
  }
  
  // Main titles - CENTERED on page
  doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, pageWidth / 2, 65, { align: "center" });
  
  // Project name - larger heading
  yPos = 90;
  doc.setFontSize(22);
  doc.text(options.projectName, pageWidth / 2, yPos, { align: "center" });
  
  // Subtitle
  yPos += 30;
  doc.setFontSize(18);
  doc.text(options.subtitle, pageWidth / 2, yPos, { align: "center" });
  
  // First horizontal divider line
  yPos = 180;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.line(20, yPos, pageWidth - 20, yPos);
  
  // Company details section
  yPos = 192;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PREPARED BY:", 20, yPos);
  
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(companyDetails.companyName.toUpperCase(), 20, yPos);
  
  yPos += 6;
  doc.text("141 Which Hazel ave,", 20, yPos);
  
  yPos += 6;
  doc.text("Highveld Techno Park", 20, yPos);
  
  yPos += 6;
  doc.text("Building 1A", 20, yPos);
  
  yPos += 6;
  doc.text(`Tel: ${companyDetails.contactPhone}`, 20, yPos);
  
  yPos += 6;
  doc.text(`Contact: ${companyDetails.contactName}`, 20, yPos);
  
  // Add company logo to the right of company name line
  if (companyDetails.logoUrl) {
    try {
      const logoResponse = await fetch(companyDetails.logoUrl);
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
      
      // Position logo on the right side, aligned with company name
      const logoWidth = 30;
      const logoHeight = 22;
      const logoX = pageWidth - logoWidth - 25;
      const logoY = 198;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.error("Failed to add logo to PDF:", error);
    }
  }
  
  // Second horizontal divider line
  yPos = 240;
  doc.setLineWidth(1);
  doc.line(20, yPos, pageWidth - 20, yPos);
  
  // Date and Revision section
  yPos = 258;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("DATE:", 20, yPos);
  
  yPos += 12;
  doc.text("REVISION:", 20, yPos);
  
  // Values in cyan, right-aligned
  doc.setTextColor(cyanColor[0], cyanColor[1], cyanColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(), "EEEE, dd MMMM yyyy"), pageWidth - 20, 258, { align: "right" });
  doc.text(options.revision.replace("Rev.", "Rev "), pageWidth - 20, 270, { align: "right" });
  
  // Page number at bottom center
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text("1", pageWidth / 2, pageHeight - 15, { align: "center" });
}
