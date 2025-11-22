import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface CostReportTemplateData {
  placeholderData: Record<string, any>;
  imagePlaceholders?: Record<string, string>;
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

  // Fetch categories with line items for tables
  const { data: categories } = await supabase
    .from("cost_categories")
    .select("*, cost_line_items(*)")
    .eq("cost_report_id", reportId)
    .order("display_order");

  const { data: variations } = await supabase
    .from("cost_variations")
    .select(`
      *,
      tenants (
        shop_name,
        shop_number
      )
    `)
    .eq("cost_report_id", reportId)
    .order("display_order");

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

  // Calculate total for percentage calculations
  const totalPreviousReport = (categories || []).reduce(
    (sum, cat) => sum + (cat.previous_report || 0),
    0
  );

  // Prepare categories array for table loops
  const categoriesData = (categories || []).map(cat => ({
    code: cat.code,
    description: cat.description,
    original_budget: cat.original_budget?.toFixed(2) || "0.00",
    previous_report: cat.previous_report?.toFixed(2) || "0.00",
    anticipated_final: cat.anticipated_final?.toFixed(2) || "0.00",
    percentage_of_total: totalOriginalBudget > 0 
      ? ((cat.original_budget || 0) / totalOriginalBudget * 100).toFixed(1) + '%'
      : "0.0%",
    current_variance: ((cat.anticipated_final || 0) - (cat.previous_report || 0)).toFixed(2),
    original_variance: ((cat.anticipated_final || 0) - (cat.original_budget || 0)).toFixed(2),
    line_items: (cat.cost_line_items || []).map((item: any) => ({
      code: item.code,
      description: item.description,
      original_budget: item.original_budget?.toFixed(2) || "0.00",
      anticipated_final: item.anticipated_final?.toFixed(2) || "0.00"
    }))
  }));

  // Prepare variations array for table loops
  const variationsData = (variations || []).map((v: any) => ({
    code: v.code,
    description: v.description,
    tenant_name: v.tenants ? `${v.tenants.shop_number} - ${v.tenants.shop_name}` : "",
    is_credit: v.is_credit,
    type: v.is_credit ? "Credit" : "Extra",
    amount: Math.abs(v.amount || 0).toFixed(2)
  }));

  // Prepare placeholder data
  const placeholderData: Record<string, any> = {
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
    total_previous_report: totalPreviousReport.toFixed(2),
    total_variations: totalVariations.toFixed(2),
    total_anticipated_final: totalAnticipatedFinal.toFixed(2),
    total_current_variance: (totalAnticipatedFinal - totalPreviousReport).toFixed(2),
    total_original_variance: (totalAnticipatedFinal - totalOriginalBudget).toFixed(2),

    // Notes
    notes: report.notes || "",

    // Table Data Arrays (for docxtemplater loops)
    categories: categoriesData,
    variations: variationsData,
  };

  // Prepare image placeholders separately - support multiple placeholder naming conventions
  const imagePlaceholders: Record<string, string> = {};
  
  if (companySettings?.company_logo_url) {
    imagePlaceholders.company_logo = companySettings.company_logo_url;
    imagePlaceholders.company_image = companySettings.company_logo_url;
  }
  
  // Use company logo as fallback for client logo if client logo is not set
  if (companySettings?.client_logo_url) {
    imagePlaceholders.client_logo = companySettings.client_logo_url;
    imagePlaceholders.client_image = companySettings.client_logo_url;
  } else if (companySettings?.company_logo_url) {
    imagePlaceholders.client_logo = companySettings.company_logo_url;
    imagePlaceholders.client_image = companySettings.company_logo_url;
  }

  return { placeholderData, imagePlaceholders };
}
