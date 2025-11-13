export interface PlaceholderInfo {
  key: string;
  placeholder: string;
  description: string;
  category: string;
}

export const TEMPLATE_PLACEHOLDERS: PlaceholderInfo[] = [
  // Project Information
  { key: 'project_name', placeholder: '{project_name}', description: 'Project name', category: 'Project Information' },
  { key: 'report_title', placeholder: '{report_title}', description: 'Report title', category: 'Project Information' },
  { key: 'report_date', placeholder: '{report_date}', description: 'Report date', category: 'Project Information' },
  { key: 'date', placeholder: '{date}', description: 'Current date', category: 'Project Information' },
  { key: 'revision', placeholder: '{revision}', description: 'Revision number', category: 'Project Information' },
  { key: 'subtitle', placeholder: '{subtitle}', description: 'Report subtitle', category: 'Project Information' },
  
  // Company Information (Prepared By)
  { key: 'company_name', placeholder: '{company_name}', description: 'Your company name', category: 'Prepared By' },
  { key: 'contact_name', placeholder: '{contact_name}', description: 'Contact person name', category: 'Prepared By' },
  { key: 'contact_phone', placeholder: '{contact_phone}', description: 'Contact phone', category: 'Prepared By' },
  
  // Client Information (Prepared For)
  { key: 'prepared_for_company', placeholder: '{prepared_for_company}', description: 'Client organization name', category: 'Prepared For' },
  { key: 'prepared_for_contact', placeholder: '{prepared_for_contact}', description: 'Client contact person', category: 'Prepared For' },
  { key: 'prepared_for_address', placeholder: '{prepared_for_address}', description: 'Client address line 1', category: 'Prepared For' },
  { key: 'prepared_for_address2', placeholder: '{prepared_for_address2}', description: 'Client address line 2', category: 'Prepared For' },
  { key: 'prepared_for_tel', placeholder: '{prepared_for_tel}', description: 'Client phone number', category: 'Prepared For' },
  { key: 'prepared_for_email', placeholder: '{prepared_for_email}', description: 'Client email', category: 'Prepared For' },
  { key: 'prepared_for_name', placeholder: '{prepared_for_name}', description: 'Client name (legacy)', category: 'Prepared For' },
];

export function getPlaceholdersByCategory(): Record<string, PlaceholderInfo[]> {
  return TEMPLATE_PLACEHOLDERS.reduce((acc, placeholder) => {
    if (!acc[placeholder.category]) {
      acc[placeholder.category] = [];
    }
    acc[placeholder.category].push(placeholder);
    return acc;
  }, {} as Record<string, PlaceholderInfo[]>);
}
