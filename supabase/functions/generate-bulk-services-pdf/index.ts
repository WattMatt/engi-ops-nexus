import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

// Generate SVG map of South Africa with climatic zones
function generateZoneMapSVG(selectedZone: string | null): string {
  const zoneOpacity = (zone: string) => selectedZone === zone ? '1' : '0.4';
  const zoneBorder = (zone: string) => selectedZone === zone ? '3' : '1';
  
  return `
    <svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" style="width: 100%; max-width: 500px; height: auto;">
      <!-- South Africa outline simplified -->
      <defs>
        <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e0f2fe;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#bae6fd;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background ocean -->
      <rect width="400" height="320" fill="url(#oceanGrad)" rx="8"/>
      
      <!-- Zone 6: Arid Interior (Northern Cape - northwest) -->
      <path d="M40,180 L80,140 L140,130 L160,160 L140,200 L100,220 L60,220 Z" 
            fill="${ZONE_COLORS['6']}" opacity="${zoneOpacity('6')}" 
            stroke="${selectedZone === '6' ? '#000' : '#fff'}" stroke-width="${zoneBorder('6')}"/>
      
      <!-- Zone 4: Temperate Coastal (Western Cape - southwest coast) -->
      <path d="M40,180 L60,220 L100,220 L120,260 L80,280 L40,260 L30,220 Z" 
            fill="${ZONE_COLORS['4']}" opacity="${zoneOpacity('4')}" 
            stroke="${selectedZone === '4' ? '#000' : '#fff'}" stroke-width="${zoneBorder('4')}"/>
      
      <!-- Zone 4: Temperate Coastal (Eastern Cape - south coast) -->
      <path d="M120,260 L180,250 L220,260 L200,280 L140,290 L80,280 Z" 
            fill="${ZONE_COLORS['4']}" opacity="${zoneOpacity('4')}" 
            stroke="${selectedZone === '4' ? '#000' : '#fff'}" stroke-width="${zoneBorder('4')}"/>
      
      <!-- Zone 1: Cold Interior (Gauteng/Free State - central) -->
      <path d="M160,160 L200,150 L230,160 L240,200 L200,230 L160,220 L140,200 Z" 
            fill="${ZONE_COLORS['1']}" opacity="${zoneOpacity('1')}" 
            stroke="${selectedZone === '1' ? '#000' : '#fff'}" stroke-width="${zoneBorder('1')}"/>
      
      <!-- Zone 2: Temperate Interior (North West/Gauteng north - north central) -->
      <path d="M140,130 L180,100 L230,90 L260,110 L260,140 L230,160 L200,150 L160,160 Z" 
            fill="${ZONE_COLORS['2']}" opacity="${zoneOpacity('2')}" 
            stroke="${selectedZone === '2' ? '#000' : '#fff'}" stroke-width="${zoneBorder('2')}"/>
      
      <!-- Zone 3: Hot Interior (Limpopo/Mpumalanga - northeast) -->
      <path d="M260,110 L300,80 L340,90 L360,120 L350,160 L300,170 L260,140 Z" 
            fill="${ZONE_COLORS['3']}" opacity="${zoneOpacity('3')}" 
            stroke="${selectedZone === '3' ? '#000' : '#fff'}" stroke-width="${zoneBorder('3')}"/>
      
      <!-- Zone 5: Sub-tropical Coastal (KZN - east coast) -->
      <path d="M300,170 L350,160 L370,200 L360,250 L320,280 L280,270 L260,230 L280,190 Z" 
            fill="${ZONE_COLORS['5']}" opacity="${zoneOpacity('5')}" 
            stroke="${selectedZone === '5' ? '#000' : '#fff'}" stroke-width="${zoneBorder('5')}"/>
      
      <!-- Zone 5: Sub-tropical Coastal extension (Eastern Cape coast) -->
      <path d="M220,260 L280,270 L260,290 L200,280 Z" 
            fill="${ZONE_COLORS['5']}" opacity="${zoneOpacity('5')}" 
            stroke="${selectedZone === '5' ? '#000' : '#fff'}" stroke-width="${zoneBorder('5')}"/>
      
      <!-- Central fill connecting zones -->
      <path d="M200,230 L240,200 L260,230 L280,190 L300,170 L260,140 L230,160 L240,200 Z" 
            fill="${ZONE_COLORS['1']}" opacity="${zoneOpacity('1')}" 
            stroke="${selectedZone === '1' ? '#000' : '#fff'}" stroke-width="1"/>
      
      <!-- Zone labels -->
      <text x="90" y="175" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">6</text>
      <text x="70" y="245" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">4</text>
      <text x="160" y="270" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">4</text>
      <text x="195" y="195" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">1</text>
      <text x="200" y="125" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">2</text>
      <text x="310" y="125" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">3</text>
      <text x="320" y="220" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">5</text>
      
      <!-- Country label -->
      <text x="200" y="310" font-size="11" fill="${COLORS.textLight}" font-weight="500" text-anchor="middle">SOUTH AFRICA - SANS 10400-XA CLIMATIC ZONES</text>
      
      ${selectedZone ? `
        <!-- Selected zone indicator -->
        <circle cx="380" cy="20" r="15" fill="${ZONE_COLORS[selectedZone]}" stroke="#fff" stroke-width="2"/>
        <text x="380" y="25" font-size="12" fill="#fff" font-weight="bold" text-anchor="middle">${selectedZone}</text>
      ` : ''}
    </svg>
  `;
}

