/**
 * Test PDF Generator Panel
 * Generates test PDFs for all tracked report types using real project 636 data
 * and downloads them for manual verification.
 */
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, CheckCircle2, XCircle, PlayCircle } from 'lucide-react';
import { svgPagesToPdfBlob } from '@/utils/svg-pdf/svgToPdfEngine';
import type { StandardCoverPageData } from '@/utils/svg-pdf/sharedSvgHelpers';

const PROJECT_ID = '3ab4634c-f75b-4653-86f7-4392c1e5eaf2';
const PROJECT_NAME = 'PRINCE BUTHELEZI MALL, EMPANGENI';
const PROJECT_NUMBER = '636';

function makeCover(title: string, subtitle?: string): StandardCoverPageData {
  return {
    reportTitle: title,
    reportSubtitle: subtitle || PROJECT_NUMBER,
    projectName: PROJECT_NAME,
    date: new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' }),
    companyName: 'Moolman Group',
  };
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ReportGenerator {
  id: string;
  name: string;
  generate: () => Promise<SVGSVGElement[]>;
  landscape?: boolean;
}

function useReportGenerators(): ReportGenerator[] {
  return [
    {
      id: 'cost-report',
      name: 'Cost Report',
      generate: async () => {
        const { buildCoverPageSvg, buildExecutiveSummarySvg, applyPageFooters } = await import('@/utils/svg-pdf/costReportPdfBuilder');
        const cover = buildCoverPageSvg({
          companyName: 'Moolman Group', projectName: PROJECT_NAME,
          reportNumber: 1, revision: 'R01', date: new Date().toLocaleDateString('en-ZA'),
          projectNumber: PROJECT_NUMBER,
        });
        const summary = buildExecutiveSummarySvg({
          rows: [
            { code: 'A', description: 'Electrical Installation', originalBudget: 5200000, anticipatedFinal: 5450000, currentVariance: 250000 },
            { code: 'B', description: 'Lighting Supply', originalBudget: 3100000, anticipatedFinal: 3050000, currentVariance: -50000 },
            { code: 'C', description: 'DB Supply & Install', originalBudget: 1800000, anticipatedFinal: 1920000, currentVariance: 120000 },
          ],
          grandTotal: { code: '', description: 'GRAND TOTAL', originalBudget: 10100000, anticipatedFinal: 10420000, currentVariance: 320000 },
        });
        const pages = [cover, summary];
        applyPageFooters(pages);
        return pages;
      },
    },
    {
      id: 'final-account',
      name: 'Final Account',
      generate: async () => {
        const { buildFinalAccountPdf } = await import('@/utils/svg-pdf/finalAccountPdfBuilder');
        return buildFinalAccountPdf({
          account: { contract_sum: 10100000, final_sum: 10420000, variation_total: 320000 },
          bills: [{
            bill_number: 1, bill_name: 'Electrical Works', contract_total: 5200000, final_total: 5450000, variation_total: 250000,
            sections: [{ section_code: 'A1', section_name: 'Main Distribution', contract_total: 2500000, final_total: 2650000, variation_total: 150000, items: [] }],
          }],
          coverData: makeCover('Final Account', 'Contract Closeout'),
        });
      },
    },
    {
      id: 'specification',
      name: 'Specification',
      generate: async () => {
        const { buildSpecificationPdf } = await import('@/utils/svg-pdf/specificationPdfBuilder');
        return buildSpecificationPdf({
          specification: {
            specification_name: 'Electrical Installation Specification',
            spec_number: 'SPEC-636-001', spec_type: 'Electrical',
            revision: 'Rev.0', project_name: PROJECT_NAME,
            notes: 'This specification covers the complete electrical installation for Prince Buthelezi Mall including main distribution, sub-distribution boards, lighting, and power outlets.',
          },
          coverData: makeCover('Technical Specification', 'SPEC-636-001'),
        });
      },
    },
    {
      id: 'tenant-completion',
      name: 'Tenant Completion',
      generate: async () => {
        const { buildHandoverCompletionPdf } = await import('@/utils/svg-pdf/handoverCompletionPdfBuilder');
        return buildHandoverCompletionPdf({
          coverData: makeCover('Handover Completion', '65% Complete'),
          tenants: [
            { id: '1', shop_number: 'SHOP 61B', shop_name: 'Expresso', completionPercentage: 83, completedCount: 5, totalCount: 6 },
            { id: '2', shop_number: 'SHOP 58B', shop_name: 'Milky Lane', completionPercentage: 67, completedCount: 4, totalCount: 6 },
            { id: '3', shop_number: 'SHOP 24', shop_name: 'Stitch SA', completionPercentage: 17, completedCount: 1, totalCount: 6 },
            { id: '4', shop_number: 'Shop 23', shop_name: 'Kase Artist', completionPercentage: 100, completedCount: 6, totalCount: 6 },
            { id: '5', shop_number: 'SHOP 3', shop_name: 'PEDROS', completionPercentage: 50, completedCount: 3, totalCount: 6 },
          ],
          stats: { total: 103, complete: 24, inProgress: 45, notStarted: 34, overallPercentage: 65 },
          allDocuments: [], allExclusions: [],
        });
      },
    },
    {
      id: 'project-outline',
      name: 'Project Outline',
      generate: async () => {
        const { buildProjectOutlinePdf } = await import('@/utils/svg-pdf/projectOutlinePdfBuilder');
        return buildProjectOutlinePdf({
          outline: { contact_person: 'Project Manager', prepared_by: 'Moolman Group' },
          sections: [
            { section_number: 1, section_title: 'Project Overview', content: 'Prince Buthelezi Mall is a major retail development in Empangeni, KZN.' },
            { section_number: 2, section_title: 'Scope of Works', content: 'Complete electrical installation including mains, distribution, lighting, and power.' },
            { section_number: 3, section_title: 'Programme', content: 'Construction programme spans 18 months with phased handover.' },
          ],
          coverData: makeCover('Baseline Document', 'Project Outline'),
        });
      },
    },
    {
      id: 'site-diary',
      name: 'Site Diary',
      generate: async () => {
        const { buildSiteDiaryPdf } = await import('@/utils/svg-pdf/siteDiaryPdfBuilder');
        return buildSiteDiaryPdf({
          coverData: makeCover('Site Diary', 'Task Report'),
          tasks: [
            { title: 'DB installation Shop 61B', status: 'completed', priority: 'high', due_date: '2025-12-15', progress: 100 },
            { title: 'Lighting layout Shop 58B', status: 'in_progress', priority: 'medium', due_date: '2025-12-20', progress: 60 },
            { title: 'Cable tray installation Level 1', status: 'pending', priority: 'critical', due_date: '2025-12-10', progress: 0 },
            { title: 'Fire detection wiring', status: 'in_progress', priority: 'high', due_date: '2025-12-18', progress: 35 },
          ],
          projectName: PROJECT_NAME,
          filterLabel: 'All Tasks',
        });
      },
    },
    {
      id: 'ai-prediction',
      name: 'AI Prediction',
      generate: async () => {
        const { buildAiPredictionPages } = await import('@/utils/svg-pdf/aiPredictionPdfBuilder');
        return buildAiPredictionPages({
          predictionData: {
            summary: { totalEstimate: 12500000, confidenceLevel: 78, currency: 'ZAR' },
            costBreakdown: [
              { category: 'Electrical', amount: 5200000, percentage: 42 },
              { category: 'Lighting', amount: 3100000, percentage: 25 },
              { category: 'DB Boards', amount: 1800000, percentage: 14 },
              { category: 'Containment', amount: 2400000, percentage: 19 },
            ],
            historicalTrend: [
              { project: 'Mall A', budgeted: 8000000, actual: 8500000 },
              { project: 'Mall B', budgeted: 10000000, actual: 9800000 },
            ],
            riskFactors: [
              { risk: 'Material price escalation', probability: 0.7, impact: 0.8 },
              { risk: 'Labour shortage', probability: 0.4, impact: 0.6 },
            ],
            analysis: 'Based on historical data from similar retail developments, the predicted cost for Prince Buthelezi Mall electrical installation is within acceptable tolerance.',
          },
          projectName: PROJECT_NAME, projectNumber: PROJECT_NUMBER,
          parameters: { projectSize: '25000 m²', complexity: 'High', timeline: '18 months', location: 'Empangeni, KZN' },
          coverData: makeCover('AI Cost Prediction', 'Machine Learning Analysis'),
        });
      },
    },
    {
      id: 'cable-schedule',
      name: 'Cable Schedule',
      generate: async () => {
        const { buildCableSchedulePdf } = await import('@/utils/svg-pdf/cableSchedulePdfBuilder');
        return buildCableSchedulePdf({
          coverData: makeCover('Cable Schedule', 'Installation Record'),
          entries: [
            { cable_tag: 'C001', from_location: 'MSB', to_location: 'DB-SHOP61B', voltage: 400, cable_type: 'XLPE/SWA', cable_size: '4x25+16', measured_length: 45, total_length: 50, load_amps: 60 },
            { cable_tag: 'C002', from_location: 'MSB', to_location: 'DB-SHOP58B', voltage: 400, cable_type: 'XLPE/SWA', cable_size: '4x16+10', measured_length: 38, total_length: 42, load_amps: 45 },
            { cable_tag: 'C003', from_location: 'MSB', to_location: 'DB-SHOP3', voltage: 400, cable_type: 'XLPE/SWA', cable_size: '4x35+16', measured_length: 62, total_length: 68, load_amps: 80 },
          ],
          optimizations: [],
          scheduleName: 'Main Cable Schedule',
        });
      },
    },
    {
      id: 'tenant-tracker',
      name: 'Tenant Tracker',
      generate: async () => {
        const { buildTenantTrackerPdf } = await import('@/utils/svg-pdf/tenantTrackerPdfBuilder');
        return buildTenantTrackerPdf({
          coverData: makeCover('Tenant Tracker', 'Progress Dashboard'),
          tenants: [
            { shop_name: 'Expresso', shop_number: 'SHOP 61B', shop_category: 'standard', area: 114, db_size_allowance: '60A TP', sow_received: true, layout_received: true, db_ordered: true, lighting_ordered: false, lighting_cost: null, db_cost: 15738, cost_reported: false },
            { shop_name: 'Milky Lane', shop_number: 'SHOP 58B', shop_category: 'standard', area: 77, db_size_allowance: '60A TP', sow_received: true, layout_received: true, db_ordered: true, lighting_ordered: false, lighting_cost: null, db_cost: 17641, cost_reported: false },
            { shop_name: 'PEDROS', shop_number: 'SHOP 3', shop_category: 'restaurant', area: 122, db_size_allowance: '150A TP', sow_received: true, layout_received: true, db_ordered: true, lighting_ordered: false, lighting_cost: null, db_cost: 22032, cost_reported: false },
            { shop_name: 'Burger King', shop_number: 'Shop 87', shop_category: 'restaurant', area: 18, db_size_allowance: '150A TP', sow_received: true, layout_received: true, db_ordered: true, lighting_ordered: true, lighting_cost: null, db_cost: 14040, cost_reported: true },
            { shop_name: 'McDonalds', shop_number: 'Shop 86', shop_category: 'restaurant', area: 251, db_size_allowance: '150A TP', sow_received: true, layout_received: true, db_ordered: true, lighting_ordered: true, lighting_cost: null, db_cost: null, cost_reported: true },
            { shop_name: 'The Bed Shop', shop_number: 'Shop 82A', shop_category: 'standard', area: 201, db_size_allowance: '80A TP', sow_received: true, layout_received: true, db_ordered: true, lighting_ordered: true, lighting_cost: 22745, db_cost: 13152, cost_reported: true },
          ],
          projectName: PROJECT_NAME,
        });
      },
    },
    {
      id: 'legend-card',
      name: 'Legend Card',
      generate: async () => {
        const { buildLegendCardPdf } = await import('@/utils/svg-pdf/legendCardPdfBuilder');
        return buildLegendCardPdf({
          coverData: makeCover('DB Legend Card', 'SHOP 61B'),
          dbName: 'DB-SHOP61B', address: 'Prince Buthelezi Mall, Empangeni',
          circuits: [
            { cb_no: 1, description: 'Lights Circuit 1', amp_rating: '20A' },
            { cb_no: 2, description: 'Lights Circuit 2', amp_rating: '20A' },
            { cb_no: 3, description: 'Power Circuit 1', amp_rating: '20A' },
            { cb_no: 4, description: 'Power Circuit 2', amp_rating: '20A' },
            { cb_no: 5, description: 'Geyser', amp_rating: '32A' },
          ],
          contactors: [],
        });
      },
    },
    {
      id: 'verification-cert',
      name: 'Verification Certificate',
      generate: async () => {
        const { buildVerificationCertPdf } = await import('@/utils/svg-pdf/verificationCertPdfBuilder');
        return buildVerificationCertPdf({
          coverData: makeCover('Verification Certificate', 'Cable Schedule'),
          projectName: PROJECT_NAME, projectNumber: PROJECT_NUMBER,
          scheduleName: 'Main Cable Schedule', scheduleRevision: 'Rev.1',
          electrician: { name: 'J. Smith', company: 'Moolman Electrical', position: 'Senior Electrician', registration: 'EL-12345' },
          stats: { total: 3, verified: 2, issues: 1, not_installed: 0 },
          items: [
            { cable_tag: 'C001', from_location: 'MSB', to_location: 'DB-SHOP61B', cable_size: '4x25+16', status: 'verified', notes: null, measured_length: 45 },
            { cable_tag: 'C002', from_location: 'MSB', to_location: 'DB-SHOP58B', cable_size: '4x16+10', status: 'verified', notes: null, measured_length: 38 },
            { cable_tag: 'C003', from_location: 'MSB', to_location: 'DB-SHOP3', cable_size: '4x35+16', status: 'issues_found', notes: 'Wrong cable size installed', measured_length: 62 },
          ],
          completedAt: new Date().toISOString(), certId: 'CERT-636-001',
        });
      },
    },
    {
      id: 'electrical-budget',
      name: 'Electrical Budget',
      generate: async () => {
        const { buildElectricalBudgetPdf } = await import('@/utils/svg-pdf/electricalBudgetPdfBuilder');
        return buildElectricalBudgetPdf({
          coverData: makeCover('Electrical Budget', 'Cost Estimate'),
          budgetName: 'Main Electrical Budget', projectName: PROJECT_NAME,
          sections: [{
            section_code: 'A', section_name: 'Distribution Boards',
            items: [
              { description: 'DB Supply & Install - Standard', area: 100, base_rate: 150, total: 15000 },
              { description: 'DB Supply & Install - Restaurant', area: 200, base_rate: 200, total: 40000 },
            ],
            total: 55000,
          }],
          grandTotal: 55000, tenantTotal: 45000, landlordTotal: 10000,
        });
      },
    },
    {
      id: 'generator-report',
      name: 'Generator Report',
      generate: async () => {
        const { buildGeneratorReportPdf } = await import('@/utils/svg-pdf/generatorReportPdfBuilder');
        return buildGeneratorReportPdf({
          coverData: makeCover('Generator Report', 'Load Analysis'),
          projectName: PROJECT_NAME,
          generatorSize: '500 kVA', fuelType: 'Diesel',
          zones: [
            { name: 'Essential Services', totalKw: 120, loads: [{ description: 'Fire System', kw: 45, priority: 'critical' }, { description: 'Emergency Lights', kw: 75, priority: 'critical' }] },
            { name: 'Landlord Areas', totalKw: 200, loads: [{ description: 'Common Area Lighting', kw: 100, priority: 'high' }, { description: 'Escalators', kw: 100, priority: 'medium' }] },
          ],
          loadSummary: { totalConnected: 320, totalDemand: 256, diversityFactor: 0.8 },
          financials: { capitalCost: 2500000, monthlyFuel: 45000, maintenanceAnnual: 180000, amortizationYears: 10 },
        });
      },
    },
    {
      id: 'bulk-services',
      name: 'Bulk Services',
      generate: async () => {
        const { buildBulkServicesPdf } = await import('@/utils/svg-pdf/bulkServicesPdfBuilder');
        return buildBulkServicesPdf({
          coverData: makeCover('Bulk Services Application', '636.39.10'),
          projectName: PROJECT_NAME, documentNumber: '636.39.10',
          supplyAuthority: 'CITY OF UMHLATHUZE', connectionSize: '2473 kVA',
          totalConnectedLoad: 2976, maximumDemand: 2381, diversityFactor: 0.80,
          transformerSize: 2500,
          loadSchedule: [
            { tenant: 'Expresso', shopNumber: 'SHOP 61B', breakerSize: '60A', connectedLoad: 24, demandLoad: 19, category: 'Standard' },
            { tenant: 'PEDROS', shopNumber: 'SHOP 3', breakerSize: '150A', connectedLoad: 60, demandLoad: 48, category: 'Restaurant' },
          ],
          phases: [
            { name: 'Application', status: 'completed', tasks: [{ title: 'Submit application', completed: true }] },
            { name: 'Approval', status: 'in_progress', tasks: [{ title: 'Await authority approval', completed: false }] },
          ],
        });
      },
    },
    {
      id: 'floor-plan',
      name: 'Floor Plan',
      generate: async () => {
        const { buildFloorPlanReportPdf } = await import('@/utils/svg-pdf/floorPlanPdfBuilder');
        return buildFloorPlanReportPdf({
          coverData: makeCover('Floor Plan Report', 'Layout Analysis'),
          projectName: PROJECT_NAME, layoutName: 'Ground Floor - Main Distribution',
          equipment: [
            { tag: 'MSB', type: 'Main Switchboard', location: 'Substation', rating: '2500A', quantity: 1 },
            { tag: 'DB-01', type: 'Distribution Board', location: 'Shop 61B', rating: '60A', quantity: 1 },
          ],
          cables: [
            { tag: 'C001', from: 'MSB', to: 'DB-SHOP61B', type: 'XLPE/SWA', size: '4x25+16', length: 50 },
          ],
          containment: [
            { type: 'Cable Tray', size: '300x100', length: 120, route: 'Main corridor' },
          ],
        });
      },
    },
    {
      id: 'cost-report-server',
      name: 'Cost Report (Server)',
      generate: async () => {
        const { buildCostReportServerPdf } = await import('@/utils/svg-pdf/costReportServerPdfBuilder');
        return buildCostReportServerPdf({
          coverData: makeCover('Cost Report', 'Server-Generated'),
          projectName: PROJECT_NAME,
          budgetTotal: 10100000, actualTotal: 10420000, variationTotal: 320000,
          categories: [
            { name: 'Electrical', budget: 5200000, actual: 5450000, variance: 250000 },
            { name: 'Lighting', budget: 3100000, actual: 3050000, variance: -50000 },
            { name: 'DB Boards', budget: 1800000, actual: 1920000, variance: 120000 },
          ],
          variations: [
            { reference: 'VO-001', description: 'Additional power points Shop 87', amount: 45000, status: 'Approved' },
            { reference: 'VO-002', description: 'Emergency lighting upgrade', amount: 125000, status: 'Pending' },
          ],
        });
      },
    },
    {
      id: 'tenant-evaluation',
      name: 'Tenant Evaluation',
      generate: async () => {
        const { buildTenantEvaluationPdf } = await import('@/utils/svg-pdf/tenantEvaluationPdfBuilder');
        return buildTenantEvaluationPdf({
          coverData: makeCover('Tenant Evaluation', 'Expresso - SHOP 61B'),
          projectName: PROJECT_NAME,
          tenantName: 'Expresso', shopNumber: 'SHOP 61B', shopArea: 114, category: 'Standard',
          evaluationDate: new Date().toLocaleDateString('en-ZA'),
          electricalRequirements: [
            { item: 'DB Board', specification: '60A TP', status: 'met' },
            { item: 'Lighting Circuit', specification: '2x 20A', status: 'met' },
            { item: 'Power Circuit', specification: '3x 20A', status: 'partial', notes: 'Only 2 circuits installed' },
          ],
          complianceChecks: [
            { category: 'SANS 10142', requirement: 'Earth leakage protection', compliant: true, reference: 'Clause 6.12' },
            { category: 'SANS 10142', requirement: 'Circuit breaker ratings', compliant: true, reference: 'Clause 6.8' },
            { category: 'SANS 10400', requirement: 'Emergency lighting', compliant: false, reference: 'Part T' },
          ],
          overallScore: 78,
        });
      },
    },
  ];
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

interface ReportStatus {
  status: GenerationStatus;
  timeMs?: number;
  pages?: number;
  error?: string;
}

export function TestPdfGeneratorPanel() {
  const generators = useReportGenerators();
  const [statuses, setStatuses] = useState<Record<string, ReportStatus>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);

  const generateOne = useCallback(async (gen: ReportGenerator) => {
    setStatuses(prev => ({ ...prev, [gen.id]: { status: 'generating' } }));
    try {
      const start = performance.now();
      const pages = await gen.generate();
      const { blob } = await svgPagesToPdfBlob(pages, gen.landscape ? { pageWidth: 297, pageHeight: 210 } : undefined);
      const timeMs = Math.round(performance.now() - start);
      await downloadBlob(blob, `636_${gen.id}_test.pdf`);
      setStatuses(prev => ({ ...prev, [gen.id]: { status: 'success', timeMs, pages: pages.length } }));
    } catch (err: any) {
      console.error(`[TestPdf] ${gen.name} failed:`, err);
      setStatuses(prev => ({ ...prev, [gen.id]: { status: 'error', error: err.message } }));
    }
  }, []);

  const generateAll = useCallback(async () => {
    setIsRunningAll(true);
    for (const gen of generators) {
      await generateOne(gen);
      // Small delay between downloads so browser doesn't block them
      await new Promise(r => setTimeout(r, 800));
    }
    setIsRunningAll(false);
  }, [generators, generateOne]);

  const successCount = Object.values(statuses).filter(s => s.status === 'success').length;
  const errorCount = Object.values(statuses).filter(s => s.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Test PDF Generator — Project 636</CardTitle>
            <CardDescription>
              Generate and download test PDFs for all 17 tracked report types using real Prince Buthelezi Mall data
            </CardDescription>
          </div>
          <Button onClick={generateAll} disabled={isRunningAll} size="sm">
            {isRunningAll ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Generating...</>
            ) : (
              <><PlayCircle className="h-4 w-4 mr-1.5" />Generate All 17 PDFs</>
            )}
          </Button>
        </div>
        {(successCount > 0 || errorCount > 0) && (
          <div className="flex items-center gap-3 mt-2">
            {successCount > 0 && (
              <Badge variant="default" className="bg-emerald-600 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />{successCount} downloaded
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />{errorCount} failed
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {generators.map(gen => {
            const s = statuses[gen.id];
            return (
              <div key={gen.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {s?.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  {s?.status === 'error' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  {s?.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                  {(!s || s.status === 'idle') && <Download className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="truncate">
                    <span className="font-medium">{gen.name}</span>
                    {s?.status === 'success' && (
                      <span className="text-xs text-muted-foreground ml-1.5">{s.timeMs}ms · {s.pages}p</span>
                    )}
                    {s?.status === 'error' && (
                      <span className="text-xs text-destructive ml-1.5 truncate">{s.error}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => generateOne(gen)}
                  disabled={s?.status === 'generating' || isRunningAll}
                  className="shrink-0 h-7 px-2"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
