/**
 * Generate table images for PDF from report data
 * Returns data URLs for tables
 */
export const generateTableImages = async (
  categories: any[],
  lineItems: any[]
): Promise<{
  categories: string;
  lineItems: string;
}> => {
  // Return empty strings for now - tables will be added in future iteration
  return {
    categories: "",
    lineItems: "",
  };
};

