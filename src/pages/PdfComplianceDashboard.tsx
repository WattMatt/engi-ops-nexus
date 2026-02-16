/**
 * PDF Migration & Compliance Dashboard
 * 
 * REAL telemetry-driven view — queries actual DB records to determine migration status.
 * No hardcoded statuses. If the engine can't be verified, it shows 'Unknown'.
 */
import { useMemo, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  FileText, Server, Monitor, Search, Clock, PlayCircle, Loader2,
  RefreshCw, Database, HelpCircle,
} from "lucide-react";
import { runComplianceChecks, type ComplianceCheckResult } from "@/utils/svg-pdf/complianceChecker";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

type DetectedEngine = 'svg-engine' | 'pdfmake-unified' | 'legacy-jspdf' | 'pdfshift' | 'unknown';
type TelemetryStatus = 'verified' | 'legacy' | 'unknown' | 'no-data';

interface ReportDefinition {
  id: string;
  name: string;
  dbTable: string | null; // null = no history table (e.g. scheduled)
  hasCoverPage: boolean;
  hasRunningHeader: boolean;
  hasRunningFooter: boolean;
  hasToc: boolean;
  hasCharts: boolean;
  inherited?: boolean;
  notes?: string;
}

interface ReportTelemetry {
  reportId: string;
  latestEngine: DetectedEngine;
  status: TelemetryStatus;
  totalGenerated: number;
  lastGeneratedAt: string | null;
  recentEngines: DetectedEngine[];
}

// ─── Report Registry (structural facts only, NO status) ───

