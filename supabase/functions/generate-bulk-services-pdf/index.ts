import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildPDFShiftPayload, generateStandardCoverPage, getStandardCoverPageCSS } from "../_shared/pdfStandards.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkServicesDocument {
  id: string;
  project_id: string;
  document_number: string;
  revision: string;
  document_date: string;
  created_at: string;
  notes?: string | null;
  building_calculation_type?: string | null;
  project_area?: number | null;
  climatic_zone?: string | null;
  climatic_zone_city?: string | null;
  va_per_sqm?: number | null;
  diversity_factor?: number | null;
  future_expansion_factor?: number | null;
  maximum_demand?: number | null;
  total_connected_load?: number | null;
  primary_voltage?: string | null;
  connection_size?: string | null;
  supply_authority?: string | null;
  tariff_structure?: string | null;
}

interface BulkServicesSection {
  id: string;
  document_id: string;
  section_number: string;
  section_title: string;
  content?: string | null;
  sort_order: number;
}

interface RequestBody {
  document: BulkServicesDocument;
  sections: BulkServicesSection[];
  projectName?: string;
  revision: string;
  companyDetails?: {
    companyName?: string;
    companyLogoUrl?: string;
  };
}

const METHOD_NAMES: Record<string, string> = {
  'sans_204': 'SANS 204 - Commercial/Retail',
  'sans_10142': 'SANS 10142-1 - General Buildings',
  'residential': 'Residential ADMD Method',
};

const COLORS = {
  primary: '#1e3a5f',
  secondary: '#4a90a4',
  text: '#333333',
  textLight: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
};

// Climatic zone colors and data
const ZONE_COLORS: Record<string, string> = {
  '1': '#3b82f6', // Blue - Cold Interior
  '2': '#fbbf24', // Yellow - Temperate Interior
  '3': '#f97316', // Orange - Hot Interior
  '4': '#60a5fa', // Light Blue - Temperate Coastal
  '5': '#22c55e', // Green - Sub-tropical Coastal
  '6': '#eab308', // Yellow/Gold - Arid Interior
};

const ZONE_DATA: Record<string, { name: string; temp: string; description: string; examples: string }> = {
  '1': {
    name: 'Cold Interior',
    temp: '14-16°C mean annual',
    description: 'High altitude, cold winters, moderate summers',
    examples: 'Johannesburg, Bloemfontein'
  },
  '2': {
    name: 'Temperate Interior',
    temp: '16-18°C mean annual',
    description: 'Moderate climate, warm summers, mild winters',
    examples: 'Pretoria, Polokwane'
  },
  '3': {
    name: 'Hot Interior',
    temp: '18-22°C mean annual',
    description: 'Hot summers, warm winters, summer rainfall',
    examples: 'Makhado, Nelspruit'
  },
  '4': {
    name: 'Temperate Coastal',
    temp: '14-18°C mean annual',
    description: 'Moderate climate, winter rainfall, ocean influence',
    examples: 'Cape Town, Port Elizabeth'
  },
  '5': {
    name: 'Sub-tropical Coastal',
    temp: '18-22°C mean annual',
    description: 'Humid, warm year-round, high rainfall',
    examples: 'Durban, Richards Bay, East London'
  },
  '6': {
    name: 'Arid Interior',
    temp: '16-20°C mean annual',
    description: 'Very hot dry summers, cold nights, low rainfall',
    examples: 'Kimberley, Upington'
  },
};

// Static climatic zone map image URL (official SANS 10400-XA zones)
// Using a well-known public image of the SA climatic zones
const CLIMATIC_ZONE_MAP_URL = 'https://www.energy.gov.za/EEE/images/climate_zones.jpg';

