import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CableEntry {
  id: string;
  cable_tag: string;
  from_location: string;
  to_location: string;
  voltage: number;
  load_amps?: number;
  cable_type?: string;
  cable_size?: string;
  measured_length?: number;
  extra_length?: number;
  total_length?: number;
  ohm_per_km?: number;
  volt_drop?: number;
  notes?: string;
}

interface OptimizationRecommendation {
  cableTag: string;
  fromLocation: string;
  toLocation: string;
  currentConfig: string;
  recommendedConfig: string;
}

interface CableSchedulePdfRequest {
  scheduleName: string;
  scheduleNumber: string;
  revision: string;
  projectName?: string;
  projectNumber?: string;
  clientName?: string;
  contactName?: string;
  entries: CableEntry[];
  optimizations?: OptimizationRecommendation[];
  companyLogoBase64?: string;
  userId: string;
  scheduleId: string;
  filename: string;
}

// Sort cables numerically by tag
function sortByTag(entries: CableEntry[]): CableEntry[] {
  return [...entries].sort((a, b) => {
    const tagA = a.cable_tag || '';
    const tagB = b.cable_tag || '';
    const numA = parseFloat(tagA.match(/[\d.]+/)?.[0] || '0');
    const numB = parseFloat(tagB.match(/[\d.]+/)?.[0] || '0');
    if (numA !== numB) return numA - numB;
    return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// Format number
function formatNumber(value?: number, decimals = 2): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(decimals);
}

function generateHTML(data: CableSchedulePdfRequest): string {
  const sortedEntries = sortByTag(data.entries);
  
  // Calculate totals
  const totalLength = sortedEntries.reduce((sum, e) => sum + (e.total_length || 0), 0);
  
  // Group by voltage for summary
  const voltageGroups = new Map<number, { count: number; length: number }>();
  sortedEntries.forEach(e => {
    const v = e.voltage || 0;
    const existing = voltageGroups.get(v) || { count: 0, length: 0 };
    voltageGroups.set(v, {
      count: existing.count + 1,
      length: existing.length + (e.total_length || 0),
    });
  });

  // Cable entries table rows
  const tableRows = sortedEntries.map(e => `
    <tr>
      <td class="font-medium">${e.cable_tag || '-'}</td>
      <td>${e.from_location || '-'}</td>
      <td>${e.to_location || '-'}</td>
      <td class="text-center">${e.voltage || '-'}V</td>
      <td class="text-right">${formatNumber(e.load_amps, 1)}</td>
      <td>${e.cable_type || '-'}</td>
      <td>${e.cable_size || '-'}</td>
      <td class="text-right">${formatNumber(e.measured_length)}</td>
      <td class="text-right">${formatNumber(e.extra_length)}</td>
      <td class="text-right">${formatNumber(e.total_length)}</td>
      <td class="text-right">${formatNumber(e.ohm_per_km, 3)}</td>
      <td class="text-right">${formatNumber(e.volt_drop)}%</td>
    </tr>
  `).join('');

  // Voltage summary rows
  const voltageSummaryRows = Array.from(voltageGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([voltage, stats]) => `
      <tr>
        <td>${voltage}V</td>
        <td class="text-right">${stats.count}</td>
        <td class="text-right">${formatNumber(stats.length)} m</td>
      </tr>
    `).join('');

  // Optimization recommendations section
  let optimizationHtml = '';
  if (data.optimizations && data.optimizations.length > 0) {
    const optimizationRows = data.optimizations.map(o => `
      <tr>
        <td class="font-medium">${o.cableTag}</td>
        <td>${o.fromLocation} → ${o.toLocation}</td>
        <td>${o.currentConfig}</td>
        <td class="text-success">${o.recommendedConfig}</td>
      </tr>
    `).join('');

    optimizationHtml = `
      <div class="page" style="page-break-before: always;">
        <div class="section">
          <h2>Cable Sizing Recommendations</h2>
          <p class="section-intro">The following recommendations show alternatives for achieving the same circuit capacity while maintaining compliance with SANS 10142-1.</p>
          
          <table>
            <thead>
              <tr>
                <th>Cable Tag</th>
                <th>Route</th>
                <th>Current Config</th>
                <th>Recommended</th>
              </tr>
            </thead>
            <tbody>
              ${optimizationRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const shortDate = new Date().toLocaleDateString('en-GB');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.scheduleName} - Cable Schedule Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Roboto', sans-serif;
      font-size: 8pt;
      line-height: 1.4;
      color: #1f2937;
    }
    
    @page {
      size: A4 landscape;
      margin: 15mm 10mm 15mm 10mm;
    }
    
    @page :first {
      margin-top: 0;
      margin-bottom: 0;
    }
    
    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #3b82f6 100%);
      color: white;
      padding: 0;
      margin: 0 -10mm;
      width: calc(100% + 20mm);
      page-break-after: always;
    }
    
    .cover-header {
      padding: 15mm 20mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .cover-logo {
      max-height: 20mm;
      max-width: 60mm;
    }
    
    .cover-badge {
      background: rgba(255,255,255,0.15);
      padding: 3mm 6mm;
      border-radius: 2mm;
      font-size: 10pt;
      font-weight: 500;
    }
    
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 20mm;
    }
    
    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      margin-bottom: 5mm;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    
    .cover-subtitle {
      font-size: 16pt;
      font-weight: 300;
      opacity: 0.9;
      margin-bottom: 15mm;
    }
    
    .cover-project-name {
      font-size: 22pt;
      font-weight: 500;
      padding: 6mm 10mm;
      background: rgba(255,255,255,0.1);
      border-left: 4px solid #60a5fa;
      margin-bottom: 10mm;
    }
    
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10mm;
      margin-top: 10mm;
    }
    
    .cover-meta-item {
      background: rgba(255,255,255,0.08);
      padding: 5mm;
      border-radius: 2mm;
    }
    
    .cover-meta-label {
      font-size: 8pt;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2mm;
    }
    
    .cover-meta-value {
      font-size: 12pt;
      font-weight: 500;
    }
    
    .cover-footer {
      padding: 10mm 20mm;
      background: rgba(0,0,0,0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
    }
    
    /* Content Sections */
    .section {
      margin-bottom: 8mm;
    }
    
    .section-intro {
      color: #6b7280;
      margin-bottom: 5mm;
      font-size: 9pt;
    }
    
    h2 {
      font-size: 14pt;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 4mm;
      padding-bottom: 2mm;
      border-bottom: 2px solid #1e40af;
    }
    
    h3 {
      font-size: 11pt;
      margin-bottom: 3mm;
      color: #374151;
    }
    
    /* Tables - Critical for proper page breaks */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4mm;
      font-size: 7pt;
    }
    
    thead {
      display: table-header-group;
    }
    
    tbody {
      display: table-row-group;
    }
    
    tfoot {
      display: table-footer-group;
    }
    
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    th {
      background: #1e40af;
      color: white;
      padding: 2mm 2.5mm;
      text-align: left;
      font-weight: 500;
      font-size: 7pt;
      white-space: nowrap;
    }
    
    td {
      padding: 1.5mm 2.5mm;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    
    tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-medium { font-weight: 500; }
    .text-success { color: #059669; }
    
    .total-row {
      background: #dbeafe !important;
      font-weight: 600;
    }
    
    .total-row td {
      border-top: 2px solid #1e40af;
      padding: 2.5mm 2.5mm;
    }
    
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5mm;
      margin-bottom: 8mm;
    }
    
    .summary-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 1px solid #bae6fd;
      padding: 5mm;
      border-radius: 2mm;
      text-align: center;
    }
    
    .summary-card-label {
      font-size: 8pt;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2mm;
    }
    
    .summary-card-value {
      font-size: 16pt;
      font-weight: 700;
      color: #0c4a6e;
    }
    
    .summary-card-unit {
      font-size: 9pt;
      color: #0369a1;
      font-weight: 400;
    }
    
    /* Voltage Summary Table */
    .voltage-summary {
      width: auto;
      max-width: 300px;
    }
    
    .voltage-summary th,
    .voltage-summary td {
      padding: 2mm 4mm;
    }
    
    /* Page Break Controls */
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    
    .no-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .compliance-note {
      font-style: italic;
    }
  </style>
</head>
<body>

<!-- Cover Page -->
<div class="cover-page">
  <div class="cover-header">
    ${data.companyLogoBase64 ? `<img src="${data.companyLogoBase64}" class="cover-logo" alt="Company Logo" />` : '<div></div>'}
    <div class="cover-badge">Rev ${data.revision}</div>
  </div>
  
  <div class="cover-content">
    <div class="cover-title">Cable Schedule</div>
    <div class="cover-subtitle">Comprehensive Cable Installation Report</div>
    
    <div class="cover-project-name">${data.scheduleName}</div>
    
    <div class="cover-meta">
      ${data.projectNumber ? `
      <div class="cover-meta-item">
        <div class="cover-meta-label">Project Number</div>
        <div class="cover-meta-value">${data.projectNumber}</div>
      </div>
      ` : ''}
      <div class="cover-meta-item">
        <div class="cover-meta-label">Schedule Number</div>
        <div class="cover-meta-value">${data.scheduleNumber}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Total Cables</div>
        <div class="cover-meta-value">${sortedEntries.length}</div>
      </div>
      ${data.clientName ? `
      <div class="cover-meta-item">
        <div class="cover-meta-label">Client</div>
        <div class="cover-meta-value">${data.clientName}</div>
      </div>
      ` : ''}
    </div>
  </div>
  
  <div class="cover-footer">
    <div class="compliance-note">Designed in accordance with SANS 10142-1</div>
    <div>Generated: ${currentDate}</div>
  </div>
</div>

<!-- Summary Page -->
<div class="section">
  <h2>Schedule Summary</h2>
  
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-card-label">Total Cables</div>
      <div class="summary-card-value">${sortedEntries.length}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Total Length</div>
      <div class="summary-card-value">${formatNumber(totalLength, 1)} <span class="summary-card-unit">m</span></div>
    </div>
  </div>
  
  <h3>Summary by Voltage Level</h3>
  <table class="voltage-summary">
    <thead>
      <tr>
        <th>Voltage</th>
        <th class="text-right">Cables</th>
        <th class="text-right">Length</th>
      </tr>
    </thead>
    <tbody>
      ${voltageSummaryRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td>Total</td>
        <td class="text-right">${sortedEntries.length}</td>
        <td class="text-right">${formatNumber(totalLength)} m</td>
      </tr>
    </tfoot>
  </table>
</div>

<div class="page-break"></div>

<!-- Cable Schedule Table -->
<div class="section">
  <h2>Cable Schedule</h2>
  
  <table>
    <thead>
      <tr>
        <th>Cable Tag</th>
        <th>From</th>
        <th>To</th>
        <th class="text-center">Voltage</th>
        <th class="text-right">Load (A)</th>
        <th>Type</th>
        <th>Size</th>
        <th class="text-right">Measured (m)</th>
        <th class="text-right">Extra (m)</th>
        <th class="text-right">Total (m)</th>
        <th class="text-right">Ω/km</th>
        <th class="text-right">V.Drop</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="9"><strong>TOTALS</strong></td>
        <td class="text-right"><strong>${formatNumber(totalLength)}</strong></td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>
</div>

${optimizationHtml}

</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CableSchedulePDF] Starting generation...');
    
    const pdfShiftApiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (!pdfShiftApiKey) {
      console.error('[CableSchedulePDF] PDFSHIFT_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'PDF generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const requestData: CableSchedulePdfRequest = await req.json();
    console.log('[CableSchedulePDF] Request for schedule:', requestData.scheduleName);
    console.log('[CableSchedulePDF] Entries count:', requestData.entries.length);
    
    // Generate HTML
    const html = generateHTML(requestData);
    console.log('[CableSchedulePDF] HTML generated, length:', html.length);
    
    // Call PDFShift API
    console.log('[CableSchedulePDF] Calling PDFShift API...');
    const pdfShiftResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${pdfShiftApiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: html,
        format: 'A4',
        landscape: true,
        margin: { top: '22mm', right: '10mm', bottom: '20mm', left: '10mm' },
        use_print: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 10mm;display:flex;justify-content:space-between;align-items:center;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;"><span style="font-weight:600;color:#374151;">Cable Schedule Report</span><span>${requestData.scheduleName || ''}</span></div>`,
        footerTemplate: `<div style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 10mm;display:flex;justify-content:space-between;align-items:center;color:#94a3b8;border-top:1px solid #e5e7eb;padding-top:4px;"><span>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      }),
    });

    if (!pdfShiftResponse.ok) {
      const errorText = await pdfShiftResponse.text();
      console.error('[CableSchedulePDF] PDFShift API error:', pdfShiftResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `PDF generation failed: ${pdfShiftResponse.status}`, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    console.log('[CableSchedulePDF] PDF generated:', pdfBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const filePath = `${requestData.scheduleId}/${requestData.filename}`;
    console.log('[CableSchedulePDF] Uploading to storage:', filePath);

    const { error: uploadError } = await supabase.storage
      .from('cable-schedule-reports')
      .upload(filePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[CableSchedulePDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save PDF', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CableSchedulePDF] PDF saved successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        filePath,
        fileSize: pdfBuffer.byteLength,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[CableSchedulePDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
