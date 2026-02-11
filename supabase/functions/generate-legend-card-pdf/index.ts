import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildPDFShiftPayload, generateStandardCoverPage, getStandardCoverPageCSS, getStandardCSS } from "../_shared/pdfStandards.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Circuit {
  cb_no: number;
  description: string;
  amp_rating: string;
}

interface Contactor {
  name: string;
  amps: string;
  controlling: string;
  kw: string;
  coil: string;
  poles: string;
}

interface LegendCardPdfRequest {
  cardId: string;
  projectName?: string;
  projectNumber?: string;
  companyLogoBase64?: string;
  contactName?: string;
  contactOrganization?: string;
  contactEmail?: string;
  filename: string;
  pageSize?: 'A4' | 'A5';
  notes?: string;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateCircuitRows(circuits: Circuit[], start: number, end: number): string {
  let rows = '';
  for (let i = start; i < end && i < circuits.length; i++) {
    const c = circuits[i];
    rows += `<tr>
      <td class="cb-no">${c.cb_no}</td>
      <td class="cb-desc">${escapeHtml(c.description)}</td>
      <td class="cb-amp">${escapeHtml(c.amp_rating)}</td>
    </tr>`;
  }
  // Fill remaining empty rows to maintain layout
  for (let i = circuits.length; i < end; i++) {
    rows += `<tr><td class="cb-no">${start + (i - start) + 1}</td><td class="cb-desc"></td><td class="cb-amp"></td></tr>`;
  }
  return rows;
}

function generateHTML(card: any, req: LegendCardPdfRequest): string {
  const allCircuits: Circuit[] = card.circuits || [];
  const contactors: Contactor[] = card.contactors || [];
  const isA5 = req.pageSize === 'A5';

  // A5: truncate to 50 circuits, split 1-25 / 26-50
  // A4: show all circuits, split evenly
  const circuits = isA5 ? allCircuits.slice(0, 50) : allCircuits;
  const half = isA5 ? 25 : Math.max(Math.ceil(circuits.length / 2), 25);

  // A5 uses smaller fonts and tighter spacing
  const bodyFontSize = isA5 ? '6.5pt' : '8pt';
  const tableFontSize = isA5 ? '6pt' : '7pt';
  const titleFontSize = isA5 ? '10pt' : '14pt';
  const sectionFontSize = isA5 ? '7pt' : '9pt';
  const fieldLabelSize = isA5 ? '6pt' : '7pt';
  const fieldValueSize = isA5 ? '6.5pt' : '8pt';
  const headerPadding = isA5 ? '5px 8px' : '8px 14px';
  const contentPadding = isA5 ? '6px 0' : '10px 0';

  const coverPage = generateStandardCoverPage({
    reportTitle: 'DB LEGEND CARD',
    reportSubtitle: `Distribution Board Schedule — ${escapeHtml(card.db_name || '')}`,
    projectName: req.projectName || '',
    projectNumber: req.projectNumber,
    companyLogoUrl: req.companyLogoBase64,
    contactName: req.contactName,
    contactOrganization: req.contactOrganization,
    contactEmail: req.contactEmail,
  });

  const contactorRows = contactors.map((c, i) => `
    <tr>
      <td class="cont-label">C${i + 1}</td>
      <td>${escapeHtml(c.amps)}</td>
      <td>${escapeHtml(c.controlling)}</td>
      <td>${escapeHtml(c.kw)}</td>
      <td>${escapeHtml(c.coil)}</td>
      <td>${escapeHtml(c.poles)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  ${getStandardCoverPageCSS()}
  ${getStandardCSS()}

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: ${bodyFontSize};
    color: #1a1a2e;
    line-height: 1.3;
  }

  .content { padding: ${contentPadding}; }

  .header-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${isA5 ? '4px' : '8px'};
    margin-bottom: ${isA5 ? '6px' : '12px'};
  }
  .header-grid .field {
    display: flex;
    align-items: center;
    gap: 4px;
    border-bottom: 1px solid #e2e8f0;
    padding: ${isA5 ? '2px 0' : '3px 0'};
  }
  .header-grid .field-label {
    font-weight: 700;
    font-size: ${fieldLabelSize};
    color: #475569;
    white-space: nowrap;
    min-width: ${isA5 ? '60px' : '80px'};
  }
  .header-grid .field-value {
    font-size: ${fieldValueSize};
  }

  .section-title {
    background: #1e3a5f;
    color: white;
    padding: ${isA5 ? '3px 8px' : '5px 10px'};
    font-size: ${sectionFontSize};
    font-weight: 700;
    letter-spacing: 0.5px;
    margin: ${isA5 ? '6px 0 4px' : '12px 0 8px'};
  }

  .section-info {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: ${isA5 ? '4px' : '6px'};
    margin-bottom: ${isA5 ? '6px' : '12px'};
  }
  .section-info .field { border-bottom: 1px solid #e2e8f0; padding: 3px 0; }

  /* Circuit table */
  .circuit-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${isA5 ? '6px' : '12px'};
  }
  .circuit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${tableFontSize};
  }
  .circuit-table th {
    background: #334155;
    color: white;
    padding: ${isA5 ? '2px 4px' : '4px 6px'};
    text-align: left;
    font-size: ${tableFontSize};
    font-weight: 600;
  }
  .circuit-table td {
    border: 1px solid #cbd5e1;
    padding: ${isA5 ? '1px 4px' : '2px 6px'};
    font-size: ${tableFontSize};
  }
  .cb-no { width: ${isA5 ? '30px' : '40px'}; text-align: center; font-weight: 600; color: #475569; }
  .cb-desc { }
  .cb-amp { width: ${isA5 ? '35px' : '45px'}; text-align: center; }
  .circuit-table tr:nth-child(even) { background: #f8fafc; }

  /* Contactor table */
  .contactor-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${tableFontSize};
    margin-top: 4px;
  }
  .contactor-table th {
    background: #334155;
    color: white;
    padding: ${isA5 ? '2px 4px' : '4px 6px'};
    text-align: left;
    font-size: ${tableFontSize};
  }
  .contactor-table td {
    border: 1px solid #cbd5e1;
    padding: ${isA5 ? '2px 4px' : '3px 6px'};
    font-size: ${tableFontSize};
  }
  .cont-label { font-weight: 700; width: ${isA5 ? '30px' : '40px'}; text-align: center; color: #1e3a5f; }

  .db-title-bar {
    background: linear-gradient(135deg, #1e3a5f, #3b82f6);
    color: white;
    padding: ${headerPadding};
    font-size: ${titleFontSize};
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: ${isA5 ? '6px' : '12px'};
    border-radius: 2px;
  }
</style>
</head>
<body>

${coverPage}

<div class="content">
  <div class="db-title-bar">${escapeHtml(card.db_name || 'DISTRIBUTION BOARD')}</div>

  <div class="header-grid">
    <div class="field"><span class="field-label">Address:</span><span class="field-value">${escapeHtml(card.address || '')}</span></div>
    <div class="field"><span class="field-label">Date:</span><span class="field-value">${escapeHtml(card.card_date || '')}</span></div>
    <div class="field"><span class="field-label">Phone:</span><span class="field-value">${escapeHtml(card.phone || '')}</span></div>
    <div class="field"><span class="field-label">Email:</span><span class="field-value">${escapeHtml(card.email || '')}</span></div>
    <div class="field"><span class="field-label">Tel Number:</span><span class="field-value">${escapeHtml(card.tel_number || '')}</span></div>
    <div class="field"><span class="field-label">DOL Reg No:</span><span class="field-value">${escapeHtml(card.dol_reg_no || '')}</span></div>
    <div class="field"><span class="field-label">COC No:</span><span class="field-value">${escapeHtml(card.coc_no || '')}</span></div>
    <div class="field"><span class="field-label">Addendum No:</span><span class="field-value">${escapeHtml(card.addendum_no || '')}</span></div>
  </div>

  <div class="section-title">${escapeHtml(card.section_name || 'CIRCUIT SCHEDULE')}</div>

  <div class="section-info">
    <div class="field"><span class="field-label">Fed From:</span><span class="field-value">${escapeHtml(card.fed_from || '')}</span></div>
    <div class="field"><span class="field-label">Feeding Breaker:</span><span class="field-value">${escapeHtml(card.feeding_breaker_id || '')}</span></div>
    <div class="field" style="grid-column: span 2;"><span class="field-label">System/Cabling:</span><span class="field-value">${escapeHtml(card.feeding_system_info || '')}</span></div>
  </div>

  <div class="circuit-wrapper">
    <table class="circuit-table">
      <thead>
        <tr><th>CB#</th><th>Description</th><th>Amps</th></tr>
      </thead>
      <tbody>
        ${generateCircuitRows(circuits, 0, half)}
      </tbody>
    </table>
    <table class="circuit-table">
      <thead>
        <tr><th>CB#</th><th>Description</th><th>Amps</th></tr>
      </thead>
      <tbody>
        ${generateCircuitRows(circuits, half, half * 2)}
      </tbody>
    </table>
  </div>

  ${contactors.length > 0 ? `
    <div class="section-title">CONTACTOR DETAILS</div>
    <table class="contactor-table">
      <thead>
        <tr><th></th><th>Amps</th><th>Controlling</th><th>KW</th><th>Coil</th><th>Poles</th></tr>
      </thead>
      <tbody>${contactorRows}</tbody>
    </table>
  ` : ''}
</div>

</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[LegendCardPDF] Starting generation...');
    
    const pdfShiftApiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (!pdfShiftApiKey) {
      return new Response(
        JSON.stringify({ error: 'PDF generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: LegendCardPdfRequest = await req.json();
    console.log('[LegendCardPDF] Card ID:', requestData.cardId);

    // Fetch card data from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: card, error: fetchError } = await supabase
      .from('db_legend_cards')
      .select('*')
      .eq('id', requestData.cardId)
      .single();

    if (fetchError || !card) {
      console.error('[LegendCardPDF] Card not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Legend card not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate HTML
    const html = generateHTML(card, requestData);
    console.log('[LegendCardPDF] HTML generated, length:', html.length);

    // Call PDFShift
    const pageSize = requestData.pageSize || 'A4';
    const pdfPayload = buildPDFShiftPayload(html, {
      reportTitle: `DB Legend Card — ${card.db_name || ''}`,
      projectName: requestData.projectName || '',
      format: pageSize,
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
      console.error('[LegendCardPDF] PDFShift error:', pdfShiftResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `PDF generation failed: ${pdfShiftResponse.status}`, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    console.log('[LegendCardPDF] PDF generated:', pdfBuffer.byteLength, 'bytes');

    // Determine next revision
    const { data: existingReports } = await supabase
      .from('legend_card_reports')
      .select('revision')
      .eq('card_id', requestData.cardId)
      .order('created_at', { ascending: false })
      .limit(1);

    let revNum = 1;
    if (existingReports && existingReports.length > 0) {
      const lastRev = existingReports[0].revision;
      const match = lastRev.match(/R(\d+)/);
      if (match) revNum = parseInt(match[1]) + 1;
    }
    const revision = `R${String(revNum).padStart(2, '0')}`;

    // Upload to storage with revision in path
    const filePath = `${requestData.cardId}/${revision}_${requestData.filename}`;
    const { error: uploadError } = await supabase.storage
      .from('legend-card-reports')
      .upload(filePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[LegendCardPDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save PDF', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save report record
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    const { error: insertError } = await supabase
      .from('legend_card_reports')
      .insert({
        card_id: requestData.cardId,
        project_id: card.project_id,
        report_name: card.db_name || 'Legend Card',
        revision,
        file_path: filePath,
        file_size: pdfBuffer.byteLength,
        generated_by: userId,
        notes: requestData.notes || null,
      });

    if (insertError) {
      console.error('[LegendCardPDF] Report record error:', insertError);
    }

    console.log('[LegendCardPDF] PDF saved successfully, revision:', revision);
    return new Response(
      JSON.stringify({ success: true, filePath, fileSize: pdfBuffer.byteLength, revision }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LegendCardPDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
