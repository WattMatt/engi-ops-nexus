import { 
  FileText, 
  DollarSign, 
  Zap, 
  Fuel, 
  Users,
  Cable
} from "lucide-react";

export type ReportTypeId = 
  | 'tenant_tracker'
  | 'cost_report'
  | 'cable_schedule'
  | 'generator_report'
  | 'portal_summary';

export interface ReportTypeConfig {
  id: ReportTypeId;
  name: string;
  description: string;
  icon: typeof FileText;
  iconColor: string;
  bgColor: string;
  edgeFunction: string;
  /** Storage-first: fetch pre-generated PDF from this bucket instead of calling EF */
  storageBucket?: string;
  storageReportTable?: string;
  requiresDocument?: boolean;
  documentType?: string;
  documentLabel?: string;
  isEmailOnly?: boolean;
  contentOptions: {
    key: string;
    label: string;
    defaultValue: boolean;
  }[];
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: 'tenant_tracker',
    name: 'Tenant Tracker',
    description: 'Track tenant completion status and progress metrics',
    icon: Users,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    edgeFunction: 'generate-tenant-tracker-pdf',
    contentOptions: [
      { key: 'include_cover_page', label: 'Include Cover Page', defaultValue: true },
      { key: 'include_kpi_page', label: 'Include KPI Dashboard', defaultValue: true },
      { key: 'include_tenant_schedule', label: 'Include Tenant Schedule', defaultValue: true },
    ],
  },
  {
    id: 'cost_report',
    name: 'Cost Report',
    description: 'Budget breakdown, categories, and variations analysis',
    icon: DollarSign,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    edgeFunction: 'generate-cost-report-pdf',
    requiresDocument: true,
    documentType: 'cost_reports',
    documentLabel: 'Select Cost Report',
    contentOptions: [
      { key: 'include_cover_page', label: 'Include Cover Page', defaultValue: true },
      { key: 'include_executive_summary', label: 'Include Executive Summary', defaultValue: true },
      { key: 'include_category_breakdown', label: 'Include Category Breakdown', defaultValue: true },
      { key: 'include_variations', label: 'Include Variations', defaultValue: true },
    ],
  },
  {
    id: 'cable_schedule',
    name: 'Cable Schedule',
    description: 'Technical cable specifications and voltage analysis',
    icon: Cable,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    edgeFunction: 'generate-cable-schedule-pdf',
    requiresDocument: true,
    documentType: 'cable_schedules',
    documentLabel: 'Select Cable Schedule',
    contentOptions: [
      { key: 'include_cover_page', label: 'Include Cover Page', defaultValue: true },
      { key: 'include_summary', label: 'Include Summary Metrics', defaultValue: true },
      { key: 'include_voltage_analysis', label: 'Include Voltage Analysis', defaultValue: true },
      { key: 'include_optimizations', label: 'Include Recommendations', defaultValue: false },
    ],
  },
  {
    id: 'generator_report',
    name: 'Generator Report',
    description: 'Financial evaluation and capital recovery analysis',
    icon: Fuel,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    edgeFunction: 'generate-generator-report-pdf',
    contentOptions: [
      { key: 'include_cover_page', label: 'Include Cover Page', defaultValue: true },
      { key: 'include_executive_summary', label: 'Include Executive Summary', defaultValue: true },
      { key: 'include_tenant_schedule', label: 'Include Tenant Loading', defaultValue: true },
      { key: 'include_capital_recovery', label: 'Include Capital Recovery', defaultValue: true },
      { key: 'include_running_costs', label: 'Include Running Costs', defaultValue: true },
    ],
  },
  {
    id: 'portal_summary',
    name: 'Portal Summary',
    description: 'Contractor portal activity summary with change tracking',
    icon: Users,
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    edgeFunction: 'generate-portal-summary-email',
    isEmailOnly: true,
    contentOptions: [
      { key: 'include_tenant_progress', label: 'Include Tenant Progress', defaultValue: true },
      { key: 'include_drawing_register', label: 'Include Drawing Register', defaultValue: true },
      { key: 'include_procurement_status', label: 'Include Procurement Status', defaultValue: true },
      { key: 'include_cable_status', label: 'Include Cable Status', defaultValue: true },
      { key: 'include_inspections', label: 'Include Inspections', defaultValue: true },
      { key: 'include_rfis', label: 'Include RFIs', defaultValue: true },
    ],
  },
];

export function getReportTypeConfig(id: ReportTypeId): ReportTypeConfig | undefined {
  return REPORT_TYPES.find(r => r.id === id);
}

export function getDefaultReportConfig(id: ReportTypeId): Record<string, boolean> {
  const config = getReportTypeConfig(id);
  if (!config) return {};
  
  return config.contentOptions.reduce((acc, opt) => {
    acc[opt.key] = opt.defaultValue;
    return acc;
  }, {} as Record<string, boolean>);
}
