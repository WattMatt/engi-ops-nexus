/**
 * PDF Migration & Compliance Dashboard
 * 
 * Real-time view of migration status and PDF spec compliance for all 20 report types.
 */
import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  FileText, Server, Monitor, Search, Clock, PlayCircle, Loader2,
} from "lucide-react";
import { runComplianceChecks, type ComplianceCheckResult } from "@/utils/svg-pdf/complianceChecker";

// ─── Report Registry ───

type Engine = 'svg' | 'pdfshift' | 'pdfmake' | 'jspdf-legacy';
type MigrationStatus = 'migrated' | 'pending' | 'in-progress' | 'not-applicable';
type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface ReportSpec {
  id: string;
  name: string;
  engine: Engine;
  location: string;
  phase: Phase;
  migrationStatus: MigrationStatus;
  hasHistory: boolean;
  hasCoverPage: boolean;
  hasRunningHeader: boolean;
  hasRunningFooter: boolean;
  hasToc: boolean;
  hasCharts: boolean;
  hasExecutiveSummary: boolean;
  specCompliant: boolean;
  notes?: string;
}

const REPORTS: ReportSpec[] = [
  // SVG Engine (Migrated)
  { id: 'cost-report', name: 'Cost Report', engine: 'svg', location: 'src/utils/svg-pdf/costReportPdfBuilder.ts', phase: 0, migrationStatus: 'migrated', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true, hasExecutiveSummary: true, specCompliant: true, notes: 'Baseline reference implementation' },
  { id: 'final-account', name: 'Final Account', engine: 'svg', location: 'src/utils/svg-pdf/finalAccountPdfBuilder.ts', phase: 0, migrationStatus: 'migrated', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true },
  { id: 'specification', name: 'Specification', engine: 'svg', location: 'src/utils/svg-pdf/specificationPdfBuilder.ts', phase: 0, migrationStatus: 'migrated', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true },
  { id: 'tenant-completion', name: 'Tenant Completion', engine: 'svg', location: 'src/utils/svg-pdf/handoverCompletionPdfBuilder.ts', phase: 0, migrationStatus: 'migrated', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true },
  { id: 'project-outline', name: 'Project Outline', engine: 'svg', location: 'src/utils/svg-pdf/projectOutlinePdfBuilder.ts', phase: 0, migrationStatus: 'migrated', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true },
  { id: 'site-diary', name: 'Site Diary', engine: 'svg', location: 'src/utils/svg-pdf/siteDiaryPdfBuilder.ts', phase: 0, migrationStatus: 'migrated', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true },
  { id: 'ai-prediction', name: 'AI Prediction', engine: 'svg', location: 'src/utils/svg-pdf/aiPredictionPdfBuilder.ts', phase: 1, migrationStatus: 'migrated', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true, hasExecutiveSummary: true, specCompliant: true, notes: 'Phase 1 migration complete' },

  // PDFShift (Pending migration)
  { id: 'cable-schedule', name: 'Cable Schedule', engine: 'pdfshift', location: 'supabase/functions/generate-cable-schedule-pdf/', phase: 2, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true, notes: 'Landscape tables, many columns' },
  { id: 'generator-report', name: 'Generator Report', engine: 'pdfshift', location: 'supabase/functions/generate-generator-report-pdf/', phase: 3, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: true, hasExecutiveSummary: false, specCompliant: true, notes: 'SVG donut charts, financial calcs' },
  { id: 'bulk-services', name: 'Bulk Services', engine: 'pdfshift', location: 'supabase/functions/generate-bulk-services-pdf/', phase: 3, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true, notes: 'Technical calculations' },
  { id: 'floor-plan', name: 'Floor Plan', engine: 'pdfshift', location: 'supabase/functions/generate-floor-plan-pdf/', phase: 3, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true, notes: 'Image rendering, annotations' },
  { id: 'electrical-budget', name: 'Electrical Budget', engine: 'pdfshift', location: 'supabase/functions/generate-electrical-budget-pdf/', phase: 2, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: false, hasExecutiveSummary: false, specCompliant: true, notes: 'Complex BOQ hierarchy' },
  { id: 'tenant-tracker', name: 'Tenant Tracker', engine: 'pdfshift', location: 'supabase/functions/generate-tenant-tracker-pdf/', phase: 2, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true },
  { id: 'legend-card', name: 'Legend Card', engine: 'pdfshift', location: 'supabase/functions/generate-legend-card-pdf/', phase: 2, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true },
  { id: 'verification-cert', name: 'Verification Certificate', engine: 'pdfshift', location: 'supabase/functions/generate-verification-certificate-pdf/', phase: 2, migrationStatus: 'pending', hasHistory: false, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: false, notes: 'Partial history only' },
  { id: 'cost-report-server', name: 'Cost Report (Server)', engine: 'pdfshift', location: 'supabase/functions/generate-cost-report-pdf/', phase: 3, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true, notes: 'Dual-engine — serves scheduled emails' },
  { id: 'template-pdf', name: 'Template PDF', engine: 'pdfshift', location: 'supabase/functions/generate-template-pdf/', phase: 2, migrationStatus: 'pending', hasHistory: false, hasCoverPage: false, hasRunningHeader: false, hasRunningFooter: false, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: false, notes: 'No history or cover page' },

  // pdfmake (Pending migration)
  { id: 'roadmap-review', name: 'Roadmap Review', engine: 'pdfmake', location: 'supabase/functions/generate-roadmap-pdf/', phase: 4, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: true, hasCharts: true, hasExecutiveSummary: false, specCompliant: true, notes: 'Most complex pdfmake report' },
  { id: 'tenant-evaluation', name: 'Tenant Evaluation', engine: 'pdfmake', location: 'supabase/functions/generate-tenant-evaluation-pdf/', phase: 4, migrationStatus: 'pending', hasHistory: true, hasCoverPage: true, hasRunningHeader: true, hasRunningFooter: true, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: true },

  // Scheduled (not applicable)
  { id: 'scheduled-reports', name: 'Scheduled Reports', engine: 'pdfshift', location: 'supabase/functions/send-scheduled-report/', phase: 5, migrationStatus: 'not-applicable', hasHistory: false, hasCoverPage: false, hasRunningHeader: false, hasRunningFooter: false, hasToc: false, hasCharts: false, hasExecutiveSummary: false, specCompliant: false, notes: 'Delegates to other EFs' },
];

