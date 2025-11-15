export interface PlaceholderInfo {
  key: string;
  placeholder: string;
  description: string;
  category: string;
}

export type ReportTemplateType = 
  | 'cost_report'
  | 'cable_schedule'
  | 'bulk_services'
  | 'final_account'
  | 'specification'
  | 'generator_report'
  | 'project_outline'
  | 'electrical_budget'
  | 'cover_page';

export const REPORT_TEMPLATE_TYPES: { value: ReportTemplateType; label: string }[] = [
  { value: 'cover_page', label: 'Cover Page (Universal)' },
  { value: 'cost_report', label: 'Cost Report' },
  { value: 'cable_schedule', label: 'Cable Schedule' },
  { value: 'bulk_services', label: 'Bulk Services' },
  { value: 'final_account', label: 'Final Account' },
  { value: 'specification', label: 'Specification' },
  { value: 'generator_report', label: 'Generator Report' },
  { value: 'project_outline', label: 'Project Outline' },
  { value: 'electrical_budget', label: 'Electrical Budget' },
];

// Common placeholders used across all report types
const COMMON_PLACEHOLDERS: PlaceholderInfo[] = [
  { key: 'project_name', placeholder: '{project_name}', description: 'Project name', category: 'Project Information' },
  { key: 'report_title', placeholder: '{report_title}', description: 'Report title', category: 'Project Information' },
  { key: 'report_date', placeholder: '{report_date}', description: 'Report date', category: 'Project Information' },
  { key: 'date', placeholder: '{date}', description: 'Current date', category: 'Project Information' },
  { key: 'revision', placeholder: '{revision}', description: 'Revision number', category: 'Project Information' },
  { key: 'company_name', placeholder: '{company_name}', description: 'Your company name', category: 'Prepared By' },
  { key: 'contact_name', placeholder: '{contact_name}', description: 'Contact person name', category: 'Prepared By' },
  { key: 'contact_phone', placeholder: '{contact_phone}', description: 'Contact phone', category: 'Prepared By' },
  { key: 'prepared_for_company', placeholder: '{prepared_for_company}', description: 'Client organization name', category: 'Prepared For' },
  { key: 'prepared_for_contact', placeholder: '{prepared_for_contact}', description: 'Client contact person', category: 'Prepared For' },
  { key: 'prepared_for_address', placeholder: '{prepared_for_address}', description: 'Client address line 1', category: 'Prepared For' },
  { key: 'prepared_for_address2', placeholder: '{prepared_for_address2}', description: 'Client address line 2', category: 'Prepared For' },
  { key: 'prepared_for_tel', placeholder: '{prepared_for_tel}', description: 'Client phone number', category: 'Prepared For' },
  { key: 'prepared_for_email', placeholder: '{prepared_for_email}', description: 'Client email', category: 'Prepared For' },
  { key: 'company_logo', placeholder: 'company_logo', description: 'Your company logo (image alt text)', category: 'Logos' },
  { key: 'client_logo', placeholder: 'client_logo', description: 'Client logo (image alt text)', category: 'Logos' },
];

// Cost Report specific placeholders
const COST_REPORT_PLACEHOLDERS: PlaceholderInfo[] = [
  ...COMMON_PLACEHOLDERS,
  { key: 'report_number', placeholder: '{report_number}', description: 'Cost report number', category: 'Report Details' },
  { key: 'project_number', placeholder: '{project_number}', description: 'Project reference number', category: 'Report Details' },
  { key: 'electrical_contractor', placeholder: '{electrical_contractor}', description: 'Electrical contractor name', category: 'Contractors' },
  { key: 'cctv_contractor', placeholder: '{cctv_contractor}', description: 'CCTV contractor name', category: 'Contractors' },
  { key: 'earthing_contractor', placeholder: '{earthing_contractor}', description: 'Earthing contractor name', category: 'Contractors' },
  { key: 'standby_plants_contractor', placeholder: '{standby_plants_contractor}', description: 'Standby plants contractor', category: 'Contractors' },
  { key: 'practical_completion_date', placeholder: '{practical_completion_date}', description: 'Practical completion date', category: 'Dates' },
  { key: 'site_handover_date', placeholder: '{site_handover_date}', description: 'Site handover date', category: 'Dates' },
  { key: 'total_original_budget', placeholder: '{total_original_budget}', description: 'Total original budget', category: 'Financials' },
  { key: 'total_variations', placeholder: '{total_variations}', description: 'Total variations amount', category: 'Financials' },
  { key: 'total_anticipated_final', placeholder: '{total_anticipated_final}', description: 'Total anticipated final cost', category: 'Financials' },
];

