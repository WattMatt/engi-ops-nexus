/**
 * Dynamic SVG Builder Compliance Checker
 * 
 * Imports each SVG builder, runs it with mock data, and inspects
 * the output SVG elements for PDF spec compliance markers.
 */

import type { StandardCoverPageData } from './sharedSvgHelpers';

export interface ComplianceCheckResult {
  reportId: string;
  reportName: string;
  passed: boolean;
  timestamp: number;
  duration: number;
  checks: ComplianceCheck[];
  error?: string;
}

export interface ComplianceCheck {
  name: string;
  description: string;
  passed: boolean;
  details?: string;
}

const MOCK_COVER: StandardCoverPageData = {
  reportTitle: 'Compliance Test Report',
  reportSubtitle: 'Automated Spec Validation',
  projectName: 'Test Project',
  projectNumber: 'TP-001',
  revision: 'Rev 1',
  date: new Date().toLocaleDateString('en-ZA'),
  companyName: 'Test Company',
};

// ─── Inspector Functions ───

function hasMultiplePages(pages: SVGSVGElement[]): ComplianceCheck {
  return {
    name: 'Multi-page output',
    description: 'Builder produces more than 1 page',
    passed: pages.length > 1,
    details: `${pages.length} page(s) generated`,
  };
}

function hasCoverPage(pages: SVGSVGElement[]): ComplianceCheck {
  if (pages.length === 0) {
    return { name: 'Cover page', description: 'First page is a branded cover', passed: false, details: 'No pages' };
  }
  const cover = pages[0];
  const texts = Array.from(cover.querySelectorAll('text'));
  const rects = Array.from(cover.querySelectorAll('rect'));

  const hasBrandRect = rects.some(r => {
    const fill = r.getAttribute('fill') || '';
    return fill.includes('#1e3a5f') || fill.includes('url(');
  });
  const hasReportTitle = texts.some(t =>
    (t.textContent || '').length > 3 && parseFloat(t.getAttribute('font-size') || '0') >= 7
  );

  return {
    name: 'Cover page',
    description: 'First page has branded cover elements (brand color + title)',
    passed: hasBrandRect && hasReportTitle,
    details: `Brand rect: ${hasBrandRect}, Title text: ${hasReportTitle}`,
  };
}

function hasRunningFooters(pages: SVGSVGElement[]): ComplianceCheck {
  if (pages.length < 2) {
    return { name: 'Running footer (§2)', description: 'Pages 2+ have "Page X of Y" footer', passed: false, details: 'Not enough pages' };
  }
  const page2 = pages[1];
  const texts = Array.from(page2.querySelectorAll('text'));
  const hasPageNum = texts.some(t => /page\s+\d+\s+of\s+\d+/i.test(t.textContent || ''));

  const coverTexts = Array.from(pages[0].querySelectorAll('text'));
  const coverHasPageNum = coverTexts.some(t => /page\s+\d+\s+of\s+\d+/i.test(t.textContent || ''));

  return {
    name: 'Running footer (§2)',
    description: 'Pages 2+ have "Page X of Y", cover page excluded',
    passed: hasPageNum && !coverHasPageNum,
    details: `Page 2 footer: ${hasPageNum}, Cover excluded: ${!coverHasPageNum}`,
  };
}

function hasRunningHeaders(pages: SVGSVGElement[]): ComplianceCheck {
  if (pages.length < 2) {
    return { name: 'Running header (§1)', description: 'Pages 2+ have running header', passed: false, details: 'Not enough pages' };
  }
  const page2 = pages[1];
  const texts = Array.from(page2.querySelectorAll('text'));
  const headerTexts = texts.filter(t => {
    const y = parseFloat(t.getAttribute('y') || '999');
    const fontSize = parseFloat(t.getAttribute('font-size') || '0');
    return y < 12 && fontSize <= 3.5;
  });

  return {
    name: 'Running header (§1)',
    description: 'Pages 2+ have header text in top margin area',
    passed: headerTexts.length >= 1,
    details: `Found ${headerTexts.length} header text element(s) on page 2`,
  };
}

