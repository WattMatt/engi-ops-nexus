/**
 * CI harness for the PDF structural compliance checker (standard G4).
 *
 * Previously these checks only ran when an admin opened /pdf-compliance.
 * They are structural DOM assertions on the built SVG pages (no
 * rasterization, no jsPDF), so they run fine under jsdom.
 *
 * Run just this suite with: npm run test:pdf-compliance
 *
 * KNOWN_NONCOMPLIANT is the pre-existing debt baseline measured on
 * origin/main (7ff3682e, 2026-08-06): those builders already failed one or
 * more structural checks on the admin dashboard before this harness
 * existed (mostly single-page outputs where the checker expects
 * cover + content pages). The test FAILS if:
 *   - any builder throws while rendering, or
 *   - any builder OUTSIDE the baseline becomes non-compliant (regression).
 * Shrink the baseline as builders get fixed — never grow it without a
 * deliberate decision.
 */
import { describe, it, expect } from 'vitest';
import { runComplianceChecks, type ComplianceCheckResult } from './complianceChecker';

const KNOWN_NONCOMPLIANT = new Set<string>([
  'Payslip',
  'Conversation Export',
  'Lighting Comparison',
  'Analytics Report',
  'Roadmap Export',
  'Cost Report (Full)',
]);

describe('svg-pdf builder structural compliance', () => {
  it('runs all builders, none crash, and no new builder regresses', async () => {
    const results: ComplianceCheckResult[] = await runComplianceChecks();

    // The registry covers the app's report types
    expect(results.length).toBeGreaterThanOrEqual(25);

    // No builder may throw while rendering with mock data
    const crashed = results.filter(r => r.error).map(r => `${r.reportName}: ${r.error}`);
    expect(crashed, `Builders crashed:\n${crashed.join('\n')}`).toEqual([]);

    // No compliance regressions outside the documented baseline
    const failureDetail = (r: ComplianceCheckResult) =>
      r.checks
        .filter(c => !c.passed)
        .map(c => `${c.name}: ${c.details ?? 'failed'}`)
        .join('; ');

    const regressions = results
      .filter(r => !r.passed && !KNOWN_NONCOMPLIANT.has(r.reportName))
      .map(r => `${r.reportName} [${failureDetail(r)}]`);

    expect(regressions, `New non-compliant builders:\n${regressions.join('\n')}`).toEqual([]);

    // Baseline hygiene: flag entries that have been fixed so the baseline shrinks
    const nowPassing = [...KNOWN_NONCOMPLIANT].filter(
      name => results.find(r => r.reportName === name)?.passed,
    );
    expect(
      nowPassing,
      `These builders now pass — remove them from KNOWN_NONCOMPLIANT:\n${nowPassing.join('\n')}`,
    ).toEqual([]);
  }, 60_000);
});