const REPORT_DEFINITIONS: ReportDefinition[] = [
  // ── Phase 0: SVG Engine Baseline (migrated early) ──
  { id: 'cost-report', name: 'Cost Report', dbTable: 'cost_report_pdfs', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true },
  { id: 'final-account', name: 'Final Account', dbTable: 'final_account_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false },
  { id: 'specification', name: 'Specification', dbTable: 'specification_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false },
  { id: 'tenant-completion', name: 'Tenant Completion', dbTable: 'handover_completion_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false },
  { id: 'project-outline', name: 'Project Outline', dbTable: 'project_outline_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false },
  { id: 'site-diary', name: 'Site Diary', dbTable: 'site_diary_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false },

  // ── Phase 1: Simple Client-Side Migrations ──
  { id: 'ai-prediction', name: 'AI Prediction', dbTable: 'ai_prediction_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true },

  // ── Phase 2: Server-to-Client — Data-Heavy Reports ──
  { id: 'cable-schedule', name: 'Cable Schedule', dbTable: 'cable_schedule_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false },
  { id: 'tenant-tracker', name: 'Tenant Tracker', dbTable: 'tenant_tracker_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false },
  { id: 'legend-card', name: 'Legend Card', dbTable: 'legend_card_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false },
  { id: 'verification-cert', name: 'Verification Certificate', dbTable: 'verification_certificate_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false },
  { id: 'electrical-budget', name: 'Electrical Budget', dbTable: 'electrical_budget_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false },
  { id: 'template-pdf', name: 'Template PDF', dbTable: null, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false, notes: 'No history table — download only' },

  // ── Phase 3: Server-to-Client — Visual Reports ──
  { id: 'generator-report', name: 'Generator Report', dbTable: 'generator_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true },
  { id: 'bulk-services', name: 'Bulk Services', dbTable: 'bulk_services_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false },
  { id: 'floor-plan', name: 'Floor Plan', dbTable: 'floor_plan_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false },
  { id: 'cost-report-server', name: 'Cost Report (Server)', dbTable: 'cost_report_pdfs', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true, notes: 'Shares table with Cost Report' },

  // ── Phase 4: pdfmake Migration ──
  { id: 'roadmap-review', name: 'Roadmap Review', dbTable: null, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true, notes: 'No history table — download only' },
  { id: 'tenant-evaluation', name: 'Tenant Evaluation', dbTable: 'tenant_evaluation_reports', hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false },

  // ── Additional Report Types (SVG builders exist) ──
  { id: 'payslip', name: 'Payslip', dbTable: null, hasCoverPage: false, hasRunningHeader: false, hasRunningFooter: true, hasToc: false, hasCharts: false, notes: 'No cover page — single-page payslip layout' },
  { id: 'lighting-report', name: 'Lighting Report', dbTable: null, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false, notes: 'No history table — download only' },
  { id: 'warranty-schedule', name: 'Warranty Schedule', dbTable: null, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, notes: 'No history table — download only' },
  { id: 'deadline-report', name: 'Deadline Report', dbTable: null, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, notes: 'No history table — download only' },
  { id: 'conversation', name: 'Conversation Export', dbTable: null, hasCoverPage: false, hasRunningHeader: false, hasRunningFooter: true, hasToc: false, hasCharts: false, notes: 'Simple export — no cover page' },
  { id: 'comparison', name: 'Lighting Comparison', dbTable: null, hasCoverPage: false, hasRunningHeader: false, hasRunningFooter: true, hasToc: false, hasCharts: false, notes: 'Landscape layout — no cover' },
  { id: 'report-builder', name: 'Analytics Report', dbTable: null, hasCoverPage: false, hasRunningHeader: false, hasRunningFooter: true, hasToc: false, hasCharts: false, notes: 'Custom report — no cover' },
  { id: 'roadmap-export', name: 'Roadmap Export', dbTable: null, hasCoverPage: true, hasRunningHeader: false, hasRunningFooter: true, hasToc: false, hasCharts: false, notes: 'No history table — download only' },
  { id: 'tenant-report', name: 'Tenant Report', dbTable: null, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true, notes: 'Full tenant report with KPIs, donut/bar charts, floor plan' },

  // ── Infrastructure ──
  { id: 'scheduled-reports', name: 'Scheduled Reports', dbTable: null, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, inherited: true, notes: 'Inherits from pre-generated PDFs in storage' },
];

// ─── Engine display config ───

const ENGINE_DISPLAY: Record<DetectedEngine, { label: string; color: string }> = {
  'svg-engine': { label: 'SVG Engine', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  'pdfmake-unified': { label: 'pdfmake', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  'legacy-jspdf': { label: 'jsPDF Legacy', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  'pdfshift': { label: 'PDFShift', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  'unknown': { label: 'Unknown', color: 'bg-muted text-muted-foreground' },
};

const STATUS_DISPLAY: Record<TelemetryStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  verified: { label: 'Verified ✅', variant: 'default', icon: CheckCircle2 },
  legacy: { label: 'Legacy ⚠️', variant: 'secondary', icon: AlertTriangle },
  unknown: { label: 'Untracked', variant: 'outline', icon: HelpCircle },
  'no-data': { label: 'No Data', variant: 'outline', icon: Clock },
};

// ─── Helpers ───

function classifyEngine(engineVersion: string | null): DetectedEngine {
  if (!engineVersion || engineVersion === 'unknown') return 'unknown';
  if (engineVersion.includes('svg')) return 'svg-engine';
  if (engineVersion.includes('pdfmake')) return 'pdfmake-unified';
  if (engineVersion.includes('jspdf') || engineVersion.includes('legacy')) return 'legacy-jspdf';
  if (engineVersion.includes('pdfshift')) return 'pdfshift';
  return 'unknown';
}

function deriveStatus(latestEngine: DetectedEngine, totalGenerated: number): TelemetryStatus {
  if (totalGenerated === 0) return 'no-data';
  if (latestEngine === 'svg-engine') return 'verified';
  if (latestEngine === 'legacy-jspdf' || latestEngine === 'pdfshift' || latestEngine === 'pdfmake-unified') return 'legacy';
  return 'unknown';
}

function complianceScore(r: ReportDefinition, telemetry?: ReportTelemetry): number {
  const checks = [
    r.hasCoverPage,
    r.hasRunningHeader,
    r.hasRunningFooter,
    telemetry ? telemetry.totalGenerated > 0 : !!r.inherited, // has history
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function FeatureIcon({ value, inherited }: { value: boolean; inherited?: boolean }) {
  if (!value) return <XCircle className="h-4 w-4 text-muted-foreground/40" />;
  if (inherited) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="relative inline-flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-sky-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sky-400 ring-1 ring-background" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Inherited from pre-generated PDF
        </TooltipContent>
      </Tooltip>
    );
  }
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

// ─── Data Fetching Hook ───

function usePdfTelemetry() {
  const [telemetry, setTelemetry] = useState<Map<string, ReportTelemetry>>(new Map());
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchTelemetry = useCallback(async () => {
    setLoading(true);
    const results = new Map<string, ReportTelemetry>();

    const queries = REPORT_DEFINITIONS
      .filter(r => r.dbTable)
      .map(async (report) => {
        try {
          const { data, error } = await supabase
            .from(report.dbTable as any)
            .select('engine_version, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

          if (error || !data) {
            results.set(report.id, {
              reportId: report.id,
              latestEngine: 'unknown',
              status: 'no-data',
              totalGenerated: 0,
              lastGeneratedAt: null,
              recentEngines: [],
            });
            return;
          }

          const records = data as any[];
          const recentEngines = records.map((r: any) => classifyEngine(r.engine_version));
          const latestEngine = recentEngines[0] || 'unknown';
          
          results.set(report.id, {
            reportId: report.id,
            latestEngine,
            status: deriveStatus(latestEngine, records.length),
            totalGenerated: records.length,
            lastGeneratedAt: records[0]?.created_at || null,
            recentEngines,
          });
        } catch {
          results.set(report.id, {
            reportId: report.id,
            latestEngine: 'unknown',
            status: 'unknown',
            totalGenerated: 0,
            lastGeneratedAt: null,
            recentEngines: [],
          });
        }
      });

    await Promise.all(queries);
    setTelemetry(results);
    setLoading(false);
    setLastFetched(new Date());
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return { telemetry, loading, lastFetched, refetch: fetchTelemetry };
}

// ─── Component ───

export default function PdfComplianceDashboard() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [liveResults, setLiveResults] = useState<ComplianceCheckResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ completed: 0, total: 0, current: '' });
  const { telemetry, loading, lastFetched, refetch } = usePdfTelemetry();

  const handleRunChecks = useCallback(async () => {
    setIsRunning(true);
    setLiveResults(null);
    try {
      const results = await runComplianceChecks((completed, total, current) => {
        setCheckProgress({ completed, total, current });
      });
      setLiveResults(results);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const filtered = useMemo(() => {
    if (!search) return REPORT_DEFINITIONS;
    const q = search.toLowerCase();
    return REPORT_DEFINITIONS.filter(r => {
      const t = telemetry.get(r.id);
      return (
        r.name.toLowerCase().includes(q) ||
        (t && t.latestEngine.includes(q)) ||
        (t && t.status.includes(q))
      );
    });
  }, [search, telemetry]);

  // KPI calculations
  const kpis = useMemo(() => {
    const tracked = REPORT_DEFINITIONS.filter(r => r.dbTable);
    const verified = tracked.filter(r => telemetry.get(r.id)?.status === 'verified').length;
    const legacy = tracked.filter(r => telemetry.get(r.id)?.status === 'legacy').length;
    const noData = tracked.filter(r => {
      const t = telemetry.get(r.id);
      return !t || t.status === 'no-data' || t.status === 'unknown';
    }).length;
    const totalTracked = tracked.length;
    const verifiedPct = totalTracked > 0 ? Math.round((verified / totalTracked) * 100) : 0;

    const specCompliant = REPORT_DEFINITIONS.filter(r => complianceScore(r, telemetry.get(r.id)) === 100).length;
    const specPct = Math.round((specCompliant / REPORT_DEFINITIONS.length) * 100);

    const avgScore = Math.round(
      REPORT_DEFINITIONS.reduce((sum, r) => sum + complianceScore(r, telemetry.get(r.id)), 0) / REPORT_DEFINITIONS.length
    );

    const engines = new Set<DetectedEngine>();
    telemetry.forEach(t => { if (t.latestEngine !== 'unknown') engines.add(t.latestEngine); });

    return { verified, legacy, noData, totalTracked, verifiedPct, specCompliant, specPct, avgScore, activeEngines: engines.size || 0 };
  }, [telemetry]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">PDF Compliance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time engine telemetry from database records — no hardcoded statuses
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-xs text-muted-foreground">
              Last checked: {lastFetched.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="SVG Engine Verified"
          value={`${kpis.verified}/${kpis.totalTracked}`}
          subtitle={`${kpis.verifiedPct}% verified via DB`}
          progress={kpis.verifiedPct}
          color="emerald"
        />
        <KpiCard
          title="Legacy / Unknown"
          value={`${kpis.legacy + kpis.noData}`}
          subtitle={`${kpis.legacy} legacy, ${kpis.noData} no data`}
          progress={kpis.totalTracked > 0 ? Math.round(((kpis.legacy + kpis.noData) / kpis.totalTracked) * 100) : 0}
          color="amber"
        />
        <KpiCard
          title="Spec Compliant"
          value={`${kpis.specCompliant}/${REPORT_DEFINITIONS.length}`}
          subtitle={`${kpis.specPct}% passing`}
          progress={kpis.specPct}
          color="blue"
        />
        <KpiCard
          title="Avg Feature Score"
          value={`${kpis.avgScore}%`}
          subtitle="Cover, Header, Footer, History"
          progress={kpis.avgScore}
          color="violet"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="overview">
              <Database className="h-3.5 w-3.5 mr-1" />
              Telemetry
            </TabsTrigger>
            <TabsTrigger value="compliance">Spec Compliance</TabsTrigger>
            <TabsTrigger value="live-checks">
              <PlayCircle className="h-3.5 w-3.5 mr-1" />
              Live Checks
            </TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Telemetry Table */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Querying report history tables...
                </div>
              )}
              {!loading && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Report</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Latest Engine</th>
                        <th className="text-center p-3 font-medium">Generated</th>
                        <th className="text-center p-3 font-medium">Last Generated</th>
                        <th className="text-center p-3 font-medium">Cover</th>
                        <th className="text-center p-3 font-medium">Header</th>
                        <th className="text-center p-3 font-medium">Footer</th>
                        <th className="text-center p-3 font-medium">TOC</th>
                        <th className="text-center p-3 font-medium">Charts</th>
                        <th className="text-center p-3 font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const t = telemetry.get(r.id);
                        const engineKey = t?.latestEngine || (r.dbTable ? 'unknown' : 'unknown');
                        const statusKey = t?.status || (r.dbTable ? 'no-data' : 'unknown');
                        const engineCfg = ENGINE_DISPLAY[engineKey];
                        const statusCfg = STATUS_DISPLAY[statusKey];
                        const score = complianceScore(r, t);

                        return (
                          <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="font-medium">{r.name}</div>
                              {r.notes && <div className="text-xs text-muted-foreground mt-0.5">{r.notes}</div>}
                              {!r.dbTable && !r.inherited && (
                                <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">No history table</div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={statusCfg.variant} className="text-xs gap-1">
                                <statusCfg.icon className="h-3 w-3" />
                                {statusCfg.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${engineCfg.color}`}>
                                {engineCfg.label}
                              </span>
                            </td>
                            <td className="p-3 text-center text-muted-foreground">
                              {t?.totalGenerated ?? (r.inherited ? '—' : '0')}
                            </td>
                            <td className="p-3 text-center text-xs text-muted-foreground">
                              {t?.lastGeneratedAt
                                ? new Date(t.lastGeneratedAt).toLocaleDateString()
                                : '—'}
                            </td>
                            <td className="p-3 text-center"><FeatureIcon value={r.hasCoverPage} inherited={r.inherited} /></td>
                            <td className="p-3 text-center"><FeatureIcon value={r.hasRunningHeader} inherited={r.inherited} /></td>
                            <td className="p-3 text-center"><FeatureIcon value={r.hasRunningFooter} inherited={r.inherited} /></td>
                            <td className="p-3 text-center"><FeatureIcon value={r.hasToc} inherited={r.inherited} /></td>
                            <td className="p-3 text-center"><FeatureIcon value={r.hasCharts} inherited={r.inherited} /></td>
                            <td className="p-3 text-center">
                              <span className={`text-xs font-bold ${score === 100 ? 'text-emerald-600' : score >= 75 ? 'text-amber-600' : 'text-red-500'}`}>
                                {score}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spec Compliance */}
        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDF Generation Spec v1.0 Compliance</CardTitle>
              <CardDescription>
                Based on PDF_GENERATION_SPEC.md — Cover page, running header, running footer, page numbers, report history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {filtered.map(r => {
                  const t = telemetry.get(r.id);
                  const score = complianceScore(r, t);
                  const checks = [
                    { label: 'Branded Cover Page', pass: r.hasCoverPage },
                    { label: 'Running Header (§1)', pass: r.hasRunningHeader },
                    { label: 'Running Footer (§2)', pass: r.hasRunningFooter },
                    { label: 'Report History', pass: t ? t.totalGenerated > 0 : !!r.inherited },
                  ];
                  const failing = checks.filter(c => !c.pass);

                  return (
                    <div key={r.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {score === 100
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          }
                          <span className="font-medium text-sm">{r.name}</span>
                          {t && (
                            <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${ENGINE_DISPLAY[t.latestEngine].color}`}>
                              {ENGINE_DISPLAY[t.latestEngine].label}
                            </span>
                          )}
                        </div>
                        {failing.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {failing.map(f => (
                              <span key={f.label} className="text-xs bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-1.5 py-0.5 rounded">
                                Missing: {f.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${score === 100 ? 'text-emerald-600' : score >= 75 ? 'text-amber-600' : 'text-red-500'}`}>
                          {score}%
                        </div>
                        <Progress value={score} className="w-16 h-1.5 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Compliance Checks */}
        <TabsContent value="live-checks" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Dynamic Compliance Validator</CardTitle>
                  <CardDescription>
                    Runs each SVG builder with mock data and inspects the output for spec compliance markers
                  </CardDescription>
                </div>
                <Button
                  onClick={handleRunChecks}
                  disabled={isRunning}
                  size="sm"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking {checkProgress.current}...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Run Compliance Check
                    </>
                  )}
                </Button>
              </div>
              {isRunning && (
                <Progress
                  value={checkProgress.total ? (checkProgress.completed / checkProgress.total) * 100 : 0}
                  className="mt-3 h-2"
                />
              )}
            </CardHeader>
            <CardContent>
              {!liveResults && !isRunning && (
                <div className="text-center py-12 text-muted-foreground">
                  <PlayCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Click "Run Compliance Check" to dynamically validate each SVG builder against the spec</p>
                  <p className="text-xs mt-1">This imports each builder, generates pages with mock data, and inspects the SVG output</p>
                </div>
              )}

              {liveResults && (
                <div className="space-y-3">
                  {/* Summary bar */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">{liveResults.filter(r => r.passed).length} passed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">{liveResults.filter(r => !r.passed).length} failed</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Total: {liveResults.reduce((s, r) => s + r.duration, 0)}ms
                    </span>
                  </div>

                  {/* Per-report results */}
                  {liveResults.map(result => (
                    <div key={result.reportId} className="border rounded-lg overflow-hidden">
                      <div className={`flex items-center justify-between p-3 ${result.passed ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                        <div className="flex items-center gap-2">
                          {result.passed
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <XCircle className="h-4 w-4 text-destructive" />
                          }
                          <span className="font-medium text-sm">{result.reportName}</span>
                          {result.error && (
                            <Badge variant="destructive" className="text-xs">Error</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                      </div>

                      {result.error ? (
                        <div className="p-3 text-xs text-destructive bg-card font-mono">
                          {result.error}
                        </div>
                      ) : (
                        <div className="divide-y bg-card">
                          {result.checks.map((check, ci) => (
                            <div key={ci} className="flex items-center justify-between px-3 py-2 text-xs">
                              <div className="flex items-center gap-2">
                                {check.passed
                                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  : <XCircle className="h-3.5 w-3.5 text-destructive" />
                                }
                                <span className="font-medium">{check.name}</span>
                                <span className="text-muted-foreground hidden sm:inline">— {check.description}</span>
                              </div>
                              {check.details && (
                                <span className="text-muted-foreground text-right max-w-[200px] truncate">{check.details}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───

function KpiCard({ title, value, subtitle, progress, color }: {
  title: string;
  value: string;
  subtitle: string;
  progress: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${colorMap[color] || 'text-foreground'}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        <Progress value={progress} className="mt-2 h-1.5" />
      </CardContent>
    </Card>
  );
}