function coverExcludesHeaderFooter(pages: SVGSVGElement[]): ComplianceCheck {
  if (pages.length === 0) {
    return { name: 'Cover exclusion (§3)', description: 'Cover page has no header/footer', passed: false, details: 'No pages' };
  }
  const cover = pages[0];
  const texts = Array.from(cover.querySelectorAll('text'));
  const hasPageNum = texts.some(t => /page\s+\d+\s+of\s+\d+/i.test(t.textContent || ''));
  const lines = Array.from(cover.querySelectorAll('line'));
  const hasHeaderLine = lines.some(l => {
    const y1 = parseFloat(l.getAttribute('y1') || '999');
    return y1 < 12 && l.getAttribute('stroke') === '#2563eb';
  });

  return {
    name: 'Cover exclusion (§3)',
    description: 'Cover page must NOT show running header or footer',
    passed: !hasPageNum && !hasHeaderLine,
    details: `No footer: ${!hasPageNum}, No header line: ${!hasHeaderLine}`,
  };
}

function hasCorrectViewBox(pages: SVGSVGElement[]): ComplianceCheck {
  if (pages.length === 0) {
    return { name: 'A4 viewBox (§4)', description: 'All pages use 210x297mm viewBox', passed: false, details: 'No pages' };
  }
  const allCorrect = pages.every(p => p.getAttribute('viewBox') === '0 0 210 297');

  return {
    name: 'A4 viewBox (§4)',
    description: 'All pages use standard 210×297mm viewBox',
    passed: allCorrect,
    details: allCorrect ? 'All pages OK' : 'Some pages have non-standard viewBox',
  };
}

function runInspections(pages: SVGSVGElement[]): ComplianceCheck[] {
  return [
    hasMultiplePages(pages),
    hasCoverPage(pages),
    coverExcludesHeaderFooter(pages),
    hasRunningHeaders(pages),
    hasRunningFooters(pages),
    hasCorrectViewBox(pages),
  ];
}

// ─── Builder Registry ───

interface BuilderEntry {
  reportId: string;
  reportName: string;
  load: () => Promise<SVGSVGElement[]>;
}

