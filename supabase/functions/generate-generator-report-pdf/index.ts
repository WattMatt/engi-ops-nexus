import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { buildPDFShiftPayload } from "../_shared/pdfStandards.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY");

// Generator sizing table for fuel consumption calculations
const GENERATOR_SIZING_TABLE = [
  { rating: '15kVA', kva: 15, load25: 2.5, load50: 4.0, load75: 5.5, load100: 7.0 },
  { rating: '20kVA', kva: 20, load25: 3.0, load50: 5.0, load75: 7.0, load100: 9.0 },
  { rating: '30kVA', kva: 30, load25: 4.0, load50: 6.5, load75: 9.0, load100: 11.5 },
  { rating: '40kVA', kva: 40, load25: 5.0, load50: 8.0, load75: 11.0, load100: 14.0 },
  { rating: '50kVA', kva: 50, load25: 6.0, load50: 9.5, load75: 13.0, load100: 16.5 },
  { rating: '60kVA', kva: 60, load25: 7.0, load50: 11.0, load75: 15.0, load100: 19.0 },
  { rating: '80kVA', kva: 80, load25: 9.0, load50: 14.0, load75: 19.0, load100: 24.0 },
  { rating: '100kVA', kva: 100, load25: 10.5, load50: 17.0, load75: 23.5, load100: 30.0 },
  { rating: '125kVA', kva: 125, load25: 12.5, load50: 20.5, load75: 28.5, load100: 36.5 },
  { rating: '150kVA', kva: 150, load25: 14.5, load50: 24.0, load75: 33.5, load100: 43.0 },
  { rating: '200kVA', kva: 200, load25: 18.5, load50: 31.0, load75: 43.5, load100: 56.0 },
  { rating: '250kVA', kva: 250, load25: 22.5, load50: 38.0, load75: 53.5, load100: 69.0 },
  { rating: '300kVA', kva: 300, load25: 26.5, load50: 45.0, load75: 63.5, load100: 82.0 },
  { rating: '350kVA', kva: 350, load25: 30.5, load50: 52.0, load75: 73.5, load100: 95.0 },
  { rating: '400kVA', kva: 400, load25: 34.0, load50: 58.0, load75: 82.0, load100: 106.0 },
  { rating: '500kVA', kva: 500, load25: 42.0, load50: 72.0, load75: 102.0, load100: 132.0 },
  { rating: '600kVA', kva: 600, load25: 50.0, load50: 86.0, load75: 122.0, load100: 158.0 },
  { rating: '750kVA', kva: 750, load25: 62.0, load50: 107.0, load75: 152.0, load100: 197.0 },
  { rating: '800kVA', kva: 800, load25: 66.0, load50: 114.0, load75: 162.0, load100: 210.0 },
  { rating: '1000kVA', kva: 1000, load25: 82.0, load50: 142.0, load75: 202.0, load100: 262.0 },
  { rating: '1250kVA', kva: 1250, load25: 102.0, load50: 177.0, load75: 252.0, load100: 327.0 },
  { rating: '1500kVA', kva: 1500, load25: 122.0, load50: 212.0, load75: 302.0, load100: 392.0 },
  { rating: '2000kVA', kva: 2000, load25: 162.0, load50: 282.0, load75: 402.0, load100: 522.0 },
];

function getFuelConsumption(generatorSize: string, loadPercentage: number): number {
  const sizingData = GENERATOR_SIZING_TABLE.find(g => g.rating === generatorSize);
  if (!sizingData) return 0;

  if (loadPercentage <= 25) return sizingData.load25;
  if (loadPercentage <= 50) {
    const ratio = (loadPercentage - 25) / 25;
    return sizingData.load25 + ratio * (sizingData.load50 - sizingData.load25);
  }
  if (loadPercentage <= 75) {
    const ratio = (loadPercentage - 50) / 25;
    return sizingData.load50 + ratio * (sizingData.load75 - sizingData.load50);
  }
  if (loadPercentage <= 100) {
    const ratio = (loadPercentage - 75) / 25;
    return sizingData.load75 + ratio * (sizingData.load100 - sizingData.load75);
  }
  return sizingData.load100;
}

