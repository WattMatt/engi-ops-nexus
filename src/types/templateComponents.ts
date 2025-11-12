export interface CapturedComponent {
  id: string;
  elementId: string;
  componentType: 'kpi-cards' | 'distribution-chart' | 'variance-chart' | 'budget-comparison-chart' | 'category-table';
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  imageUrl?: string; // URL to stored image in Supabase Storage
}

export interface ComponentLibraryItem {
  id: string;
  name: string;
  description: string;
  elementId: string;
  componentType: CapturedComponent['componentType'];
  defaultSize: {
    width: number;
    height: number;
  };
  icon: string;
}

export const AVAILABLE_COMPONENTS: ComponentLibraryItem[] = [
  {
    id: 'kpi-cards',
    name: 'KPI Summary Cards',
    description: 'Grid of 5 key performance indicators',
    elementId: 'cost-report-kpi-cards',
    componentType: 'kpi-cards',
    defaultSize: { width: 180, height: 40 },
    icon: 'LayoutGrid',
  },
  {
    id: 'distribution-chart',
    name: 'Distribution Chart',
    description: 'Pie chart showing cost breakdown',
    elementId: 'cost-report-distribution-chart',
    componentType: 'distribution-chart',
    defaultSize: { width: 90, height: 90 },
    icon: 'PieChart',
  },
  {
    id: 'variance-chart',
    name: 'Variance Chart',
    description: 'Bar chart showing savings vs extras',
    elementId: 'cost-report-variance-chart',
    componentType: 'variance-chart',
    defaultSize: { width: 90, height: 90 },
    icon: 'BarChart3',
  },
  {
    id: 'budget-comparison-chart',
    name: 'Budget Comparison',
    description: 'Grouped bar chart comparing budgets',
    elementId: 'cost-report-budget-comparison-chart',
    componentType: 'budget-comparison-chart',
    defaultSize: { width: 90, height: 90 },
    icon: 'TrendingUp',
  },
  {
    id: 'category-table',
    name: 'Category Summary Table',
    description: 'Detailed breakdown by category',
    elementId: 'cost-report-category-table',
    componentType: 'category-table',
    defaultSize: { width: 180, height: 100 },
    icon: 'Table',
  },
];
