import mammoth from 'mammoth';

export interface PlaceholderInfo {
  placeholder: string;
  description: string;
  example?: string;
}

/**
 * Detects placeholders in a DOCX template file
 */
export async function detectPlaceholders(file: File): Promise<{
  textPlaceholders: string[];
  imagePlaceholders: string[];
  loopPlaceholders: string[];
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    // Find all {placeholder} patterns including loop syntax
    const placeholderRegex = /\{([a-zA-Z_#\/][a-zA-Z0-9_]*)\}/g;
    const matches = [...text.matchAll(placeholderRegex)];
    const allPlaceholders = [...new Set(matches.map(m => m[0]))];

    // Categorize placeholders
    const imagePlaceholders = allPlaceholders.filter(p => 
      p.toLowerCase().includes('image') || 
      p.toLowerCase().includes('logo') ||
      p.toLowerCase().includes('photo') ||
      p.toLowerCase().includes('picture')
    );

    const loopPlaceholders = allPlaceholders.filter(p => 
      p.startsWith('{#') || p.startsWith('{/')
    );

    const textPlaceholders = allPlaceholders.filter(p => 
      !imagePlaceholders.includes(p) && !loopPlaceholders.includes(p)
    );

    return {
      textPlaceholders,
      imagePlaceholders,
      loopPlaceholders,
    };
  } catch (error) {
    console.error('Error detecting placeholders:', error);
    return {
      textPlaceholders: [],
      imagePlaceholders: [],
      loopPlaceholders: [],
    };
  }
}

/**
 * Get common placeholder suggestions based on template type
 */
export function getPlaceholderSuggestions(templateType: string): PlaceholderInfo[] {
  const commonPlaceholders: PlaceholderInfo[] = [
    { placeholder: '{project_name}', description: 'Project name', example: 'PRINCE CONSORT CENTRE' },
    { placeholder: '{project_number}', description: 'Project reference number', example: 'P2024-001' },
    { placeholder: '{client_name}', description: 'Client organization', example: 'Royal Properties Ltd' },
    { placeholder: '{report_date}', description: 'Report date', example: '2024-03-15' },
    { placeholder: '{prepared_by}', description: 'Preparer name', example: 'John Smith' },
    { placeholder: '{current_date}', description: 'Current date', example: '2024-03-15' },
  ];

  if (templateType === 'cost_report') {
    return [
      ...commonPlaceholders,
      { placeholder: '{report_number}', description: 'Report sequence number', example: '001' },
      { placeholder: '{total_budget}', description: 'Total budget amount', example: 'R 5,000,000' },
      { placeholder: '{electrical_contractor}', description: 'Electrical contractor name', example: 'ABC Electrical' },
    ];
  }

  if (templateType === 'cover_page') {
    return [
      ...commonPlaceholders,
      { placeholder: '{document_title}', description: 'Document title', example: 'PROJECT DOCUMENTATION' },
      { placeholder: '{document_subtitle}', description: 'Document subtitle', example: 'Electrical Report' },
      { placeholder: '{company_logo}', description: 'Company logo image', example: 'logo.png' },
      { placeholder: '{revision}', description: 'Revision number', example: 'Rev A' },
    ];
  }

  return commonPlaceholders;
}