interface GeneratorReportPDFRequest {
  projectId: string;
  includeCoverPage?: boolean;
  includeExecutiveSummary?: boolean;
  includeTenantSchedule?: boolean;
  includeCapitalRecovery?: boolean;
  includeRunningCosts?: boolean;
  includeCharts?: boolean;
  contactId?: string;
}

interface CompanySettings {
  company_name: string | null;
  company_logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  phone: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[GeneratorReportPDF] Starting...');

    if (!PDFSHIFT_API_KEY) {
      throw new Error('PDFSHIFT_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: GeneratorReportPDFRequest = await req.json();
    const { 
      projectId, 
      includeCoverPage = true, 
      includeExecutiveSummary = true,
      includeTenantSchedule = true,
      includeCapitalRecovery = true,
      includeRunningCosts = true,
      includeCharts = true,
      contactId,
    } = payload;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all required data in parallel
    const [
      projectResult,
      companyResult,
      zonesResult,
      tenantsResult,
      settingsResult,
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('company_settings').select('*').limit(1).maybeSingle(),
      supabase.from('generator_zones').select('*').eq('project_id', projectId).order('display_order'),
      supabase.from('tenants').select('*').eq('project_id', projectId),
      supabase.from('generator_settings').select('*').eq('project_id', projectId).maybeSingle(),
    ]);

    if (projectResult.error || !projectResult.data) {
      throw new Error(`Failed to fetch project: ${projectResult.error?.message || 'Not found'}`);
    }

    const project = projectResult.data;
    const companySettings = companyResult.data as CompanySettings | null;
    const zones = zonesResult.data || [];
    const tenants = (tenantsResult.data || []).sort((a: any, b: any) => {
      const numA = parseInt(a.shop_number?.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.shop_number?.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
    const generatorSettings = settingsResult.data;

    // Fetch zone generators
    const zoneIds = zones.map((z: any) => z.id);
    let zoneGenerators: any[] = [];
    if (zoneIds.length > 0) {
      const { data } = await supabase
        .from('zone_generators')
        .select('*')
        .in('zone_id', zoneIds);
      zoneGenerators = data || [];
    }

    // Fetch running recovery settings
    const { data: runningSettings } = await supabase
      .from('running_recovery_settings')
      .select('*')
      .eq('project_id', projectId);
    const allRunningSettings = runningSettings || [];

    // Fetch contact if provided
    let contactData: any = null;
    if (contactId) {
      const { data } = await supabase
        .from('project_contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();
      contactData = data;
    }

    console.log(`[GeneratorReportPDF] Generating PDF for project ${project.name} with ${zones.length} zones and ${tenants.length} tenants`);

    // Generate HTML content
    const html = generateHTML(
      project,
      companySettings,
      zones,
      zoneGenerators,
      tenants,
      generatorSettings,
      allRunningSettings,
      contactData,
      {
        includeCoverPage,
        includeExecutiveSummary,
        includeTenantSchedule,
        includeCapitalRecovery,
        includeRunningCosts,
        includeCharts,
      }
    );

    // Call PDFShift API
    const pdfPayload = buildPDFShiftPayload(html, {
      reportTitle: 'Generator Financial Evaluation',
      projectName: project.name,
    });

    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${PDFSHIFT_API_KEY}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pdfPayload),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('[GeneratorReportPDF] PDFShift error:', errorText);
      throw new Error(`PDFShift API error: ${pdfResponse.status}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdfBase64 = base64Encode(uint8Array.buffer);

    console.log(`[GeneratorReportPDF] PDF generated: ${pdfBuffer.byteLength} bytes`);

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
    console.error('[GeneratorReportPDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface PDFOptions {
  includeCoverPage: boolean;
  includeExecutiveSummary: boolean;
  includeTenantSchedule: boolean;
  includeCapitalRecovery: boolean;
  includeRunningCosts: boolean;
  includeCharts: boolean;
}

function formatCurrency(value: number): string {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateHTML(
  project: any,
  companySettings: CompanySettings | null,
  zones: any[],
  zoneGenerators: any[],
  tenants: any[],
  generatorSettings: any,
  runningSettings: any[],
  contactData: any,
  options: PDFOptions
): string {
  const reportDate = new Date().toLocaleDateString('en-ZA', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calculate costs
  const totalGeneratorCost = zoneGenerators.reduce((sum, gen) => sum + (Number(gen.generator_cost) || 0), 0);
  const numTenantDBs = tenants.filter((t: any) => !t.own_generator_provided).length;
  const ratePerTenantDB = generatorSettings?.rate_per_tenant_db || 0;
  const tenantDBsCost = numTenantDBs * ratePerTenantDB;
  const numMainBoards = generatorSettings?.num_main_boards || 0;
  const ratePerMainBoard = generatorSettings?.rate_per_main_board || 0;
  const mainBoardsCost = numMainBoards * ratePerMainBoard;
  const additionalCablingCost = generatorSettings?.additional_cabling_cost || 0;
  const controlWiringCost = generatorSettings?.control_wiring_cost || 0;
  const totalCapitalCost = totalGeneratorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;

  // Capital recovery calculation
  const years = generatorSettings?.capital_recovery_period_years || 10;
  const rate = (generatorSettings?.capital_recovery_rate_percent || 12) / 100;
  const numerator = rate * Math.pow(1 + rate, years);
  const denominator = Math.pow(1 + rate, years) - 1;
  const annualRepayment = totalCapitalCost * (numerator / denominator);
  const monthlyCapitalRepayment = annualRepayment / 12;

  // Calculate tenant loading
  const calculateLoading = (tenant: any): number => {
    if (tenant.own_generator_provided) return 0;
    if (tenant.manual_kw_override !== null && tenant.manual_kw_override !== undefined) {
      return Number(tenant.manual_kw_override);
    }
    if (!tenant.area) return 0;
    const kwPerSqm: Record<string, number> = {
      standard: generatorSettings?.standard_kw_per_sqm || 0.03,
      fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
      restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
      national: generatorSettings?.national_kw_per_sqm || 0.03,
    };
    return tenant.area * (kwPerSqm[tenant.shop_category] || 0.03);
  };

  const totalLoading = tenants.reduce((sum: number, t: any) => sum + calculateLoading(t), 0);

  // Build HTML sections
  let coverPageHtml = '';
  let executiveSummaryHtml = '';
  let tenantScheduleHtml = '';
  let capitalRecoveryHtml = '';
  let runningCostsHtml = '';

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
          
          <h1 class="cover-title">GENERATOR FINANCIAL EVALUATION</h1>
          <p class="cover-subtitle">Centre Standby Plant Analysis</p>
          
          <h2 class="cover-project">${project.name}</h2>
          <p class="cover-number">${project.project_number || ''}</p>
          
          <div class="cover-details">
            <div class="cover-section">
              <h3>PREPARED FOR:</h3>
              ${contactData ? `
                <p>${contactData.organization_name || ''}</p>
                <p>${contactData.contact_person_name || ''}</p>
                ${contactData.phone ? `<p>Tel: ${contactData.phone}</p>` : ''}
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

  // ===== EXECUTIVE SUMMARY =====
  if (options.includeExecutiveSummary) {
    const equipmentRows = zones.map((zone: any, index: number) => {
      const gens = zoneGenerators.filter((g: any) => g.zone_id === zone.id);
      const zoneCost = gens.reduce((sum: number, g: any) => sum + (Number(g.generator_cost) || 0), 0);
      return `
        <tr class="zone-row" style="--zone-color: ${zone.zone_color || '#3b82f6'}">
          <td>${index + 1}</td>
          <td><strong>${zone.zone_name}</strong> ${gens.length > 1 ? `(${gens.length} Generators)` : ''}</td>
          <td class="text-center">${gens.length}</td>
          <td class="text-right">${formatCurrency(zoneCost)}</td>
        </tr>
      `;
    }).join('');

    executiveSummaryHtml = `
      <div class="page">
        <div class="page-header">
          <h2>Executive Summary</h2>
          <p class="header-subtitle">${project.name} - Standby System</p>
        </div>
        
        <h3 class="section-title">Generator Equipment Costing</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px;">Item</th>
              <th>Description</th>
              <th class="text-center" style="width: 80px;">Qty</th>
              <th class="text-right" style="width: 120px;">Cost (excl. VAT)</th>
            </tr>
          </thead>
          <tbody>
            ${equipmentRows}
            <tr>
              <td>${zones.length + 1}</td>
              <td>Tenant Distribution Boards</td>
              <td class="text-center">${numTenantDBs}</td>
              <td class="text-right">${formatCurrency(tenantDBsCost)}</td>
            </tr>
            <tr>
              <td>${zones.length + 2}</td>
              <td>Main Boards</td>
              <td class="text-center">${numMainBoards}</td>
              <td class="text-right">${formatCurrency(mainBoardsCost)}</td>
            </tr>
            <tr>
              <td>${zones.length + 3}</td>
              <td>Additional Cabling</td>
              <td class="text-center">1</td>
              <td class="text-right">${formatCurrency(additionalCablingCost)}</td>
            </tr>
            <tr>
              <td>${zones.length + 4}</td>
              <td>Control Wiring</td>
              <td class="text-center">1</td>
              <td class="text-right">${formatCurrency(controlWiringCost)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3"><strong>TOTAL CAPITAL COST</strong></td>
              <td class="text-right"><strong>${formatCurrency(totalCapitalCost)}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-label">Total Zones</div>
            <div class="card-value">${zones.length}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Total Generators</div>
            <div class="card-value">${zoneGenerators.length}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Total Loading</div>
            <div class="card-value">${totalLoading.toFixed(1)} kW</div>
          </div>
          <div class="summary-card accent">
            <div class="card-label">Monthly Recovery</div>
            <div class="card-value">${formatCurrency(monthlyCapitalRepayment)}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ===== TENANT SCHEDULE =====
  if (options.includeTenantSchedule) {
    const tenantRows = tenants.map((tenant: any) => {
      const loading = calculateLoading(tenant);
      const portionOfLoad = totalLoading > 0 ? (loading / totalLoading) * 100 : 0;
      const monthlyRental = (portionOfLoad / 100) * monthlyCapitalRepayment;
      const rentalPerSqm = tenant.area && tenant.area > 0 ? monthlyRental / tenant.area : 0;
      const isOwnGen = tenant.own_generator_provided || false;
      const zone = zones.find((z: any) => z.id === tenant.generator_zone_id);

      return `
        <tr${isOwnGen ? ' class="own-gen"' : ''}>
          <td>${tenant.shop_number || '-'}</td>
          <td>${tenant.shop_name || '-'}</td>
          <td class="text-right">${tenant.area?.toLocaleString() || '-'}</td>
          <td class="text-center">${isOwnGen ? '<span class="badge-yes">YES</span>' : 'NO'}</td>
          <td${zone ? ` style="border-left: 3px solid ${zone.zone_color || '#3b82f6'}"` : ''}>${zone?.zone_name || '-'}</td>
          <td class="text-right">${isOwnGen ? '-' : loading.toFixed(2)}</td>
          <td class="text-right">${isOwnGen ? '-' : `${portionOfLoad.toFixed(2)}%`}</td>
          <td class="text-right">${isOwnGen ? '-' : formatCurrency(monthlyRental)}</td>
          <td class="text-right">${isOwnGen ? '-' : formatCurrency(rentalPerSqm)}</td>
        </tr>
      `;
    }).join('');

    tenantScheduleHtml = `
      <div class="page" style="page-break-before: always;">
        <div class="page-header">
          <h2>Tenant Loading Schedule</h2>
          <p class="header-subtitle">Sizing and Allowances</p>
        </div>
        
        <table class="data-table compact">
          <thead>
            <tr>
              <th>Shop #</th>
              <th>Tenant</th>
              <th class="text-right">Area (m²)</th>
              <th class="text-center">Own Gen</th>
              <th>Zone</th>
              <th class="text-right">Loading (kW)</th>
              <th class="text-right">% of Load</th>
              <th class="text-right">Monthly Rental</th>
              <th class="text-right">R/m²</th>
            </tr>
          </thead>
          <tbody>
            ${tenantRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="5"><strong>TOTALS</strong></td>
              <td class="text-right"><strong>${totalLoading.toFixed(2)} kW</strong></td>
              <td class="text-right"><strong>100%</strong></td>
              <td class="text-right"><strong>${formatCurrency(monthlyCapitalRepayment)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  // ===== CAPITAL RECOVERY =====
  if (options.includeCapitalRecovery) {
    // Generate amortization schedule
    let balance = totalCapitalCost;
    const scheduleRows: string[] = [];
    for (let year = 1; year <= years; year++) {
      const interest = balance * rate;
      const principal = annualRepayment - interest;
      balance = Math.max(0, balance - principal);
      scheduleRows.push(`
        <tr>
          <td class="text-center">${year}</td>
          <td class="text-right">${formatCurrency(annualRepayment)}</td>
          <td class="text-right">${formatCurrency(interest)}</td>
          <td class="text-right">${formatCurrency(principal)}</td>
          <td class="text-right">${formatCurrency(balance)}</td>
        </tr>
      `);
    }

    capitalRecoveryHtml = `
      <div class="page" style="page-break-before: always;">
        <div class="page-header">
          <h2>Capital Recovery Calculator</h2>
          <p class="header-subtitle">Amortization Schedule</p>
        </div>
        
        <div class="input-params">
          <div class="param">
            <span class="param-label">Capital Cost:</span>
            <span class="param-value">${formatCurrency(totalCapitalCost)}</span>
          </div>
          <div class="param">
            <span class="param-label">Recovery Period:</span>
            <span class="param-value">${years} years</span>
          </div>
          <div class="param">
            <span class="param-label">Interest Rate:</span>
            <span class="param-value">${(rate * 100).toFixed(1)}%</span>
          </div>
          <div class="param highlight">
            <span class="param-label">Monthly Payment:</span>
            <span class="param-value">${formatCurrency(monthlyCapitalRepayment)}</span>
          </div>
        </div>
        
        <table class="data-table">
          <thead>
            <tr>
              <th class="text-center">Year</th>
              <th class="text-right">Annual Payment</th>
              <th class="text-right">Interest</th>
              <th class="text-right">Principal</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows.join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ===== RUNNING COSTS =====
  if (options.includeRunningCosts && runningSettings.length > 0) {
    const runningCostRows = zones.map((zone: any) => {
      const gens = zoneGenerators.filter((g: any) => g.zone_id === zone.id);
      const settings = runningSettings.find((s: any) => s.zone_id === zone.id);
      const zoneLoading = tenants
        .filter((t: any) => t.generator_zone_id === zone.id && !t.own_generator_provided)
        .reduce((sum: number, t: any) => sum + calculateLoading(t), 0);

      if (!settings) return '';

      const genSize = gens[0]?.generator_size || '100kVA';
      const kva = parseInt(genSize.replace('kVA', '')) || 100;
      const loadPercent = kva > 0 ? (zoneLoading / (kva * 0.8)) * 100 : 0;
      const fuelRate = getFuelConsumption(genSize, loadPercent);
      const hoursPerMonth = settings.estimated_hours_per_month || 8;
      const fuelCostPerLiter = settings.fuel_cost_per_liter || 25;
      const monthlyFuelCost = fuelRate * hoursPerMonth * fuelCostPerLiter;
      const monthlyServicing = settings.servicing_cost_per_month || 0;
      const totalMonthly = monthlyFuelCost + monthlyServicing;

      return `
        <tr>
          <td style="border-left: 4px solid ${zone.zone_color || '#3b82f6'}"><strong>${zone.zone_name}</strong></td>
          <td class="text-center">${genSize}</td>
          <td class="text-right">${zoneLoading.toFixed(1)} kW</td>
          <td class="text-right">${loadPercent.toFixed(0)}%</td>
          <td class="text-right">${fuelRate.toFixed(1)} L/hr</td>
          <td class="text-right">${hoursPerMonth} hrs</td>
          <td class="text-right">${formatCurrency(monthlyFuelCost)}</td>
          <td class="text-right">${formatCurrency(monthlyServicing)}</td>
          <td class="text-right"><strong>${formatCurrency(totalMonthly)}</strong></td>
        </tr>
      `;
    }).filter(Boolean).join('');

    if (runningCostRows) {
      runningCostsHtml = `
        <div class="page" style="page-break-before: always;">
          <div class="page-header">
            <h2>Running Cost Analysis</h2>
            <p class="header-subtitle">Monthly Operating Expenses per Zone</p>
          </div>
          
          <table class="data-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th class="text-center">Generator</th>
                <th class="text-right">Loading</th>
                <th class="text-right">Load %</th>
                <th class="text-right">Fuel Rate</th>
                <th class="text-right">Hours/Month</th>
                <th class="text-right">Fuel Cost</th>
                <th class="text-right">Servicing</th>
                <th class="text-right">Total/Month</th>
              </tr>
            </thead>
            <tbody>
              ${runningCostRows}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // ===== FULL HTML DOCUMENT =====
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Generator Financial Evaluation - ${project.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    /* PDF Standards: table integrity */
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    
    body {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      line-height: 1.5;
      color: #1f2937;
    }
    
    @page {
      size: A4;
      margin: 0;
    }
    
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: white;
      page-break-after: always;
    }
    
    .cover-gradient-bar {
      position: absolute;
      left: 0;
      top: 0;
      width: 8px;
      height: 100vh;
      background: linear-gradient(180deg, #f59e0b 0%, #ef4444 100%);
    }
    
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 50px 60px;
    }
    
    .cover-logo {
      max-height: 60px;
      max-width: 180px;
      margin-bottom: 40px;
    }
    
    .cover-divider {
      width: 80px;
      height: 4px;
      background: #f59e0b;
      margin-bottom: 30px;
    }
    
    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      font-weight: 300;
      opacity: 0.9;
      margin-bottom: 40px;
    }
    
    .cover-project {
      font-size: 20pt;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .cover-number {
      font-size: 12pt;
      opacity: 0.8;
      margin-bottom: 50px;
    }
    
    .cover-details {
      display: flex;
      gap: 60px;
    }
    
    .cover-section h3 {
      font-size: 9pt;
      font-weight: 600;
      opacity: 0.7;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    
    .cover-section p {
      font-size: 10pt;
      margin-bottom: 3px;
    }
    
    .cover-footer {
      padding: 20px 60px;
      font-size: 10pt;
      opacity: 0.8;
    }
    
    /* Content Pages */
    .page {
      padding: 40px 50px;
      min-height: calc(100vh - 80px);
    }
    
    .page-header {
      margin-bottom: 30px;
      border-bottom: 2px solid #1e3a5f;
      padding-bottom: 15px;
    }
    
    .page-header h2 {
      font-size: 18pt;
      font-weight: 600;
      color: #1e3a5f;
    }
    
    .header-subtitle {
      font-size: 10pt;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: 600;
      color: #374151;
      margin: 20px 0 15px 0;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 8pt;
    }
    
    .data-table th {
      background: #1e3a5f;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 500;
      font-size: 8pt;
    }
    
    .data-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .data-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .data-table.compact td {
      padding: 4px 8px;
      font-size: 7pt;
    }
    
    .data-table.compact th {
      padding: 6px 8px;
      font-size: 7pt;
    }
    
    .total-row {
      background: #dbeafe !important;
      font-weight: 600;
    }
    
    .total-row td {
      border-top: 2px solid #1e3a5f;
      padding: 10px;
    }
    
    .zone-row td:first-child {
      border-left: 4px solid var(--zone-color, #3b82f6);
    }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    
    .own-gen {
      background: #fef3c7 !important;
      opacity: 0.8;
    }
    
    .badge-yes {
      background: #10b981;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 7pt;
      font-weight: 600;
    }
    
    .summary-cards {
      display: flex;
      gap: 15px;
      margin-top: 30px;
    }
    
    .summary-card {
      flex: 1;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .summary-card.accent {
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      border-color: #1e40af;
      color: white;
    }
    
    .card-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
      margin-bottom: 5px;
    }
    
    .card-value {
      font-size: 16pt;
      font-weight: 700;
    }
    
    .input-params {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 25px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
    }
    
    .param {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .param.highlight {
      background: #1e3a5f;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      margin-left: auto;
    }
    
    .param-label {
      font-size: 8pt;
      color: #6b7280;
    }
    
    .param.highlight .param-label {
      color: rgba(255,255,255,0.8);
    }
    
    .param-value {
      font-size: 11pt;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${coverPageHtml}
  ${executiveSummaryHtml}
  ${tenantScheduleHtml}
  ${capitalRecoveryHtml}
  ${runningCostsHtml}
</body>
</html>
  `;
}
