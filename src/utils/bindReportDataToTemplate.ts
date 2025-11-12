import { Template } from "@pdfme/common";
import { supabase } from "@/integrations/supabase/client";
import { generateChartImages } from "./generateChartImages";
import { generateTableImages } from "./generateTableImages";

interface CategoryData {
  category_name: string;
  total_amount: number;
}

interface LineItemData {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface VariationData {
  amount: number;
  is_credit: boolean;
}

/**
 * Binds actual report data to a template's field names
 * Returns inputs array for pdfme viewer/generator
 */
export const bindReportDataToTemplate = async (
  template: Template,
  reportId: string,
  projectId: string,
  category: "cost_report" | "cable_schedule" | "final_account"
): Promise<any[]> => {
  console.log("bindReportDataToTemplate called with:", { reportId, projectId, category });
  const inputs: any[] = [];

  try {
    // Fetch company details
    const companyQuery = await supabase
      .from("company_settings")
      .select("company_name, company_logo_url")
      .maybeSingle();
    const companyData = companyQuery.data;
    console.log("Fetched company data:", companyData);

    // Fetch project details
    const projectQuery = await supabase
      .from("projects")
      .select("name, client_name")
      .eq("id", projectId)
      .maybeSingle();
    const projectData = projectQuery.data;
    console.log("Fetched project data:", projectData);

    // Fetch report data based on category
    let reportData: any = null;
    let categories: any[] = [];
    let lineItems: any[] = [];
    let variations: any[] = [];

    if (category === "cost_report") {
      // Fetch report
      const reportQuery = await supabase
        .from("cost_reports")
        .select("report_name, report_number, created_at")
        .eq("id", reportId)
        .maybeSingle();
      reportData = reportQuery.data;
      console.log("Fetched report data:", reportData);
      
      // Fetch categories with their IDs
      const catsResult = await supabase
        .from("cost_categories")
        .select("id, code, description, original_budget, anticipated_final")
        .eq("cost_report_id", reportId)
        .order("display_order");
      categories = catsResult.data || [];
      console.log("Fetched categories:", categories.length);
      
      // Fetch line items - skip for now since we don't have category IDs properly linked
      // Will add in next iteration
      lineItems = [];
      console.log("Fetched line items:", lineItems.length);
      
      // Fetch variations
      const varsResult = await supabase
        .from("cost_variations")
        .select("code, description, amount, is_credit")
        .eq("cost_report_id", reportId);
      variations = varsResult.data || [];
      console.log("Fetched variations:", variations.length);
    }

  // Calculate totals
  const totalBudget = categories.reduce(
    (sum, cat) => sum + (cat.original_budget || 0),
    0
  );
  const totalActual = categories.reduce(
    (sum, cat) => sum + (cat.anticipated_final || 0),
    0
  );

  // Process each page's schema
  console.log("Processing template schemas, page count:", template.schemas.length);
  for (const pageSchema of template.schemas) {
    const pageInput: Record<string, any> = {};

    for (const [fieldName, field] of Object.entries(pageSchema)) {
      // Map field names to actual data
      if (fieldName === "date") {
        pageInput[fieldName] = reportData?.created_at 
          ? new Date(reportData.created_at).toLocaleDateString("en-ZA", {
              weekday: "long",
              year: "numeric", 
              month: "long",
              day: "numeric"
            })
          : new Date().toLocaleDateString("en-ZA", {
              weekday: "long",
              year: "numeric",
              month: "long", 
              day: "numeric"
            });
      } else if (fieldName === "client_name") {
        pageInput[fieldName] = projectData?.client_name || "";
      } else if (fieldName === "report_name") {
        pageInput[fieldName] = reportData?.report_name || "Cost Report";
      } else if (fieldName === "project_name") {
        pageInput[fieldName] = projectData?.name || "";
      } else if (fieldName === "report_number") {
        pageInput[fieldName] = `Report #${reportData?.report_number || ""}`;
      } else if (fieldName.startsWith("category_") && fieldName.includes("_name")) {
        const match = fieldName.match(/category_(\d+)_name/);
        if (match) {
          const index = parseInt(match[1]) - 1;
          pageInput[fieldName] = categories[index] 
            ? `${categories[index].code} - ${categories[index].description}`
            : "";
        }
      } else if (fieldName.startsWith("category_") && fieldName.includes("_budget")) {
        const match = fieldName.match(/category_(\d+)_budget/);
        if (match) {
          const index = parseInt(match[1]) - 1;
          const budget = categories[index]?.original_budget || 0;
          pageInput[fieldName] = `R ${budget.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        }
      } else if (fieldName.startsWith("category_") && fieldName.includes("_actual")) {
        const match = fieldName.match(/category_(\d+)_actual/);
        if (match) {
          const index = parseInt(match[1]) - 1;
          const actual = categories[index]?.anticipated_final || 0;
          pageInput[fieldName] = `R ${actual.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        }
      } else {
        pageInput[fieldName] = "";
      }
    }

    inputs.push(pageInput);
  }

  console.log("Successfully created inputs for all pages:", inputs.length);
  return inputs;
  } catch (error) {
    console.error("Error in bindReportDataToTemplate:", error);
    throw error;
  }
};