// Cable Schedule specific placeholders
const CABLE_SCHEDULE_PLACEHOLDERS: PlaceholderInfo[] = [
  ...COMMON_PLACEHOLDERS,
  { key: 'schedule_number', placeholder: '{schedule_number}', description: 'Cable schedule number', category: 'Schedule Details' },
  { key: 'schedule_name', placeholder: '{schedule_name}', description: 'Cable schedule name', category: 'Schedule Details' },
  { key: 'layout_name', placeholder: '{layout_name}', description: 'Floor plan layout name', category: 'Schedule Details' },
  { key: 'total_cables', placeholder: '{total_cables}', description: 'Total number of cables', category: 'Cable Summary' },
  { key: 'total_cable_length', placeholder: '{total_cable_length}', description: 'Total cable length (m)', category: 'Cable Summary' },
  { key: 'total_supply_cost', placeholder: '{total_supply_cost}', description: 'Total cable supply cost', category: 'Cost Summary' },
  { key: 'total_install_cost', placeholder: '{total_install_cost}', description: 'Total installation cost', category: 'Cost Summary' },
  { key: 'total_cost', placeholder: '{total_cost}', description: 'Total cable schedule cost', category: 'Cost Summary' },
];

// Bulk Services specific placeholders
const BULK_SERVICES_PLACEHOLDERS: PlaceholderInfo[] = [
  ...COMMON_PLACEHOLDERS,
  { key: 'document_number', placeholder: '{document_number}', description: 'Document number', category: 'Document Details' },
  { key: 'climatic_zone', placeholder: '{climatic_zone}', description: 'Climatic zone', category: 'Technical Details' },
  { key: 'climatic_zone_city', placeholder: '{climatic_zone_city}', description: 'Climatic zone city', category: 'Technical Details' },
  { key: 'electrical_standard', placeholder: '{electrical_standard}', description: 'Electrical standard (e.g., SANS 10400-XA)', category: 'Technical Details' },
  { key: 'supply_authority', placeholder: '{supply_authority}', description: 'Supply authority name', category: 'Technical Details' },
  { key: 'connection_size', placeholder: '{connection_size}', description: 'Connection size', category: 'Technical Details' },
  { key: 'project_area', placeholder: '{project_area}', description: 'Project area (m²)', category: 'Load Calculations' },
  { key: 'va_per_sqm', placeholder: '{va_per_sqm}', description: 'VA per square meter', category: 'Load Calculations' },
  { key: 'total_connected_load', placeholder: '{total_connected_load}', description: 'Total connected load (VA)', category: 'Load Calculations' },
  { key: 'diversity_factor', placeholder: '{diversity_factor}', description: 'Diversity factor', category: 'Load Calculations' },
  { key: 'maximum_demand', placeholder: '{maximum_demand}', description: 'Maximum demand (kVA)', category: 'Load Calculations' },
];

// Final Account specific placeholders
const FINAL_ACCOUNT_PLACEHOLDERS: PlaceholderInfo[] = [
  ...COMMON_PLACEHOLDERS,
  { key: 'account_number', placeholder: '{account_number}', description: 'Final account number', category: 'Account Details' },
  { key: 'contract_sum', placeholder: '{contract_sum}', description: 'Original contract sum', category: 'Financials' },
  { key: 'total_variations', placeholder: '{total_variations}', description: 'Total variations', category: 'Financials' },
  { key: 'adjusted_contract_sum', placeholder: '{adjusted_contract_sum}', description: 'Adjusted contract sum', category: 'Financials' },
  { key: 'total_certified', placeholder: '{total_certified}', description: 'Total certified to date', category: 'Financials' },
  { key: 'retention_amount', placeholder: '{retention_amount}', description: 'Retention amount', category: 'Financials' },
  { key: 'final_payment', placeholder: '{final_payment}', description: 'Final payment amount', category: 'Financials' },
];

