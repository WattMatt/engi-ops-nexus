/**
 * Generate chart images for PDF from report data
 * Returns data URLs for charts
 */
export const generateChartImages = async (
  categories: any[],
  lineItems: any[]
): Promise<{
  distribution: string;
  variance: string;
}> => {
  // Return empty strings for now - charts will be added in future iteration
  return {
    distribution: "",
    variance: "",
  };
};