function getBuilderRegistry(): BuilderEntry[] {
  return [
    {
      reportId: 'site-diary',
      reportName: 'Site Diary',
      load: async () => {
        const mod = await import('./siteDiaryPdfBuilder');
        return mod.buildSiteDiaryPdf({
          coverData: MOCK_COVER,
          tasks: [
            { title: 'Test Task 1', status: 'completed', priority: 'high', due_date: '2026-01-15', progress: 100 },
            { title: 'Test Task 2', status: 'in_progress', priority: 'medium', due_date: '2026-02-01', progress: 50 },
            { title: 'Test Task 3', status: 'pending', priority: 'low', due_date: null, progress: 0 },
          ],
          projectName: 'Test Project',
          filterLabel: 'All Tasks',
        });
      },
    },
    {
      reportId: 'tenant-completion',
      reportName: 'Tenant Completion',
      load: async () => {
        const mod = await import('./handoverCompletionPdfBuilder');
        return mod.buildHandoverCompletionPdf({
          coverData: MOCK_COVER,
          tenants: [
            { id: '1', shop_number: 'S01', shop_name: 'Shop A', completionPercentage: 100, completedCount: 6, totalCount: 6 },
            { id: '2', shop_number: 'S02', shop_name: 'Shop B', completionPercentage: 50, completedCount: 3, totalCount: 6 },
          ],
          stats: { total: 2, complete: 1, inProgress: 1, notStarted: 0, overallPercentage: 75 },
          allDocuments: [],
          allExclusions: [],
        });
      },
    },
    {
      reportId: 'final-account',
      reportName: 'Final Account',
      load: async () => {
        const mod = await import('./finalAccountPdfBuilder');
        return mod.buildFinalAccountPdf({
          coverData: MOCK_COVER,
          account: { total_contract_value: 100000, total_variations: 5000, final_account_value: 105000, status: 'approved' },
          bills: [
            { bill_number: 1, bill_name: 'Electrical', contract_total: 50000, final_total: 52000, variation_total: 2000, sections: [] },
            { bill_number: 2, bill_name: 'Plumbing', contract_total: 50000, final_total: 53000, variation_total: 3000, sections: [] },
          ],
        });
      },
    },
    {
      reportId: 'specification',
      reportName: 'Specification',
      load: async () => {
        const mod = await import('./specificationPdfBuilder');
        return mod.buildSpecificationPdf({
          coverData: MOCK_COVER,
          specification: {
            sections: [
              { title: 'Section 1', content: 'Test content for section one with details.' },
              { title: 'Section 2', content: 'Test content for section two with more details.' },
            ],
          } as any,
        });
      },
    },
    {
      reportId: 'project-outline',
      reportName: 'Project Outline',
      load: async () => {
        const mod = await import('./projectOutlinePdfBuilder');
        return mod.buildProjectOutlinePdf({
          coverData: MOCK_COVER,
          outline: { title: 'Test Outline' } as any,
          sections: [
            { title: 'Overview', content: 'Project overview content.' },
            { title: 'Scope', content: 'Project scope details.' },
          ],
        });
      },
    },
    {
      reportId: 'ai-prediction',
      reportName: 'AI Prediction',
      load: async () => {
        const mod = await import('./aiPredictionPdfBuilder');
        return mod.buildAiPredictionPages({
          predictionData: {
            summary: { totalEstimate: 500000, confidenceLevel: 85, currency: 'ZAR' },
            costBreakdown: [
              { category: 'Materials', amount: 250000, percentage: 50 },
              { category: 'Labour', amount: 150000, percentage: 30 },
              { category: 'Equipment', amount: 100000, percentage: 20 },
            ],
            historicalTrend: [
              { project: 'Project A', budgeted: 400000, actual: 420000 },
            ],
            riskFactors: [
              { risk: 'Supply Chain', probability: 60, impact: 80 },
              { risk: 'Weather', probability: 40, impact: 50 },
            ],
            analysis: 'Detailed analysis of cost prediction model.',
          },
          projectName: 'Test Project',
          projectNumber: 'TP-001',
          parameters: { projectSize: 'Large', complexity: 'Medium', timeline: '12 months', location: 'Gauteng' },
          coverData: MOCK_COVER,
          revision: 'Rev 1',
        });
      },
    },
    {
      reportId: 'cable-schedule',
      reportName: 'Cable Schedule',
      load: async () => {
        const mod = await import('./cableSchedulePdfBuilder');
        return mod.buildCableSchedulePdf({
          coverData: MOCK_COVER,
          entries: [
            { cable_tag: 'C01', from_location: 'DB-A', to_location: 'Shop 1', voltage: 400, load_amps: 32, cable_type: 'XLPE', cable_size: '16mm²', total_length: 45, volt_drop: 2.1 },
            { cable_tag: 'C02', from_location: 'DB-A', to_location: 'Shop 2', voltage: 230, load_amps: 20, cable_type: 'PVC', cable_size: '10mm²', total_length: 30, volt_drop: 1.8 },
          ],
          scheduleName: 'Test Schedule',
        });
      },
    },
    {
      reportId: 'tenant-tracker',
      reportName: 'Tenant Tracker',
      load: async () => {
        const mod = await import('./tenantTrackerPdfBuilder');
        return mod.buildTenantTrackerPdf({
          coverData: MOCK_COVER,
          tenants: [
            { shop_name: 'Shop A', shop_number: 'S01', shop_category: 'standard', area: 100, db_size_allowance: '60A', sow_received: true, layout_received: true, db_ordered: true, lighting_ordered: false, lighting_cost: null, db_cost: 5000, cost_reported: false },
            { shop_name: 'Shop B', shop_number: 'S02', shop_category: 'fast_food', area: 80, db_size_allowance: '80A', sow_received: true, layout_received: false, db_ordered: false, lighting_ordered: false, lighting_cost: null, db_cost: null, cost_reported: false },
          ],
          projectName: 'Test Project',
        });
      },
    },
    {
      reportId: 'legend-card',
      reportName: 'Legend Card',
      load: async () => {
        const mod = await import('./legendCardPdfBuilder');
        return mod.buildLegendCardPdf({
          coverData: MOCK_COVER,
          dbName: 'DB-TEST-01',
          circuits: [
            { cb_no: 1, description: 'Lights Circuit 1', amp_rating: '16A' },
            { cb_no: 2, description: 'Power Circuit 1', amp_rating: '20A' },
          ],
          contactors: [{ name: 'C1', amps: '25', controlling: 'Lights', kw: '5.5', coil: '230V', poles: '3' }],
        });
      },
    },
    {
      reportId: 'verification-cert',
      reportName: 'Verification Certificate',
      load: async () => {
        const mod = await import('./verificationCertPdfBuilder');
        return mod.buildVerificationCertPdf({
          coverData: MOCK_COVER,
          projectName: 'Test Project', projectNumber: 'TP-001',
          scheduleName: 'Main Schedule', scheduleRevision: 'R01',
          electrician: { name: 'John Doe', company: 'Test Electrical', position: 'Senior Electrician' },
          stats: { total: 10, verified: 8, issues: 1, not_installed: 1 },
          items: [{ cable_tag: 'C01', from_location: 'DB-A', to_location: 'Shop 1', cable_size: '16mm²', status: 'verified', notes: null, measured_length: 45 }],
          completedAt: new Date().toISOString(), certId: 'test-cert-001',
        });
      },
    },
    {
      reportId: 'electrical-budget',
      reportName: 'Electrical Budget',
      load: async () => {
        const mod = await import('./electricalBudgetPdfBuilder');
        return mod.buildElectricalBudgetPdf({
          coverData: MOCK_COVER, budgetName: 'Test Budget', projectName: 'Test Project',
          sections: [{ section_code: 'A', section_name: 'General', items: [{ description: 'Item 1', total: 10000 }], total: 10000 }],
          grandTotal: 10000, tenantTotal: 3000, landlordTotal: 7000,
        });
      },
    },
    {
      reportId: 'template-pdf',
      reportName: 'Template PDF',
      load: async () => {
        const mod = await import('./templatePdfBuilder');
        return mod.buildTemplatePdf({
          coverData: MOCK_COVER, projectName: 'Test Project',
          categories: [{ code: 'A1', description: 'Category 1' }],
          variations: [{ code: 'V1', description: 'Variation 1' }],
          sections: [{ title: 'Notes', content: 'Template notes content.' }],
        });
      },
    },
    // Phase 3: Visual Reports
    {
      reportId: 'generator-report',
      reportName: 'Generator Report',
      load: async () => {
        const mod = await import('./generatorReportPdfBuilder');
        return mod.buildGeneratorReportPdf({
          coverData: MOCK_COVER, projectName: 'Test Project', generatorSize: '500 kVA', fuelType: 'Diesel',
          zones: [
            { name: 'Zone A - Critical', totalKw: 120, loads: [{ description: 'UPS Systems', kw: 80, priority: 'Critical' }, { description: 'Emergency Lights', kw: 40, priority: 'High' }] },
            { name: 'Zone B - Essential', totalKw: 80, loads: [{ description: 'HVAC', kw: 50, priority: 'Medium' }, { description: 'Elevators', kw: 30, priority: 'Medium' }] },
          ],
          loadSummary: { totalConnected: 200, totalDemand: 150, diversityFactor: 0.75 },
          financials: { capitalCost: 850000, monthlyFuel: 15000, maintenanceAnnual: 45000, amortizationYears: 5 },
        });
      },
    },
    {
      reportId: 'bulk-services',
      reportName: 'Bulk Services',
      load: async () => {
        const mod = await import('./bulkServicesPdfBuilder');
        return mod.buildBulkServicesPdf({
          coverData: MOCK_COVER, projectName: 'Test Project', documentNumber: 'BS-001',
          supplyAuthority: 'Eskom', connectionSize: '1000A', totalConnectedLoad: 850, maximumDemand: 520,
          diversityFactor: 0.61, transformerSize: 800,
          loadSchedule: [
            { tenant: 'Shop A', shopNumber: 'S01', breakerSize: '60A', connectedLoad: 41.4, demandLoad: 28.5, category: 'Retail' },
            { tenant: 'Shop B', shopNumber: 'S02', breakerSize: '80A', connectedLoad: 55.2, demandLoad: 38.6, category: 'Fast Food' },
          ],
          phases: [
            { name: 'Application', status: 'completed', tasks: [{ title: 'Submit', completed: true }] },
            { name: 'Installation', status: 'in_progress', tasks: [{ title: 'Cable', completed: false }] },
          ],
          notes: 'All calculations per SANS 10142-1.',
        });
      },
    },
    {
      reportId: 'floor-plan',
      reportName: 'Floor Plan',
      load: async () => {
        const mod = await import('./floorPlanPdfBuilder');
        return mod.buildFloorPlanReportPdf({
          coverData: MOCK_COVER, projectName: 'Test Project', layoutName: 'Ground Floor - Layout A',
          equipment: [
            { tag: 'DB-01', type: 'Distribution Board', location: 'Electrical Room', rating: '400A', quantity: 1 },
            { tag: 'DB-02', type: 'Sub Distribution Board', location: 'Shop S01', rating: '60A', quantity: 1 },
          ],
          cables: [
            { tag: 'C01', from: 'DB-01', to: 'DB-02', type: 'XLPE', size: '16mm²', length: 45 },
          ],
          containment: [
            { type: 'Cable Tray', size: '300x50', length: 25, route: 'Main corridor' },
          ],
          annotations: ['All cable routing via ceiling void', 'Fire stopping at all penetrations'],
        });
      },
    },
    {
      reportId: 'cost-report-server',
      reportName: 'Cost Report (Server)',
      load: async () => {
        const mod = await import('./costReportServerPdfBuilder');
        return mod.buildCostReportServerPdf({
          coverData: MOCK_COVER, projectName: 'Test Project',
          budgetTotal: 500000, actualTotal: 480000, variationTotal: 25000,
          categories: [
            { name: 'Electrical', budget: 250000, actual: 240000, variance: -10000 },
            { name: 'Mechanical', budget: 150000, actual: 145000, variance: -5000 },
            { name: 'Civil', budget: 100000, actual: 95000, variance: -5000 },
          ],
          variations: [
            { reference: 'VO-001', description: 'Additional DB boards', amount: 15000, status: 'Approved' },
            { reference: 'VO-002', description: 'Extra cabling', amount: 10000, status: 'Pending' },
          ],
          notes: 'Report generated for scheduled distribution.',
        });
      },
    },
  ];
}

// ─── Public API ───

export type ProgressCallback = (completed: number, total: number, current: string) => void;

export async function runComplianceChecks(
  onProgress?: ProgressCallback
): Promise<ComplianceCheckResult[]> {
  const registry = getBuilderRegistry();
  const results: ComplianceCheckResult[] = [];

  for (let i = 0; i < registry.length; i++) {
    const entry = registry[i];
    onProgress?.(i, registry.length, entry.reportName);

    const start = performance.now();
    try {
      const pages = await entry.load();
      const checks = runInspections(pages);
      const duration = Math.round(performance.now() - start);

      results.push({
        reportId: entry.reportId,
        reportName: entry.reportName,
        passed: checks.every(c => c.passed),
        timestamp: Date.now(),
        duration,
        checks,
      });
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      results.push({
        reportId: entry.reportId,
        reportName: entry.reportName,
        passed: false,
        timestamp: Date.now(),
        duration,
        checks: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  onProgress?.(registry.length, registry.length, 'Done');
  return results;
}
