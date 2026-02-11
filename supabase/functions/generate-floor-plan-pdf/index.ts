import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildPDFShiftPayload } from "../_shared/pdfStandards.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EquipmentItem {
  id: string;
  type: string;
  position: { x: number; y: number };
  rotation: number;
  name?: string;
}

interface SupplyLine {
  id: string;
  name: string;
  label?: string;
  type: 'mv' | 'lv' | 'dc';
  length: number;
  pathLength?: number;
  from?: string;
  to?: string;
  cableType?: string;
  terminationCount?: number;
  startHeight?: number;
  endHeight?: number;
}

interface Containment {
  id: string;
  type: string;
  size: string;
  length: number;
}

interface SupplyZone {
  id: string;
  name: string;
  area: number;
}

interface PVArrayItem {
  id: string;
  rows: number;
  columns: number;
  orientation: string;
}

interface PVPanelConfig {
  width: number;
  length: number;
  wattage: number;
}

interface FloorPlanPdfRequest {
  projectName: string;
  comments?: string;
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  pvPanelConfig?: PVPanelConfig | null;
  pvArrays?: PVArrayItem[];
  layoutImageBase64?: string;
  userId: string;
  projectId?: string;
  filename: string;
  storageBucket: string;
}

// Sort lines numerically by label
function sortLinesByLabel(lines: SupplyLine[]): SupplyLine[] {
  return [...lines].sort((a, b) => {
    const labelA = a.label || '';
    const labelB = b.label || '';
    const numA = parseFloat(labelA.match(/[\d.]+/)?.[0] || '0');
    const numB = parseFloat(labelB.match(/[\d.]+/)?.[0] || '0');
    if (numA !== numB) return numA - numB;
    return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// Generate the HTML template
function generateHTML(data: FloorPlanPdfRequest): string {
  const { projectName, comments, equipment, lines, zones, containment, pvPanelConfig, pvArrays, layoutImageBase64 } = data;
  
  // Calculate summaries
  const mvTotal = lines.filter(l => l.type === 'mv').reduce((s, l) => s + l.length, 0);
  const dcTotal = lines.filter(l => l.type === 'dc').reduce((s, l) => s + l.length, 0);
  const lvLines = sortLinesByLabel(lines.filter(l => l.type === 'lv' && l.cableType));
  
  // LV Cable Summary by type
  const lvSummaryMap = new Map<string, number>();
  lvLines.forEach(l => {
    const existing = lvSummaryMap.get(l.cableType!) || 0;
    lvSummaryMap.set(l.cableType!, existing + l.length);
  });
  
  // Equipment summary by type
  const equipmentCounts = new Map<string, number>();
  equipment.forEach(e => {
    const count = equipmentCounts.get(e.type) || 0;
    equipmentCounts.set(e.type, count + 1);
  });
  
  // Containment summary - group by type AND size
  const containmentKey = (c: Containment) => `${c.type}|||${c.size || 'N/A'}`;
  const containmentCounts = new Map<string, { type: string; size: string; count: number; totalLength: number }>();
  containment.forEach(c => {
    const key = containmentKey(c);
    const existing = containmentCounts.get(key) || { type: c.type, size: c.size || 'N/A', count: 0, totalLength: 0 };
    containmentCounts.set(key, {
      type: c.type,
      size: c.size || 'N/A',
      count: existing.count + 1,
      totalLength: existing.totalLength + c.length,
    });
  });
  
  // PV calculations
  let pvSummaryHtml = '';
  if (pvPanelConfig && pvArrays && pvArrays.length > 0) {
    const totalPanels = pvArrays.reduce((s, a) => s + (a.rows * a.columns), 0);
    const totalWattage = totalPanels * pvPanelConfig.wattage;
    pvSummaryHtml = `
      <div class="section">
        <h2>PV System Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th class="text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Panel Configuration</td><td class="text-right">${pvPanelConfig.width}m × ${pvPanelConfig.length}m</td></tr>
            <tr><td>Panel Wattage</td><td class="text-right">${pvPanelConfig.wattage}W</td></tr>
            <tr><td>Total Arrays</td><td class="text-right">${pvArrays.length}</td></tr>
            <tr><td>Total Panels</td><td class="text-right">${totalPanels}</td></tr>
            <tr class="total-row"><td>Total Capacity</td><td class="text-right">${(totalWattage / 1000).toFixed(2)} kWp</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${projectName} - Floor Plan Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Roboto', sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #1f2937;
    }
    
    /* Page rules */
    @page {
      size: A4 portrait;
      margin: 15mm 12mm 20mm 12mm;
      @bottom-center {
        content: element(footer);
      }
    }
    
    @page :first {
      @bottom-center { content: none; }
    }
    
    .page {
      page-break-after: always;
      min-height: 100vh;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40mm 20mm;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      min-height: 100vh;
    }
    
    .cover-title {
      font-size: 28pt;
      font-weight: 700;
      margin-bottom: 8mm;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      font-weight: 300;
      margin-bottom: 20mm;
      opacity: 0.9;
    }
    
    .cover-project {
      font-size: 20pt;
      font-weight: 500;
      margin-bottom: 30mm;
      padding: 8mm 16mm;
      background: rgba(255,255,255,0.15);
      border-radius: 4px;
    }
    
    .cover-date {
      font-size: 11pt;
      opacity: 0.8;
    }
    
    /* Content Sections */
    .section {
      margin-bottom: 8mm;
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
      font-weight: 500;
      color: #374151;
      margin: 6mm 0 3mm 0;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4mm;
      font-size: 8pt;
    }
    
    thead {
      display: table-header-group;
    }
    
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    th {
      background: #1e40af;
      color: white;
      padding: 2.5mm 3mm;
      text-align: left;
      font-weight: 500;
      font-size: 8pt;
    }
    
    td {
      padding: 2mm 3mm;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .total-row {
      background: #dbeafe !important;
      font-weight: 600;
    }
    
    .total-row td {
      border-top: 2px solid #1e40af;
    }
    
    /* Comments */
    .comments-section {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 4mm;
      margin: 6mm 0;
    }
    
    .comments-section h3 {
      color: #92400e;
      margin-top: 0;
    }
    
    /* Layout Image */
    .layout-image {
      max-width: 100%;
      max-height: 200mm;
      margin: 4mm auto;
      display: block;
    }
    
    /* Footer */
    .running-footer {
      position: running(footer);
      font-size: 8pt;
      color: #6b7280;
      text-align: center;
      padding-top: 2mm;
      border-top: 1px solid #e5e7eb;
    }
    
    .running-footer span {
      margin: 0 4mm;
    }
    
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
      margin-bottom: 6mm;
    }
    
    .summary-card {
      background: #f3f4f6;
      padding: 4mm;
      border-radius: 2mm;
      text-align: center;
    }
    
    .summary-card .value {
      font-size: 18pt;
      font-weight: 700;
      color: #1e40af;
    }
    
    .summary-card .label {
      font-size: 8pt;
      color: #6b7280;
      margin-top: 1mm;
    }
  </style>
</head>
<body>

<!-- Cover Page -->
<div class="page cover-page">
  <div class="cover-title">Floor Plan Report</div>
  <div class="cover-subtitle">Electrical Markup Documentation</div>
  <div class="cover-project">${projectName}</div>
  <div class="cover-date">Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</div>

<!-- Summary Page -->
<div class="page">
  <h2>Project Summary</h2>
  
  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${equipment.length}</div>
      <div class="label">Equipment Items</div>
    </div>
    <div class="summary-card">
      <div class="value">${lines.length}</div>
      <div class="label">Cable Runs</div>
    </div>
    <div class="summary-card">
      <div class="value">${containment.length}</div>
      <div class="label">Containment Items</div>
    </div>
  </div>
  
  ${comments ? `
  <div class="comments-section">
    <h3>Project Notes</h3>
    <p>${comments}</p>
  </div>
  ` : ''}
  
  ${pvSummaryHtml}
  
  ${mvTotal > 0 || dcTotal > 0 ? `
  <div class="section">
    <h2>Power Cable Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Cable Type</th>
          <th class="text-right">Total Length</th>
        </tr>
      </thead>
      <tbody>
        ${mvTotal > 0 ? `<tr><td>MV Cables</td><td class="text-right">${mvTotal.toFixed(2)}m</td></tr>` : ''}
        ${dcTotal > 0 ? `<tr><td>DC Cables</td><td class="text-right">${dcTotal.toFixed(2)}m</td></tr>` : ''}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  ${lvSummaryMap.size > 0 ? `
  <div class="section">
    <h2>LV/AC Cable Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Cable Type</th>
          <th class="text-right">Total Length</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from(lvSummaryMap.entries()).map(([type, length]) => 
          `<tr><td>${type}</td><td class="text-right">${length.toFixed(2)}m</td></tr>`
        ).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
</div>

<!-- Full Cable Schedule -->
${lvLines.length > 0 ? `
<div class="page">
  <h2>Full LV/AC Cable Schedule</h2>
  <table>
    <thead>
      <tr>
        <th>Label</th>
        <th>From</th>
        <th>To</th>
        <th>Cable Type</th>
        <th class="text-right">Length</th>
        <th class="text-center">Term.</th>
      </tr>
    </thead>
    <tbody>
      ${lvLines.map(l => {
        const isGpWire = l.cableType?.includes('GP');
        const pathLen = l.pathLength ?? l.length;
        const startH = l.startHeight ?? 0;
        const endH = l.endHeight ?? 0;
        const calculatedLength = isGpWire ? (pathLen * 3) + startH + endH : l.length;
        let lengthStr = `${calculatedLength.toFixed(2)}m`;
        
        if (l.pathLength !== undefined) {
          if (isGpWire) {
            lengthStr += ` (${pathLen.toFixed(2)}m x3 + ${startH}m + ${endH}m)`;
          } else {
            lengthStr += ` (${pathLen.toFixed(2)}m + ${startH}m + ${endH}m)`;
          }
        }
        
        return `<tr>
          <td>${l.label || ''}</td>
          <td>${l.from || 'N/A'}</td>
          <td>${l.to || 'N/A'}</td>
          <td>${l.cableType || 'N/A'}</td>
          <td class="text-right">${lengthStr}</td>
          <td class="text-center">${l.terminationCount || 0}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>
` : ''}

<!-- Equipment Schedule -->
${equipmentCounts.size > 0 ? `
<div class="page">
  <h2>Equipment Schedule</h2>
  <table>
    <thead>
      <tr>
        <th>Equipment Type</th>
        <th class="text-center">Quantity</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from(equipmentCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([type, count]) => 
          `<tr><td>${type}</td><td class="text-center">${count}</td></tr>`
        ).join('')}
      <tr class="total-row">
        <td>Total Equipment</td>
        <td class="text-center">${equipment.length}</td>
      </tr>
    </tbody>
  </table>
</div>
` : ''}

<!-- Containment Schedule -->
${containmentCounts.size > 0 ? `
<div class="page">
  <h2>Containment Schedule</h2>
  <table>
    <thead>
      <tr>
        <th>Containment Type</th>
        <th>Size</th>
        <th class="text-center">Count</th>
        <th class="text-right">Total Length</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from(containmentCounts.values())
        .sort((a, b) => {
          const typeCompare = a.type.localeCompare(b.type);
          if (typeCompare !== 0) return typeCompare;
          // Natural numeric sort for sizes
          const numA = parseFloat(a.size.match(/[\d.]+/)?.[0] || '0');
          const numB = parseFloat(b.size.match(/[\d.]+/)?.[0] || '0');
          return numA - numB;
        })
        .map(data => 
          `<tr><td>${data.type}</td><td>${data.size}</td><td class="text-center">${data.count}</td><td class="text-right">${data.totalLength.toFixed(2)}m</td></tr>`
        ).join('')}
      <tr class="total-row">
        <td colspan="2">Total</td>
        <td class="text-center">${containment.length}</td>
        <td class="text-right">${containment.reduce((s, c) => s + c.length, 0).toFixed(2)}m</td>
      </tr>
    </tbody>
  </table>
</div>
` : ''}

<!-- Layout Drawing Page -->
${layoutImageBase64 ? `
<div class="page" style="page-break-before: always;">
  <h2>Layout Drawing</h2>
  <img src="${layoutImageBase64}" class="layout-image" alt="Floor Plan Layout" />
</div>
` : ''}

<!-- Running Footer -->
<div class="running-footer">
  <span>${projectName}</span>
  <span>|</span>
  <span>Generated: ${new Date().toLocaleDateString('en-GB')}</span>
</div>

</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[FloorPlanPDF] Starting generation...');
    
    const pdfShiftApiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (!pdfShiftApiKey) {
      console.error('[FloorPlanPDF] PDFSHIFT_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'PDF generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const requestData: FloorPlanPdfRequest = await req.json();
    console.log('[FloorPlanPDF] Request for project:', requestData.projectName);
    console.log('[FloorPlanPDF] Data counts - Equipment:', requestData.equipment.length, 
                'Lines:', requestData.lines.length, 
                'Containment:', requestData.containment.length);
    
    // Generate HTML
    const html = generateHTML(requestData);
    console.log('[FloorPlanPDF] HTML generated, length:', html.length);
    
    // Call PDFShift API
    console.log('[FloorPlanPDF] Calling PDFShift API...');
    const pdfPayload = buildPDFShiftPayload(html, {
      reportTitle: 'Floor Plan Report',
      projectName: requestData.projectName,
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
      console.error('[FloorPlanPDF] PDFShift API error:', pdfShiftResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `PDF generation failed: ${pdfShiftResponse.status}`, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    console.log('[FloorPlanPDF] PDF generated:', pdfBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const filePath = `${requestData.userId}/${requestData.filename}`;
    console.log('[FloorPlanPDF] Uploading to storage:', filePath);

    const { error: uploadError } = await supabase.storage
      .from(requestData.storageBucket)
      .upload(filePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[FloorPlanPDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save PDF', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[FloorPlanPDF] PDF saved successfully');
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
    console.error('[FloorPlanPDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