// Alternative: Use base64 encoded placeholder for the map frame
function generateZoneMapHTML(): string {
  return `
    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e5e7eb;">
      <div style="background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <img src="${CLIMATIC_ZONE_MAP_URL}" 
             alt="South Africa Climatic Zones Map (SANS 10400-XA)" 
             style="max-width: 100%; height: auto; border-radius: 6px;"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
        />
        <div style="display: none; padding: 40px 20px; background: #f8fafc; border-radius: 6px; color: #64748b; font-size: 11px;">
          <p style="margin: 0;">Climatic Zone Map</p>
          <p style="margin: 5px 0 0; font-size: 10px;">Reference: SANS 10400-XA</p>
        </div>
      </div>
      <p style="margin: 15px 0 0; font-size: 10px; color: #64748b; font-weight: 500; letter-spacing: 0.5px;">
        SOUTH AFRICA — SANS 10400-XA CLIMATIC ZONES
      </p>
    </div>
  `;
}

// Generate professional zone legend HTML
function generateZoneLegendHTML(selectedZone: string | null): string {
  return Object.entries(ZONE_DATA).map(([zone, data]) => {
    const isSelected = selectedZone === zone;
    const borderStyle = isSelected ? `2px solid ${ZONE_COLORS[zone]}` : `1px solid ${COLORS.border}`;
    const bgColor = isSelected ? `${ZONE_COLORS[zone]}08` : '#ffffff';
    const shadow = isSelected ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.12);' : '';
    
    return `
      <div style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; background: ${bgColor}; border: ${borderStyle}; border-radius: 6px; margin-bottom: 6px; ${shadow}">
        <div style="width: 22px; height: 22px; background: linear-gradient(135deg, ${ZONE_COLORS[zone]}, ${ZONE_COLORS[zone]}cc); border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
          <span style="color: #fff; font-weight: 700; font-size: 10px;">${zone}</span>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; color: ${COLORS.text}; font-size: 10px; line-height: 1.3;">
            ${data.name}${isSelected ? ' <span style="color: ' + ZONE_COLORS[zone] + ';">●</span>' : ''}
          </div>
          <div style="color: ${ZONE_COLORS[zone]}; font-size: 9px; font-weight: 600; margin-top: 1px;">${data.temp}</div>
          <div style="color: ${COLORS.textLight}; font-size: 8px; margin-top: 2px; line-height: 1.3;">${data.description}</div>
          <div style="color: #9ca3af; font-size: 8px; font-style: italic; margin-top: 1px;">e.g. ${data.examples}</div>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function generateHTML(data: RequestBody): string {
  const { document, sections, projectName, revision, companyDetails } = data;
  
  const logoHtml = companyDetails?.companyLogoUrl 
    ? `<img src="${companyDetails.companyLogoUrl}" alt="Company Logo" style="max-height: 80px; max-width: 200px;" />`
    : '';
  
  const methodName = METHOD_NAMES[document.building_calculation_type || 'sans_204'] || 'SANS 204';
  
  const sectionsHtml = sections.map((section, index) => `
    <div class="section" style="${index > 0 ? 'margin-top: 30px;' : ''}">
      <h3 style="font-size: 14px; color: ${COLORS.primary}; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid ${COLORS.border};">
        ${section.section_number}. ${section.section_title}
      </h3>
      <p style="font-size: 11px; line-height: 1.6; color: ${COLORS.text}; margin: 0; white-space: pre-wrap;">
        ${section.content || '<em style="color: ' + COLORS.textLight + ';">No content provided for this section.</em>'}
      </p>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: ${COLORS.text};
      margin: 0;
      padding: 0;
    }
    /* PDF Standards: table integrity */
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    ${getStandardCoverPageCSS()}
    .page-header {
      font-size: 16px;
      font-weight: bold;
      color: ${COLORS.primary};
      margin: 0 0 10px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${COLORS.primary};
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .info-card {
      background: ${COLORS.background};
      padding: 15px;
      border-radius: 4px;
    }
    .info-label {
      font-size: 10px;
      color: ${COLORS.textLight};
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: bold;
      color: ${COLORS.primary};
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid ${COLORS.border};
    }
    .data-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  ${generateStandardCoverPage({
    reportTitle: 'BULK SERVICES REPORT',
    reportSubtitle: 'Electrical Infrastructure',
    projectName: projectName || 'Bulk Services',
    revision: revision,
    companyLogoUrl: companyDetails?.companyLogoUrl || undefined,
    companyName: companyDetails?.companyName || undefined,
  })}

  <div class="page-break"></div>

  <!-- DOCUMENT INFORMATION -->
  <h2 class="page-header">DOCUMENT INFORMATION</h2>
  <table class="data-table">
    <tr>
      <td style="color: ${COLORS.textLight};">Document Number</td>
      <td>${document.document_number}</td>
    </tr>
    <tr>
      <td style="color: ${COLORS.textLight};">Project</td>
      <td>${projectName || 'Not specified'}</td>
    </tr>
    <tr>
      <td style="color: ${COLORS.textLight};">Created</td>
      <td>${formatDate(document.created_at)}</td>
    </tr>
    ${document.building_calculation_type ? `
    <tr>
      <td style="color: ${COLORS.textLight};">Calculation Method</td>
      <td>${methodName}</td>
    </tr>
    ` : ''}
  </table>
  ${document.notes ? `
    <h3 style="font-size: 12px; margin-top: 20px;">Notes</h3>
    <p style="color: ${COLORS.textLight}; white-space: pre-wrap;">${document.notes}</p>
  ` : ''}

  <div class="page-break"></div>

  <!-- ELECTRICAL LOAD ANALYSIS -->
  <h2 class="page-header">ELECTRICAL LOAD ANALYSIS</h2>
  
  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">Project Area</div>
      <div class="info-value">${document.project_area?.toLocaleString() || 'N/A'} m²</div>
    </div>
    <div class="info-card">
      <div class="info-label">Applied Load</div>
      <div class="info-value">${document.va_per_sqm || 'N/A'} VA/m²</div>
    </div>
    <div class="info-card">
      <div class="info-label">Climatic Zone</div>
      <div class="info-value">${document.climatic_zone || 'N/A'}</div>
    </div>
  </div>

  ${(document.total_connected_load || document.maximum_demand) ? `
    <h3 style="font-size: 12px; margin-top: 25px;">Calculated Values</h3>
    <table class="data-table">
      ${document.total_connected_load ? `<tr><td>Total Connected Load</td><td>${document.total_connected_load.toLocaleString()} kVA</td></tr>` : ''}
      ${document.diversity_factor ? `<tr><td>Diversity Factor</td><td>${document.diversity_factor}%</td></tr>` : ''}
      ${document.future_expansion_factor ? `<tr><td>Future Expansion</td><td>${document.future_expansion_factor}%</td></tr>` : ''}
      ${document.maximum_demand ? `<tr><td style="font-weight: bold;">Maximum Demand</td><td style="color: ${COLORS.primary}; font-size: 14px;">${document.maximum_demand.toLocaleString()} kVA</td></tr>` : ''}
    </table>
  ` : ''}

  ${(document.primary_voltage || document.connection_size || document.supply_authority) ? `
    <h3 style="font-size: 12px; margin-top: 25px;">Connection Details</h3>
    <table class="data-table">
      ${document.primary_voltage ? `<tr><td>Primary Voltage</td><td>${document.primary_voltage}</td></tr>` : ''}
      ${document.connection_size ? `<tr><td>Connection Size</td><td>${document.connection_size}</td></tr>` : ''}
      ${document.supply_authority ? `<tr><td>Supply Authority</td><td>${document.supply_authority}</td></tr>` : ''}
      ${document.tariff_structure ? `<tr><td>Tariff Structure</td><td>${document.tariff_structure}</td></tr>` : ''}
    </table>
  ` : ''}

  <!-- CLIMATIC ZONE SECTION -->
  ${document.climatic_zone ? `
    <div class="page-break"></div>
    
    <h2 class="page-header">CLIMATIC ZONE ANALYSIS</h2>
    
    <p style="color: ${COLORS.textLight}; font-size: 11px; margin-bottom: 20px;">
      The climatic zone classification follows SANS 10400-XA standards for energy efficiency in buildings.
      ${document.climatic_zone_city ? `Project location is near <strong>${document.climatic_zone_city}</strong>.` : ''}
    </p>
    
    <div style="display: flex; gap: 30px; align-items: flex-start;">
      <!-- Map -->
      <div style="flex: 1;">
        ${generateZoneMapHTML()}
      </div>
      
      <!-- Legend -->
      <div style="flex: 1;">
        <h3 style="font-size: 12px; margin: 0 0 15px 0; color: ${COLORS.primary};">Zone Classifications</h3>
        ${generateZoneLegendHTML(document.climatic_zone)}
      </div>
    </div>
    
    <!-- Selected Zone Details -->
    ${ZONE_DATA[document.climatic_zone] ? `
      <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, ${ZONE_COLORS[document.climatic_zone]}15, ${ZONE_COLORS[document.climatic_zone]}05); border: 2px solid ${ZONE_COLORS[document.climatic_zone]}; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: ${COLORS.primary}; font-size: 14px;">
          Selected Zone: Zone ${document.climatic_zone} - ${ZONE_DATA[document.climatic_zone].name}
        </h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div>
            <div style="font-size: 10px; color: ${COLORS.textLight};">Mean Annual Temperature</div>
            <div style="font-size: 12px; font-weight: 600; color: ${ZONE_COLORS[document.climatic_zone]};">${ZONE_DATA[document.climatic_zone].temp}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: ${COLORS.textLight};">Climate Characteristics</div>
            <div style="font-size: 11px; color: ${COLORS.text};">${ZONE_DATA[document.climatic_zone].description}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: ${COLORS.textLight};">Example Cities</div>
            <div style="font-size: 11px; color: ${COLORS.text};">${ZONE_DATA[document.climatic_zone].examples}</div>
          </div>
        </div>
      </div>
    ` : ''}
  ` : ''}

  ${sections.length > 0 ? `
    <div class="page-break"></div>

    <!-- REPORT SECTIONS -->
    <h2 class="page-header">REPORT SECTIONS</h2>
    ${sectionsHtml}
  ` : ''}

</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[BulkServicesPDF] Edge function starting...');
    
    const pdfShiftApiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (!pdfShiftApiKey) {
      console.error('[BulkServicesPDF] PDFSHIFT_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'PDF generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody: RequestBody & { filename?: string; storageBucket?: string } = await req.json();
    console.log('[BulkServicesPDF] Request body keys:', Object.keys(requestBody));
    
    const { document, sections, projectName, revision, companyDetails, filename, storageBucket } = requestBody;

    if (!document || !document.id) {
      console.error('[BulkServicesPDF] Missing document data. Document:', document ? 'exists' : 'null', 'ID:', document?.id);
      return new Response(
        JSON.stringify({ error: 'Missing document data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BulkServicesPDF] Generating PDF for document:', document.document_number);
    console.log('[BulkServicesPDF] Project:', projectName, 'Revision:', revision);

    // Generate HTML
    const html = generateHTML({ document, sections, projectName, revision, companyDetails });
    console.log('[BulkServicesPDF] HTML generated, length:', html.length);

    // Call PDFShift API
    console.log('[BulkServicesPDF] Calling PDFShift API...');
    const pdfPayload = buildPDFShiftPayload(html, {
      reportTitle: 'Bulk Services Report',
      projectName: projectName || 'Bulk Services',
    });

    const pdfShiftResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${pdfShiftApiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pdfPayload),
    });

    if (!pdfShiftResponse.ok) {
      const errorText = await pdfShiftResponse.text();
      console.error('[BulkServicesPDF] PDFShift API error:', pdfShiftResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `PDF generation failed: ${pdfShiftResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    console.log('[BulkServicesPDF] PDF generated:', pdfBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bucket = storageBucket || 'bulk-services-reports';
    const finalFilename = filename || `BulkServices_${document.document_number}_${revision}_${Date.now()}.pdf`;
    const filePath = `${document.project_id}/${finalFilename}`;

    console.log('[BulkServicesPDF] Uploading to storage:', bucket, filePath);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[BulkServicesPDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BulkServicesPDF] Upload complete!');

    return new Response(
      JSON.stringify({
        success: true,
        filePath,
        fileName: finalFilename,
        fileSize: pdfBuffer.byteLength,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BulkServicesPDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
