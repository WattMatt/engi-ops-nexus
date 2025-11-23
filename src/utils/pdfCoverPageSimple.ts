import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";

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
 * Generates a simple, reliable cover page directly with jsPDF
 */
export async function generateCoverPage(
  doc: jsPDF,
  reportData: CoverPageData
): Promise<void> {
  console.log("Generating simple cover page");
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
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
      console.log('Using project contact for Prepared For');
    }
  }
  
  // Add client logo if available
  if (projectContact?.logo_url) {
    try {
      const logoResponse = await fetch(projectContact.logo_url);
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
      
      doc.addImage(logoBase64, 'PNG', pageWidth - 60, 20, 40, 40);
    } catch (error) {
      console.warn('Could not load client logo:', error);
    }
  }
  
  // Add company logo if available
  if (companyDetails && 'company_logo_url' in companyDetails && typeof companyDetails.company_logo_url === 'string') {
    try {
      const logoResponse = await fetch(companyDetails.company_logo_url as string);
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
      
      doc.addImage(logoBase64, 'PNG', 20, 20, 40, 40);
    } catch (error) {
      console.warn('Could not load company logo:', error);
    }
  }
  
  // Title section
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(reportData.report_title || 'Cost Report', pageWidth / 2, 100, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(reportData.project_name, pageWidth / 2, 120, { align: 'center' });
  
  if (reportData.client_name) {
    doc.setFontSize(12);
    doc.text(reportData.client_name, pageWidth / 2, 135, { align: 'center' });
  }
  
  // Prepared for section
  let yPos = pageHeight - 120;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR:', 20, yPos);
  
  doc.setFont('helvetica', 'normal');
  yPos += 6;
  
  if (projectContact) {
    if (projectContact.organization_name) {
      doc.text(projectContact.organization_name, 20, yPos);
      yPos += 5;
    }
    if (projectContact.contact_person_name) {
      doc.text(projectContact.contact_person_name, 20, yPos);
      yPos += 5;
    }
    if (projectContact.address_line1) {
      doc.text(projectContact.address_line1, 20, yPos);
      yPos += 5;
    }
    if (projectContact.address_line2) {
      doc.text(projectContact.address_line2, 20, yPos);
      yPos += 5;
    }
    if (projectContact.phone) {
      doc.text(`Tel: ${projectContact.phone}`, 20, yPos);
      yPos += 5;
    }
    if (projectContact.email) {
      doc.text(`Email: ${projectContact.email}`, 20, yPos);
    }
  }
  
  // Prepared by section
  yPos = pageHeight - 120;
  
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED BY:', pageWidth - 100, yPos);
  
  doc.setFont('helvetica', 'normal');
  yPos += 6;
  
  if (companyDetails && 'company_name' in companyDetails && typeof companyDetails.company_name === 'string') {
    const lines = doc.splitTextToSize(companyDetails.company_name as string, 80);
    doc.text(lines, pageWidth - 100, yPos);
  }
  
  // Date and Revision at bottom
  doc.setFontSize(10);
  doc.text(`Date: ${reportData.report_date}`, 20, pageHeight - 30);
  doc.text(`Revision: ${reportData.revision}`, 20, pageHeight - 20);
  
  console.log('Cover page created successfully');
}