// Specification specific placeholders
const SPECIFICATION_PLACEHOLDERS: PlaceholderInfo[] = [
  ...COMMON_PLACEHOLDERS,
  { key: 'spec_number', placeholder: '{spec_number}', description: 'Specification number', category: 'Specification Details' },
  { key: 'spec_title', placeholder: '{spec_title}', description: 'Specification title', category: 'Specification Details' },
  { key: 'discipline', placeholder: '{discipline}', description: 'Engineering discipline', category: 'Specification Details' },
  { key: 'total_sections', placeholder: '{total_sections}', description: 'Total number of sections', category: 'Document Stats' },
];

// Generator Report specific placeholders
const GENERATOR_REPORT_PLACEHOLDERS: PlaceholderInfo[] = [
  ...COMMON_PLACEHOLDERS,
  { key: 'total_tenants', placeholder: '{total_tenants}', description: 'Total number of tenants', category: 'Generator Sizing' },
  { key: 'total_load_kw', placeholder: '{total_load_kw}', description: 'Total load (kW)', category: 'Generator Sizing' },
  { key: 'total_load_kva', placeholder: '{total_load_kva}', description: 'Total load (kVA)', category: 'Generator Sizing' },
  { key: 'recommended_generator_size', placeholder: '{recommended_generator_size}', description: 'Recommended generator size', category: 'Generator Sizing' },
  { key: 'diversity_factor', placeholder: '{diversity_factor}', description: 'Applied diversity factor', category: 'Generator Sizing' },
  { key: 'fuel_consumption', placeholder: '{fuel_consumption}', description: 'Estimated fuel consumption', category: 'Operating Costs' },
  { key: 'running_hours', placeholder: '{running_hours}', description: 'Estimated running hours', category: 'Operating Costs' },
];

// Project Outline specific placeholders
const PROJECT_OUTLINE_PLACEHOLDERS: PlaceholderInfo[] = [
  ...COMMON_PLACEHOLDERS,
  { key: 'outline_number', placeholder: '{outline_number}', description: 'Outline reference number', category: 'Outline Details' },
  { key: 'total_sections', placeholder: '{total_sections}', description: 'Total number of sections', category: 'Document Stats' },
  { key: 'scope_summary', placeholder: '{scope_summary}', description: 'Project scope summary', category: 'Overview' },
];

// Electrical Budget specific placeholders
const ELECTRICAL_BUDGET_PLACEHOLDERS: PlaceholderInfo[] = [
  ...COMMON_PLACEHOLDERS,
  { key: 'budget_number', placeholder: '{budget_number}', description: 'Budget number', category: 'Budget Details' },
  { key: 'budget_date', placeholder: '{budget_date}', description: 'Budget date', category: 'Budget Details' },
  { key: 'total_sections', placeholder: '{total_sections}', description: 'Total number of sections', category: 'Budget Summary' },
  { key: 'total_budget', placeholder: '{total_budget}', description: 'Total budget amount', category: 'Budget Summary' },
];

// Export template schemas
export const REPORT_TEMPLATE_SCHEMAS: Record<ReportTemplateType, PlaceholderInfo[]> = {
  cover_page: COMMON_PLACEHOLDERS,
  cost_report: COST_REPORT_PLACEHOLDERS,
  cable_schedule: CABLE_SCHEDULE_PLACEHOLDERS,
  bulk_services: BULK_SERVICES_PLACEHOLDERS,
  final_account: FINAL_ACCOUNT_PLACEHOLDERS,
  specification: SPECIFICATION_PLACEHOLDERS,
  generator_report: GENERATOR_REPORT_PLACEHOLDERS,
  project_outline: PROJECT_OUTLINE_PLACEHOLDERS,
  electrical_budget: ELECTRICAL_BUDGET_PLACEHOLDERS,
};

export function getPlaceholdersByCategory(templateType: ReportTemplateType): Record<string, PlaceholderInfo[]> {
  const placeholders = REPORT_TEMPLATE_SCHEMAS[templateType] || COMMON_PLACEHOLDERS;
  
  return placeholders.reduce((acc, placeholder) => {
    if (!acc[placeholder.category]) {
      acc[placeholder.category] = [];
    }
    acc[placeholder.category].push(placeholder);
    return acc;
  }, {} as Record<string, PlaceholderInfo[]>);
}

export function getTemplatePlaceholders(templateType: ReportTemplateType): PlaceholderInfo[] {
  return REPORT_TEMPLATE_SCHEMAS[templateType] || COMMON_PLACEHOLDERS;
}
