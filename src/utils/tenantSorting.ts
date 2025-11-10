/**
 * Natural sort comparison function for shop numbers
 * Handles formats like "1", "01", "Shop 1", "Shop 10A", "10B", etc.
 * 
 * Sorting order:
 * - Shop 1
 * - Shop 2
 * - Shop 10
 * - Shop 10A
 * - Shop 10B
 * - Shop 20
 * 
 * @param a - First shop number string
 * @param b - Second shop number string
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export const compareShopNumbers = (a: string, b: string): number => {
  // Extract numeric part from shop_number
  const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
  const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
  
  // If numbers are different, sort by number
  if (numA !== numB) {
    return numA - numB;
  }
  
  // If numbers are equal, sort by full string (for Shop 10A, 10B, etc.)
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Sort an array of tenants by shop number in natural order
 * 
 * @param tenants - Array of tenant objects with shop_number property
 * @returns Sorted array of tenants
 */
export const sortTenantsByShopNumber = <T extends { shop_number: string }>(tenants: T[]): T[] => {
  return [...tenants].sort((a, b) => compareShopNumbers(a.shop_number, b.shop_number));
};
