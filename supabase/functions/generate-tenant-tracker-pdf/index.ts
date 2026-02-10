import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY");

interface Tenant {
  id: string;
  shop_name: string | null;
  shop_number: string | null;
  shop_category: string | null;
  area: number | null;
  db_size_allowance: string | null;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  cost_reported: boolean;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
  project_logo_url: string | null;
  client_logo_url: string | null;
}

interface CompanySettings {
  company_name: string | null;
  company_logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  phone: string | null;
}

interface PDFRequest {
  projectId: string;
  includeCoverPage?: boolean;
  includeKpiPage?: boolean;
  includeTenantSchedule?: boolean;
  contactId?: string;
  excludedTenantIds?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[GenerateTenantTrackerPDF] Starting...');

    if (!PDFSHIFT_API_KEY) {
      throw new Error('PDFSHIFT_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PDFRequest = await req.json();
    const { 
      projectId, 
      includeCoverPage = true, 
      includeKpiPage = true, 
      includeTenantSchedule = true,
      contactId,
      excludedTenantIds = []
    } = payload;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to fetch project: ${projectError?.message || 'Not found'}`);
    }

    const projectData = project as Project;

    // Fetch company settings
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    // Fetch contact if provided
    let contactData: { contact_person_name?: string; organization_name?: string; phone?: string; email?: string } | null = null;
    if (contactId) {
      const { data: contact } = await supabase
        .from('project_contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();
      contactData = contact;
    }

    // Fetch tenant data
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, shop_name, shop_number, shop_category, area, db_size_allowance, sow_received, layout_received, db_ordered, db_cost, lighting_ordered, lighting_cost, cost_reported')
      .eq('project_id', projectId)
      .order('shop_number', { ascending: true });

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    // Filter excluded tenants
    const filteredTenants = ((tenants || []) as Tenant[]).filter(
      t => !excludedTenantIds.includes(t.id)
    );

    console.log(`[GenerateTenantTrackerPDF] Generating PDF for ${filteredTenants.length} tenants`);

    // Generate HTML content
    const html = generateHTML(
      projectData,
      filteredTenants,
      companySettings as CompanySettings | null,
      contactData,
      { includeCoverPage, includeKpiPage, includeTenantSchedule }
    );

    // Call PDFShift API
    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${PDFSHIFT_API_KEY}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        format: 'A4',
        use_print: true,
        margin: {
          top: '25mm',
          right: '15mm',
          bottom: '22mm',
          left: '15mm',
        },
        displayHeaderFooter: true,
        headerTemplate: `<div style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 15mm;display:flex;justify-content:space-between;align-items:center;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;"><span style="font-weight:600;color:#374151;">Tenant Tracker Report</span><span>${projectData.name}</span></div>`,
        footerTemplate: `<div style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 15mm;display:flex;justify-content:space-between;align-items:center;color:#94a3b8;border-top:1px solid #e5e7eb;padding-top:4px;"><span>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      }),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('[GenerateTenantTrackerPDF] PDFShift error:', errorText);
      throw new Error(`PDFShift API error: ${pdfResponse.status}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    // Convert ArrayBuffer to base64 safely for Deno
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdfBase64 = base64Encode(uint8Array.buffer);

    console.log(`[GenerateTenantTrackerPDF] PDF generated: ${pdfBuffer.byteLength} bytes`);

    return new Response(
      JSON.stringify({
        success: true,
        pdf: pdfBase64,
        fileSize: pdfBuffer.byteLength,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GenerateTenantTrackerPDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getCategoryLabel(category: string | null): string {
  const labels: Record<string, string> = {
    standard: "Standard",
    fast_food: "Fast Food",
    restaurant: "Restaurant",
    national: "National"
  };
  return category ? labels[category] || category : '-';
}

function getCategoryColor(category: string | null): string {
  const colors: Record<string, string> = {
    standard: "#3b82f6",
    fast_food: "#ef4444",
    restaurant: "#22c55e",
    national: "#a855f7"
  };
  return category ? colors[category] || "#64748b" : "#64748b";
}

interface PDFOptions {
  includeCoverPage: boolean;
  includeKpiPage: boolean;
  includeTenantSchedule: boolean;
}

function generateHTML(
  project: Project,
  tenants: Tenant[],
  companySettings: CompanySettings | null,
  contactData: { contact_person_name?: string; organization_name?: string; phone?: string; email?: string } | null,
  options: PDFOptions
): string {
  const reportDate = new Date().toLocaleDateString('en-ZA', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calculate statistics
  const totalTenants = tenants.length;
  const totalArea = tenants.reduce((sum, t) => sum + (t.area || 0), 0);
  const totalDbCost = tenants.reduce((sum, t) => sum + (t.db_cost || 0), 0);
  const totalLightingCost = tenants.reduce((sum, t) => sum + (t.lighting_cost || 0), 0);
  const totalCost = totalDbCost + totalLightingCost;

  const sowReceived = tenants.filter(t => t.sow_received).length;
  const layoutReceived = tenants.filter(t => t.layout_received).length;
  const dbOrdered = tenants.filter(t => t.db_ordered).length;
  const lightingOrdered = tenants.filter(t => t.lighting_ordered).length;
  const costReported = tenants.filter(t => t.cost_reported).length;

  const overallProgress = totalTenants > 0 
    ? Math.round((sowReceived + layoutReceived + dbOrdered + lightingOrdered) / (totalTenants * 4) * 100)
    : 0;

  // Category distribution
  const categoryCounts: Record<string, number> = {};
  tenants.forEach(t => {
    const cat = t.shop_category || 'unknown';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Build HTML sections
  let coverPageHtml = '';
  let kpiPageHtml = '';
  let schedulePageHtml = '';

  // ===== COVER PAGE =====
  if (options.includeCoverPage) {
    coverPageHtml = `
      <div class="cover-page">
        <div class="cover-gradient-bar"></div>
        <div class="cover-content">
          ${companySettings?.company_logo_url ? `
            <img src="${companySettings.company_logo_url}" class="cover-logo" alt="Company Logo" />
          ` : ''}
          
          <div class="cover-divider"></div>
          
          <h1 class="cover-title">TENANT TRACKER REPORT</h1>
          <p class="cover-subtitle">Tenant Schedule & Progress Analysis</p>
          
          <h2 class="cover-project">${project.name}</h2>
          <p class="cover-number">${project.project_number}</p>
          
          <div class="cover-details">
            <div class="cover-section">
              <h3>PREPARED FOR:</h3>
              ${contactData ? `
                <p>${contactData.organization_name || ''}</p>
                <p>${contactData.contact_person_name || ''}</p>
                ${contactData.phone ? `<p>Tel: ${contactData.phone}</p>` : ''}
                ${contactData.email ? `<p>${contactData.email}</p>` : ''}
              ` : '<p>-</p>'}
            </div>
            <div class="cover-section">
              <h3>PREPARED BY:</h3>
              <p>${companySettings?.company_name || 'Watson Mattheus Engineering'}</p>
              ${companySettings?.address_line1 ? `<p>${companySettings.address_line1}</p>` : ''}
              ${companySettings?.phone ? `<p>Tel: ${companySettings.phone}</p>` : ''}
            </div>
          </div>
          
          <div class="cover-footer">
            <span>Date: ${reportDate}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ===== KPI PAGE =====
  if (options.includeKpiPage) {
    const categoryDonutSegments = Object.entries(categoryCounts).map(([cat, count], index, arr) => {
      const percentage = (count / totalTenants) * 100;
      const prevPercentages = arr.slice(0, index).reduce((sum, [, c]) => sum + (c / totalTenants) * 100, 0);
      return { cat, count, percentage, offset: prevPercentages };
    });

    kpiPageHtml = `
      <div class="kpi-page">
        <div class="page-header">
          <h2>Project Overview</h2>
          <p class="header-subtitle">Key Performance Indicators & Progress Metrics</p>
        </div>
        
        <!-- KPI Cards Row -->
        <div class="kpi-cards">
          <div class="kpi-card">
            <div class="kpi-accent" style="background: #3b82f6;"></div>
            <div class="kpi-value">${totalTenants}</div>
            <div class="kpi-label">TOTAL UNITS</div>
            <div class="kpi-sublabel">Active tenants</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-accent" style="background: #22c55e;"></div>
            <div class="kpi-value">${totalArea.toFixed(0)}</div>
            <div class="kpi-label">TOTAL AREA</div>
            <div class="kpi-sublabel">Square meters</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-accent" style="background: #a855f7;"></div>
            <div class="kpi-value">R${(totalCost / 1000).toFixed(0)}k</div>
            <div class="kpi-label">TOTAL COST</div>
            <div class="kpi-sublabel">DB & Lighting</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-accent" style="background: #f97316;"></div>
            <div class="kpi-value">${overallProgress}%</div>
            <div class="kpi-label">COMPLETE</div>
            <div class="kpi-sublabel">Overall progress</div>
          </div>
        </div>
        
        <!-- Two Column Layout -->
        <div class="kpi-columns">
          <!-- Category Distribution -->
          <div class="kpi-column">
            <h3 class="section-title">Category Distribution</h3>
            <div class="donut-container">
              <svg class="donut-chart" viewBox="0 0 100 100">
                ${generateDonutSegments(categoryDonutSegments)}
                <circle cx="50" cy="50" r="28" fill="white"/>
                <text x="50" y="48" class="donut-center-value">${totalTenants}</text>
                <text x="50" y="58" class="donut-center-label">Units</text>
              </svg>
              <div class="donut-legend">
                ${Object.entries(categoryCounts).map(([cat, count]) => `
                  <div class="legend-item">
                    <span class="legend-dot" style="background: ${getCategoryColor(cat)};"></span>
                    <span class="legend-label">${getCategoryLabel(cat)}</span>
                    <span class="legend-value">${count} (${Math.round(count / totalTenants * 100)}%)</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <!-- Task Progress -->
          <div class="kpi-column">
            <h3 class="section-title">Task Progress</h3>
            <div class="progress-list">
              ${generateProgressItem('SOW', 'Scope of Work', sowReceived, totalTenants)}
              ${generateProgressItem('LAY', 'Layout Plans', layoutReceived, totalTenants)}
              ${generateProgressItem('DB', 'DB Orders', dbOrdered, totalTenants)}
              ${generateProgressItem('LGT', 'Lighting Orders', lightingOrdered, totalTenants)}
            </div>
          </div>
        </div>
        
      </div>
    `;
  }

  // ===== TENANT SCHEDULE PAGE =====
  if (options.includeTenantSchedule) {
    const overallCompletion = totalTenants > 0 
      ? ((sowReceived + layoutReceived + dbOrdered + lightingOrdered) / (totalTenants * 4) * 100).toFixed(1)
      : '0';

    schedulePageHtml = `
      <div class="schedule-page">
        <div class="page-header">
          <h2>Tenant Schedule</h2>
        </div>
        
        <!-- Legend -->
        <div class="schedule-legend">
          <div class="legend-box complete"></div>
          <span>= Completed/Received</span>
          <div class="legend-box pending"></div>
          <span>= Pending/Not Received</span>
        </div>
        
        <!-- Summary Box -->
        <div class="summary-box">
          <div class="summary-title">Completion Summary:</div>
          <div class="summary-stats">
            <span>SOW: ${sowReceived}/${totalTenants} (${Math.round(sowReceived / totalTenants * 100)}%)</span>
            <span>Layout: ${layoutReceived}/${totalTenants} (${Math.round(layoutReceived / totalTenants * 100)}%)</span>
            <span>DB Ordered: ${dbOrdered}/${totalTenants} (${Math.round(dbOrdered / totalTenants * 100)}%)</span>
            <span>Lighting: ${lightingOrdered}/${totalTenants} (${Math.round(lightingOrdered / totalTenants * 100)}%)</span>
          </div>
          <div class="summary-badge">${overallCompletion}%<br/><small>Overall</small></div>
        </div>
        
        <!-- Tenant Table -->
        <table class="tenant-table">
          <thead>
            <tr>
              <th>Shop #</th>
              <th>Shop Name</th>
              <th>Category</th>
              <th>Area (m²)</th>
              <th>DB Allow.</th>
              <th>SOW</th>
              <th>Layout</th>
              <th>DB Ord</th>
              <th>Light Ord</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tenants.map((tenant, index) => {
              const checkCount = [tenant.sow_received, tenant.layout_received, tenant.db_ordered, tenant.lighting_ordered].filter(Boolean).length;
              const statusLabel = checkCount === 4 ? 'Complete' : checkCount > 0 ? 'In Progress' : 'Pending';
              const statusClass = checkCount === 4 ? 'status-complete' : checkCount > 0 ? 'status-progress' : 'status-pending';
              const rowClass = index % 2 === 0 ? 'row-even' : 'row-odd';
              
              return `
                <tr class="${rowClass}">
                  <td>${tenant.shop_number || '-'}</td>
                  <td>${tenant.shop_name || '-'}</td>
                  <td>${getCategoryLabel(tenant.shop_category)}</td>
                  <td class="center">${tenant.area?.toFixed(2) || '-'}</td>
                  <td>${tenant.db_size_allowance || '-'}</td>
                  <td class="center">${tenant.sow_received ? '<span class="check-yes">✓</span>' : '<span class="check-no">✗</span>'}</td>
                  <td class="center">${tenant.layout_received ? '<span class="check-yes">✓</span>' : '<span class="check-no">✗</span>'}</td>
                  <td class="center">${tenant.db_ordered ? '<span class="check-yes">✓</span>' : '<span class="check-no">✗</span>'}</td>
                  <td class="center">${tenant.lighting_ordered ? '<span class="check-yes">✓</span>' : '<span class="check-no">✗</span>'}</td>
                  <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
      </div>
    `;
  }

  // ===== FULL HTML DOCUMENT =====
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tenant Tracker Report - ${project.name}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.5;
      color: #1f2937;
      font-size: 10pt;
    }
    
    /* ===== COVER PAGE ===== */
    .cover-page {
      page-break-after: always;
      min-height: 100vh;
      position: relative;
      padding: 40px 50px;
    }
    
    .cover-gradient-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 10px;
      background: linear-gradient(to bottom, #1e3a5f 0%, #3b82f6 100%);
    }
    
    .cover-content {
      text-align: center;
      padding-top: 30px;
    }
    
    .cover-logo {
      max-width: 160px;
      max-height: 70px;
      object-fit: contain;
      margin-bottom: 20px;
    }
    
    .cover-divider {
      width: 100px;
      height: 2px;
      background: #3b82f6;
      margin: 20px auto;
    }
    
    .cover-title {
      font-size: 28pt;
      font-weight: bold;
      color: #1e3a5f;
      margin-bottom: 10px;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      color: #64748b;
      margin-bottom: 40px;
    }
    
    .cover-project {
      font-size: 22pt;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 5px;
    }
    
    .cover-number {
      font-size: 14pt;
      color: #64748b;
      margin-bottom: 60px;
    }
    
    .cover-details {
      display: flex;
      justify-content: space-between;
      text-align: left;
      margin-top: 80px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    
    .cover-section {
      width: 45%;
    }
    
    .cover-section h3 {
      font-size: 10pt;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 8px;
    }
    
    .cover-section p {
      font-size: 9pt;
      color: #374151;
      margin-bottom: 4px;
    }
    
    .cover-footer {
      position: absolute;
      bottom: 30px;
      left: 50px;
      right: 50px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #64748b;
    }
    
    /* ===== KPI PAGE ===== */
    .kpi-page {
      page-break-after: always;
      min-height: 100vh;
      padding: 30px 40px;
      position: relative;
    }
    
    .page-header {
      margin-bottom: 25px;
    }
    
    .page-header h2 {
      font-size: 20pt;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 5px;
    }
    
    .header-subtitle {
      font-size: 10pt;
      color: #64748b;
    }
    
    .kpi-cards {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .kpi-card {
      flex: 1;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      position: relative;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .kpi-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      border-radius: 12px 12px 0 0;
    }
    
    .kpi-value {
      font-size: 24pt;
      font-weight: bold;
      color: #1e293b;
      margin-top: 10px;
    }
    
    .kpi-label {
      font-size: 8pt;
      font-weight: bold;
      color: #475569;
      margin-top: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .kpi-sublabel {
      font-size: 8pt;
      color: #94a3b8;
      margin-top: 2px;
    }
    
    .kpi-columns {
      display: flex;
      gap: 30px;
    }
    
    .kpi-column {
      flex: 1;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #3b82f6;
    }
    
    .donut-container {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .donut-chart {
      width: 120px;
      height: 120px;
    }
    
    .donut-center-value {
      font-size: 18px;
      font-weight: bold;
      fill: #1e293b;
      text-anchor: middle;
    }
    
    .donut-center-label {
      font-size: 8px;
      fill: #64748b;
      text-anchor: middle;
    }
    
    .donut-legend {
      flex: 1;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      font-size: 9pt;
    }
    
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 8px;
    }
    
    .legend-label {
      flex: 1;
      color: #374151;
    }
    
    .legend-value {
      font-weight: bold;
      color: #1e293b;
    }
    
    .progress-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .progress-item {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .progress-icon {
      width: 32px;
      height: 24px;
      background: #e2e8f0;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7pt;
      font-weight: bold;
      color: #475569;
    }
    
    .progress-details {
      flex: 1;
    }
    
    .progress-label {
      font-size: 9pt;
      color: #374151;
      margin-bottom: 4px;
    }
    
    .progress-bar-container {
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    
    .progress-bar {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }
    
    .progress-stats {
      text-align: right;
      min-width: 60px;
    }
    
    .progress-count {
      font-size: 10pt;
      font-weight: bold;
      color: #1e293b;
    }
    
    .progress-percent {
      font-size: 8pt;
      color: #64748b;
    }
    
    /* ===== SCHEDULE PAGE ===== */
    .schedule-page {
      page-break-before: always;
      min-height: 100vh;
      padding: 30px 30px;
      position: relative;
    }
    
    .schedule-legend {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 15px;
      font-size: 9pt;
      color: #64748b;
    }
    
    .legend-box {
      width: 14px;
      height: 14px;
      border-radius: 2px;
      border: 1px solid;
    }
    
    .legend-box.complete {
      background: #22c55e;
      border-color: #22c55e;
    }
    
    .legend-box.pending {
      background: white;
      border-color: #ef4444;
    }
    
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      position: relative;
    }
    
    .summary-title {
      font-weight: bold;
      color: #1e293b;
      margin-right: 20px;
    }
    
    .summary-stats {
      display: flex;
      gap: 20px;
      flex: 1;
      font-size: 9pt;
      color: #374151;
    }
    
    .summary-badge {
      position: absolute;
      right: 15px;
      background: #3b82f6;
      color: white;
      padding: 8px 15px;
      border-radius: 8px;
      font-size: 12pt;
      font-weight: bold;
      text-align: center;
      line-height: 1.2;
    }
    
    .summary-badge small {
      font-size: 8pt;
      font-weight: normal;
    }
    
    .tenant-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    
    .tenant-table th {
      background: #2980b9;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .tenant-table td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    /* PDF Standards: table integrity */
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    
    .tenant-table .center {
      text-align: center;
    }
    
    .row-even {
      background: white;
    }
    
    .row-odd {
      background: #f9fafb;
    }
    
    .check-yes {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: #22c55e;
      color: white;
      border-radius: 3px;
      font-size: 12pt;
      font-weight: bold;
    }
    
    .check-no {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: white;
      color: #ef4444;
      border: 1px solid #ef4444;
      border-radius: 3px;
      font-size: 10pt;
      font-weight: bold;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 500;
      white-space: nowrap;
    }
    
    .status-complete {
      background: #22c55e;
      color: white;
    }
    
    .status-progress {
      background: #3b82f6;
      color: white;
    }
    
    .status-pending {
      background: #f59e0b;
      color: white;
    }
    
    /* .page-footer removed — using PDFShift displayHeaderFooter instead */
  </style>
</head>
<body>
  ${coverPageHtml}
  ${kpiPageHtml}
  ${schedulePageHtml}
</body>
</html>
  `;
}

function generateDonutSegments(segments: { cat: string; count: number; percentage: number; offset: number }[]): string {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  return segments.map(seg => {
    const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((seg.offset / 100) * circumference);
    const color = getCategoryColor(seg.cat);
    
    return `<circle 
      cx="50" cy="50" r="${radius}" 
      fill="none" 
      stroke="${color}" 
      stroke-width="12"
      stroke-dasharray="${strokeDasharray}"
      stroke-dashoffset="${strokeDashoffset}"
      transform="rotate(-90 50 50)"
    />`;
  }).join('');
}

function generateProgressItem(icon: string, label: string, value: number, total: number): string {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  let barColor = '#ef4444';
  if (percentage >= 75) barColor = '#22c55e';
  else if (percentage >= 50) barColor = '#3b82f6';
  else if (percentage >= 25) barColor = '#fbbf24';
  
  return `
    <div class="progress-item">
      <div class="progress-icon">${icon}</div>
      <div class="progress-details">
        <div class="progress-label">${label}</div>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${percentage}%; background: ${barColor};"></div>
        </div>
      </div>
      <div class="progress-stats">
        <div class="progress-count">${value}/${total}</div>
        <div class="progress-percent">${percentage}%</div>
      </div>
    </div>
  `;
}
