/**
 * Load Profile Charts - Container for all chart visualizations
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyDemandCurve } from './DailyDemandCurve';
import { CategoryBreakdownChart } from './CategoryBreakdownChart';
import { HistoricalTrendsChart } from './HistoricalTrendsChart';
import type { LoadCategorySummary, LoadProfileReading, MeterShopLinkage } from './useLoadProfile';

interface LoadProfileChartsProps {
  categories: LoadCategorySummary[];
  readings: LoadProfileReading[];
  linkages: MeterShopLinkage[];
}

export function LoadProfileCharts({ categories, readings, linkages }: LoadProfileChartsProps) {
  // Transform linkages into category data if no explicit categories
  const categoryData = categories.length > 0 
    ? categories 
    : transformLinkagesToCategories(linkages);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown - Primary chart */}
        <CategoryBreakdownChart categories={categoryData} />
        
        {/* Daily Demand Curve */}
        <DailyDemandCurve readings={readings} />
      </div>

      {/* Historical Trends - Full width */}
      <HistoricalTrendsChart readings={readings} />
    </div>
  );
}

// Helper function to transform linkages into category summaries
function transformLinkagesToCategories(linkages: MeterShopLinkage[]): LoadCategorySummary[] {
  const categoryMap = new Map<string, {
    total_connected_load_kva: number;
    max_demand_kva: number;
    shop_count: number;
  }>();

  linkages.forEach(linkage => {
    const category = linkage.shop_category || 'Uncategorized';
    const existing = categoryMap.get(category) || {
      total_connected_load_kva: 0,
      max_demand_kva: 0,
      shop_count: 0,
    };

    categoryMap.set(category, {
      total_connected_load_kva: existing.total_connected_load_kva + (linkage.connected_load_kva || 0),
      max_demand_kva: existing.max_demand_kva + (linkage.max_demand_kva || 0),
      shop_count: existing.shop_count + 1,
    });
  });

  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
  ];

  return Array.from(categoryMap.entries()).map(([name, data], index) => ({
    id: name,
    profile_id: '',
    category_name: name,
    category_code: name.substring(0, 3).toUpperCase(),
    total_area_sqm: 0,
    total_connected_load_kva: data.total_connected_load_kva,
    max_demand_kva: data.max_demand_kva,
    va_per_sqm: 0,
    shop_count: data.shop_count,
    diversity_factor: 0.8,
    color_code: colors[index % colors.length],
    display_order: index,
  }));
}
