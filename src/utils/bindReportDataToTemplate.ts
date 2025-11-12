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
  const inputs: any[] = [];

  // Fetch company details
  const companyQuery = await supabase
    .from("company_settings")
    .select("company_name, company_logo_url")
    .maybeSingle();
  const companyData = companyQuery.data;

  // Fetch report data based on category
  let reportData: any = null;
  let categories: CategoryData[] = [];
  let lineItems: LineItemData[] = [];
  let variations: VariationData[] = [];

  if (category === "cost_report") {
    // Fetch report
    const reportQuery = await supabase
      .from("cost_reports")
      .select("report_name, report_number")
      .eq("id", reportId)
      .maybeSingle();
    reportData = reportQuery.data;
    
    // Fetch categories
    const catsResult: any = await (supabase as any).from("cost_categories").select("category_name, total_amount").eq("report_id", reportId);
    categories = (catsResult.data || []) as CategoryData[];
    
    // Fetch line items
    const itemsResult: any = await (supabase as any).from("cost_line_items").select("description, quantity, rate, amount").eq("report_id", reportId);
    lineItems = (itemsResult.data || []) as LineItemData[];
    
    // Fetch variations
    const varsResult: any = await (supabase as any).from("cost_variations").select("amount, is_credit").eq("report_id", reportId);
    variations = (varsResult.data || []) as VariationData[];
  }

  // Calculate KPIs
  const totalValue = categories.reduce(
    (sum: number, cat: CategoryData) => sum + (cat.total_amount || 0),
    0
  );
  const categoryCount = categories.length;
  const lineItemCount = lineItems.length;
  const variationTotal = variations.reduce(
    (sum: number, v: VariationData) => sum + (v.is_credit ? -v.amount : v.amount),
    0
  );

  // Generate chart and table images
  const chartImages = await generateChartImages(categories, lineItems);
  const tableImages = await generateTableImages(categories, lineItems);

  // Process each page's schema
  for (const pageSchema of template.schemas) {
    const pageInput: Record<string, any> = {};

    for (const field of pageSchema) {
      const fieldName = field.name || "";

      // Map field names to actual data
      if (fieldName === "company_logo" && companyData?.company_logo_url) {
        pageInput[fieldName] = companyData.company_logo_url;
      } else if (fieldName === "company_name") {
        pageInput[fieldName] = companyData?.company_name || "";
      } else if (fieldName === "report_title") {
        pageInput[fieldName] = reportData?.report_name || "Cost Report";
      } else if (fieldName === "report_number") {
        pageInput[fieldName] = reportData?.report_number || "";
      } else if (fieldName === "report_date") {
        pageInput[fieldName] = new Date().toLocaleDateString();
      } else if (fieldName === "kpi_total_value") {
        pageInput[fieldName] = `R ${totalValue.toLocaleString("en-ZA", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      } else if (fieldName === "kpi_category_count") {
        pageInput[fieldName] = categoryCount.toString();
      } else if (fieldName === "kpi_line_item_count") {
        pageInput[fieldName] = lineItemCount.toString();
      } else if (fieldName === "kpi_variation_total") {
        pageInput[fieldName] = `R ${variationTotal.toLocaleString("en-ZA", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      } else if (fieldName === "distribution_chart") {
        pageInput[fieldName] = chartImages.distribution || "";
      } else if (fieldName === "variance_chart") {
        pageInput[fieldName] = chartImages.variance || "";
      } else if (fieldName === "category_table") {
        pageInput[fieldName] = tableImages.categories || "";
      } else if (fieldName === "line_items_table") {
        pageInput[fieldName] = tableImages.lineItems || "";
      } else if (fieldName.startsWith("category_") && fieldName.includes("_name")) {
        // Extract category index from field name
        const match = fieldName.match(/category_(\d+)_name/);
        if (match) {
          const index = parseInt(match[1]);
          pageInput[fieldName] = categories[index]?.category_name || "";
        }
      } else if (fieldName.startsWith("category_") && fieldName.includes("_total")) {
        const match = fieldName.match(/category_(\d+)_total/);
        if (match) {
          const index = parseInt(match[1]);
          const total = categories[index]?.total_amount || 0;
          pageInput[fieldName] = `R ${total.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        }
      } else {
        // Default empty value for unmatched fields
        pageInput[fieldName] = "";
      }
    }

    inputs.push(pageInput);
  }

  return inputs;
};