// ─── Helpers ───

const ENGINE_LABELS: Record<Engine, { label: string; color: string; icon: typeof Monitor }> = {
  svg: { label: 'SVG Engine', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Monitor },
  pdfshift: { label: 'PDFShift', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Server },
  pdfmake: { label: 'pdfmake', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Server },
  'jspdf-legacy': { label: 'jsPDF Legacy', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: FileText },
};

const STATUS_CONFIG: Record<MigrationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  migrated: { label: 'Migrated', variant: 'default' },
  'in-progress': { label: 'In Progress', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'outline' },
  'not-applicable': { label: 'N/A', variant: 'secondary' },
};

function complianceScore(report: ReportSpec): number {
  const checks = [
    report.hasCoverPage,
    report.hasRunningHeader,
    report.hasRunningFooter,
    report.hasHistory,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function FeatureIcon({ value }: { value: boolean }) {
  return value
    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    : <XCircle className="h-4 w-4 text-muted-foreground/40" />;
}

// ─── Component ───

export default function PdfComplianceDashboard() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [liveResults, setLiveResults] = useState<ComplianceCheckResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ completed: 0, total: 0, current: '' });

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
    if (!search) return REPORTS;
    const q = search.toLowerCase();
    return REPORTS.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.engine.toLowerCase().includes(q) ||
      r.migrationStatus.includes(q)
    );
  }, [search]);

  const migrated = REPORTS.filter(r => r.migrationStatus === 'migrated');
  const pending = REPORTS.filter(r => r.migrationStatus === 'pending');
  const migratedPct = Math.round((migrated.length / REPORTS.filter(r => r.migrationStatus !== 'not-applicable').length) * 100);

  const specCompliant = REPORTS.filter(r => r.specCompliant);
  const specPct = Math.round((specCompliant.length / REPORTS.length) * 100);

  const avgCompliance = Math.round(REPORTS.reduce((sum, r) => sum + complianceScore(r), 0) / REPORTS.length);

  const byPhase = useMemo(() => {
    const map = new Map<Phase, ReportSpec[]>();
    REPORTS.forEach(r => {
      const arr = map.get(r.phase) || [];
      arr.push(r);
      map.set(r.phase, arr);
    });
    return map;
  }, []);

  const phaseLabels: Record<Phase, string> = {
    0: 'Foundation & Baseline',
    1: 'Simple Client Migrations',
    2: 'Data-Heavy Reports',
    3: 'Visual Reports',
    4: 'pdfmake Migration',
    5: 'Scheduled Adaptation',
    6: 'Cleanup & Deprecation',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">PDF Migration Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time migration status and spec compliance for all 20 report types
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Migration Progress"
          value={`${migrated.length}/${REPORTS.filter(r => r.migrationStatus !== 'not-applicable').length}`}
          subtitle={`${migratedPct}% complete`}
          progress={migratedPct}
          color="emerald"
        />
        <KpiCard
          title="Spec Compliant"
          value={`${specCompliant.length}/${REPORTS.length}`}
          subtitle={`${specPct}% passing`}
          progress={specPct}
          color="blue"
        />
        <KpiCard
          title="Avg Feature Score"
          value={`${avgCompliance}%`}
          subtitle="Cover, Header, Footer, History"
          progress={avgCompliance}
          color="violet"
        />
        <KpiCard
          title="Engines Active"
          value={new Set(REPORTS.map(r => r.engine)).size.toString()}
          subtitle="Target: 1 (SVG only)"
          progress={Math.round((1 / new Set(REPORTS.map(r => r.engine)).size) * 100)}
          color="amber"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="overview">All Reports</TabsTrigger>
            <TabsTrigger value="phases">By Phase</TabsTrigger>
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

        {/* All Reports Table */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Report</th>
                      <th className="text-left p-3 font-medium">Engine</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Phase</th>
                      <th className="text-center p-3 font-medium">Cover</th>
                      <th className="text-center p-3 font-medium">Header</th>
                      <th className="text-center p-3 font-medium">Footer</th>
                      <th className="text-center p-3 font-medium">TOC</th>
                      <th className="text-center p-3 font-medium">Charts</th>
                      <th className="text-center p-3 font-medium">History</th>
                      <th className="text-center p-3 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const engineCfg = ENGINE_LABELS[r.engine];
                      const statusCfg = STATUS_CONFIG[r.migrationStatus];
                      const score = complianceScore(r);
                      return (
                        <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-medium">{r.name}</div>
                            {r.notes && <div className="text-xs text-muted-foreground mt-0.5">{r.notes}</div>}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${engineCfg.color}`}>
                              {engineCfg.label}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={statusCfg.variant} className="text-xs">
                              {statusCfg.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">{r.phase}</td>
                          <td className="p-3 text-center"><FeatureIcon value={r.hasCoverPage} /></td>
                          <td className="p-3 text-center"><FeatureIcon value={r.hasRunningHeader} /></td>
                          <td className="p-3 text-center"><FeatureIcon value={r.hasRunningFooter} /></td>
                          <td className="p-3 text-center"><FeatureIcon value={r.hasToc} /></td>
                          <td className="p-3 text-center"><FeatureIcon value={r.hasCharts} /></td>
                          <td className="p-3 text-center"><FeatureIcon value={r.hasHistory} /></td>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Phase */}
        <TabsContent value="phases" className="mt-4 space-y-4">
          {([0, 1, 2, 3, 4, 5, 6] as Phase[]).map(phase => {
            const reports = byPhase.get(phase) || [];
            if (reports.length === 0) return null;
            const done = reports.filter(r => r.migrationStatus === 'migrated').length;
            const pct = Math.round((done / reports.length) * 100);

            return (
              <Card key={phase}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Phase {phase}: {phaseLabels[phase]}</CardTitle>
                      <CardDescription>{done}/{reports.length} reports migrated</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="w-24 h-2" />
                      <span className="text-sm font-medium text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2">
                    {reports.map(r => {
                      const statusCfg = STATUS_CONFIG[r.migrationStatus];
                      const engineCfg = ENGINE_LABELS[r.engine];
                      return (
                        <div key={r.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{r.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${engineCfg.color}`}>{engineCfg.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.migrationStatus === 'migrated' && (
                              <span className="text-xs text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Done
                              </span>
                            )}
                            {r.migrationStatus === 'pending' && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> Pending
                              </span>
                            )}
                            {r.migrationStatus === 'in-progress' && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <ArrowRight className="h-3.5 w-3.5" /> In Progress
                              </span>
                            )}
                            {r.migrationStatus === 'not-applicable' && (
                              <Badge variant="secondary" className="text-xs">N/A</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Spec Compliance */}
        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDF Generation Spec v1.0 Compliance</CardTitle>
              <CardDescription>
                Based on PDF_GENERATION_SPEC.md — Cover page, running header, running footer, page numbers, table integrity, report history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {filtered.map(r => {
                  const score = complianceScore(r);
                  const checks = [
                    { label: 'Branded Cover Page', pass: r.hasCoverPage },
                    { label: 'Running Header (§1)', pass: r.hasRunningHeader },
                    { label: 'Running Footer (§2)', pass: r.hasRunningFooter },
                    { label: 'Report History', pass: r.hasHistory },
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
                          <Badge variant={STATUS_CONFIG[r.migrationStatus].variant} className="text-xs ml-auto">
                            {ENGINE_LABELS[r.engine].label}
                          </Badge>
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
