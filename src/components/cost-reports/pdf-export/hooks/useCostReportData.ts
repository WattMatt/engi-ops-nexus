import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";

// 10 second timeout for each query
const QUERY_TIMEOUT_MS = 10000;

export interface CostReportPDFData {
  company: any;
  categoriesData: any[];
  variationsData: any[];
  details: any[];
  categoryTotals: any[];
  grandTotals: any;
}

export interface DataFetchProgress {
  step: string;
  percentage: number;
  isComplete: boolean;
  error: string | null;
}

/**
 * Wraps a Supabase query with a timeout to prevent hanging
 */
async function withQueryTimeout<T>(
  queryBuilder: PromiseLike<{ data: T | null; error: any }>,
  fallbackData: T,
  label: string
): Promise<T> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn(`[CostReportData] ${label} query timed out after ${QUERY_TIMEOUT_MS}ms, using fallback`);
      resolve(fallbackData);
    }, QUERY_TIMEOUT_MS);
    
    Promise.resolve(queryBuilder)
      .then((result) => {
        clearTimeout(timeout);
        if (result.error) {
          console.warn(`[CostReportData] ${label} query error:`, result.error);
        }
        resolve(result.data ?? fallbackData);
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error(`[CostReportData] ${label} query failed:`, error);
        resolve(fallbackData);
      });
  });
}

/**
 * Hook to fetch all cost report data with progress tracking and timeouts
 * Follows the Roadmap Review pattern: data is pre-fetched before PDF generation
 */
export function useCostReportData() {
  const [progress, setProgress] = useState<DataFetchProgress>({
    step: '',
    percentage: 0,
    isComplete: false,
    error: null,
  });
  const [isFetching, setIsFetching] = useState(false);

  const fetchReportData = useCallback(async (reportId: string): Promise<CostReportPDFData | null> => {
    setIsFetching(true);
    setProgress({ step: 'Starting data fetch...', percentage: 0, isComplete: false, error: null });
    
    const startTime = Date.now();
    console.log('[CostReportData] Starting data fetch for report:', reportId);

    try {
      // Step 1: Company settings (10%)
      setProgress({ step: 'Loading company settings...', percentage: 10, isComplete: false, error: null });
      const company = await withQueryTimeout(
        supabase.from("company_settings").select("*").limit(1).maybeSingle(),
        null,
        "Company settings"
      );
      console.log('[CostReportData] Company settings loaded:', !!company);

      // Step 2: Categories and line items (40%)
      setProgress({ step: 'Fetching categories...', percentage: 30, isComplete: false, error: null });
      const categoriesData = await withQueryTimeout(
        supabase.from("cost_categories")
          .select("*, cost_line_items(*)")
          .eq("cost_report_id", reportId)
          .order("display_order"),
        [] as any[],
        "Categories"
      );
      console.log('[CostReportData] Categories loaded:', categoriesData.length);

      // Step 3: Variations (70%)
      setProgress({ step: 'Fetching variations...', percentage: 50, isComplete: false, error: null });
      const variationsData = await withQueryTimeout(
        supabase.from("cost_variations")
          .select(`*, tenants(shop_name, shop_number), variation_line_items(*)`)
          .eq("cost_report_id", reportId)
          .order("display_order"),
        [] as any[],
        "Variations"
      );
      console.log('[CostReportData] Variations loaded:', variationsData.length);

      // Step 4: Details (85%)
      setProgress({ step: 'Fetching report details...', percentage: 70, isComplete: false, error: null });
      const details = await withQueryTimeout(
        supabase.from("cost_report_details")
          .select("*")
          .eq("cost_report_id", reportId)
          .order("display_order"),
        [] as any[],
        "Details"
      );
      console.log('[CostReportData] Details loaded:', details.length);

      // Step 5: Calculate totals (95%)
      setProgress({ step: 'Calculating totals...', percentage: 85, isComplete: false, error: null });
      
      // Sort variations by numeric code
      const sortedVariations = (variationsData || []).sort((a: any, b: any) => {
        const aMatch = a.code?.match(/\d+/);
        const bMatch = b.code?.match(/\d+/);
        const aNum = aMatch ? parseInt(aMatch[0], 10) : 0;
        const bNum = bMatch ? parseInt(bMatch[0], 10) : 0;
        return aNum - bNum;
      });

      // Extract all line items
      const allLineItems = (categoriesData || []).flatMap(cat => cat.cost_line_items || []);
      
      // Calculate totals
      const categoryTotals = calculateCategoryTotals(categoriesData || [], allLineItems, sortedVariations);
      const grandTotals = calculateGrandTotals(categoryTotals);

      const elapsed = Date.now() - startTime;
      console.log(`[CostReportData] All data fetched in ${elapsed}ms`);

      // Step 6: Complete (100%)
      setProgress({ step: 'Data ready', percentage: 100, isComplete: true, error: null });

      return {
        company,
        categoriesData: categoriesData || [],
        variationsData: sortedVariations,
        details: details || [],
        categoryTotals,
        grandTotals,
      };
    } catch (error: any) {
      console.error('[CostReportData] Fatal error during data fetch:', error);
      setProgress({ 
        step: 'Error fetching data', 
        percentage: 0, 
        isComplete: false, 
        error: error.message || 'Unknown error' 
      });
      return null;
    } finally {
      setIsFetching(false);
    }
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      step: '',
      percentage: 0,
      isComplete: false,
      error: null,
    });
    setIsFetching(false);
  }, []);

  return {
    fetchReportData,
    progress,
    isFetching,
    resetProgress,
  };
}
