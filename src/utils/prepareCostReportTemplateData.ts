import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface CostReportTemplateData {
  [key: string]: string | number | undefined;
}

export async function prepareCostReportTemplateData(
  reportId: string
): Promise<CostReportTemplateData> {
  // Fetch the cost report
  const { data: report, error: reportError } = await supabase
    .from("cost_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (reportError) throw reportError;
  if (!report) throw new Error("Cost report not found");

  // Fetch company settings
  const { data: companySettings } = await supabase
    .from("company_settings")
    .select("*")
    .single();

  // Fetch project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", report.project_id)
    .single();

  // Fetch project contacts for "Prepared For"
  const { data: projectContacts } = await supabase
    .from("project_contacts")
    .select("*")
    .eq("project_id", report.project_id)
    .eq("contact_type", "client")
    .limit(1)
    .maybeSingle();

  // Fetch categories and line items for financial totals
  const { data: categories } = await supabase
    .from("cost_categories")
    .select("*")
    .eq("cost_report_id", reportId);

  const { data: lineItems } = await supabase
    .from("cost_line_items")
    .select("*")
    .in("category_id", categories?.map(c => c.id) || []);

  const { data: variations } = await supabase
    .from("cost_variations")
    .select("*")
    .eq("cost_report_id", reportId);

  // Calculate totals
  const totalOriginalBudget = (categories || []).reduce(
    (sum, cat) => sum + (cat.original_budget || 0),
    0
  );
  
  const totalVariations = (variations || []).reduce(
    (sum, variation) => {
      const amount = variation.amount || 0;
      return variation.is_credit ? sum - amount : sum + amount;
    },
    0
  );

  const totalAnticipatedFinal = (categories || []).reduce(
    (sum, cat) => sum + (cat.anticipated_final || 0),
    0
  );

  // Format dates
  const formatDate = (date: string | null) => {
    if (!date) return "TBC";
    return format(new Date(date), "dd MMMM yyyy");
  };

  // Prepare placeholder data
  const templateData: CostReportTemplateData = {
    // Project Information
    project_name: report.project_name || project?.name || "",
    project_number: report.project_number || project?.project_number || "",
    client_name: report.client_name || "",
    report_number: report.report_number?.toString() || "",
    report_date: formatDate(report.report_date),
    date: format(new Date(), "dd MMMM yyyy"),
    revision: "", // Not currently stored, could be added

    // Contractors
    electrical_contractor: report.electrical_contractor || "TBC",
    cctv_contractor: report.cctv_contractor || "TBC",
    earthing_contractor: report.earthing_contractor || "TBC",
    standby_plants_contractor: report.standby_plants_contractor || "TBC",

    // Dates
    practical_completion_date: formatDate(report.practical_completion_date),
    site_handover_date: formatDate(report.site_handover_date),

    // Company Information (Prepared By)
    company_name: companySettings?.company_name || "",
    company_tagline: companySettings?.company_tagline || "",
    contact_name: "", // Could be fetched from user profile
    contact_phone: "", // Could be fetched from company settings

    // Client Contact (Prepared For)
    prepared_for_name: projectContacts?.organization_name || report.client_name || "",
    prepared_for_contact: projectContacts?.contact_person_name || "",
    prepared_for_address1: projectContacts?.address_line1 || "",
    prepared_for_address2: projectContacts?.address_line2 || "",
    prepared_for_phone: projectContacts?.phone || "",
    prepared_for_email: projectContacts?.email || "",

    // Financial Totals
    total_original_budget: totalOriginalBudget.toFixed(2),
    total_variations: totalVariations.toFixed(2),
    total_anticipated_final: totalAnticipatedFinal.toFixed(2),
    total_variance: (totalAnticipatedFinal - totalOriginalBudget).toFixed(2),

    // Notes
    notes: report.notes || "",
  };

  return templateData;
}