// Generate zone legend HTML
function generateZoneLegendHTML(selectedZone: string | null): string {
  return Object.entries(ZONE_DATA).map(([zone, data]) => {
    const isSelected = selectedZone === zone;
    const borderStyle = isSelected ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`;
    const bgColor = isSelected ? '#f0f9ff' : '#fff';
    
    return `
      <div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px; background: ${bgColor}; border: ${borderStyle}; border-radius: 6px; margin-bottom: 8px;">
        <div style="width: 24px; height: 24px; background: ${ZONE_COLORS[zone]}; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
          <span style="color: #fff; font-weight: bold; font-size: 11px;">${zone}</span>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: ${COLORS.text}; font-size: 11px;">${data.name}${isSelected ? ' ✓' : ''}</div>
          <div style="color: ${ZONE_COLORS[zone]}; font-size: 10px; font-weight: 500;">${data.temp}</div>
          <div style="color: ${COLORS.textLight}; font-size: 9px; margin-top: 2px;">${data.description}</div>
          <div style="color: ${COLORS.textLight}; font-size: 9px; font-style: italic;">e.g. ${data.examples}</div>
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
    .page-break {
      page-break-after: always;
    }
    .cover-page {
      text-align: center;
      padding-top: 80px;
    }
    .logo-container {
      margin-bottom: 40px;
    }
    .main-title {
      font-size: 32px;
      font-weight: bold;
      color: ${COLORS.primary};
      margin: 40px 0 10px;
    }
    .subtitle {
      font-size: 14px;
      color: ${COLORS.textLight};
      margin: 5px 0;
    }
    .divider {
      width: 200px;
      height: 3px;
      background: ${COLORS.primary};
      margin: 40px auto;
    }
    .meta-table {
      margin: 0 auto;
      text-align: left;
    }
    .meta-table td {
      padding: 6px 15px;
      font-size: 11px;
    }
    .meta-label {
      color: ${COLORS.textLight};
    }
    .meta-value {
      font-weight: 600;
    }
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
  <div class="cover-page">
    <div class="logo-container">
      ${logoHtml}
    </div>
    <div class="main-title">BULK SERVICES REPORT</div>
    <div class="subtitle">ELECTRICAL INFRASTRUCTURE</div>
    <div class="subtitle">Document ${document.document_number}</div>
    <div class="divider"></div>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Project:</td>
        <td class="meta-value">${projectName || 'Bulk Services'}</td>
      </tr>
      <tr>
        <td class="meta-label">Revision:</td>
        <td class="meta-value">${revision}</td>
      </tr>
      <tr>
        <td class="meta-label">Date:</td>
        <td class="meta-value">${formatDate(new Date().toISOString())}</td>
      </tr>
      <tr>
        <td class="meta-label">Method:</td>
        <td class="meta-value">${methodName}</td>
      </tr>
    </table>
    ${companyDetails?.companyName ? `<p style="margin-top: 80px; color: ${COLORS.textLight};">${companyDetails.companyName}</p>` : ''}
  </div>

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
        ${generateZoneMapSVG(document.climatic_zone)}
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
    const { document, sections, projectName, revision, companyDetails, filename, storageBucket } = requestBody;

    if (!document || !document.id) {
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
    const pdfShiftResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${pdfShiftApiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: html,
        format: 'A4',
        margin: { top: '15mm', right: '15mm', bottom: '20mm', left: '15mm' },
      }),
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
