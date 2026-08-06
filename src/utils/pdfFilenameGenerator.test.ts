import { describe, it, expect } from 'vitest';
import {
  composeReportStorageFilename,
  generateStandardizedPDFFilename,
  stripPdfExtension,
} from './pdfFilenameGenerator';

describe('stripPdfExtension', () => {
  it('strips a trailing .pdf', () => {
    expect(stripPdfExtension('Report.pdf')).toBe('Report');
  });

  it('is case-insensitive', () => {
    expect(stripPdfExtension('Report.PDF')).toBe('Report');
    expect(stripPdfExtension('Report.Pdf')).toBe('Report');
  });

  it('strips repeated .pdf extensions', () => {
    expect(stripPdfExtension('Report.pdf.pdf')).toBe('Report');
  });

  it('leaves names without extension untouched', () => {
    expect(stripPdfExtension('Report')).toBe('Report');
  });

  it('does not strip .pdf mid-name', () => {
    expect(stripPdfExtension('Report.pdf_final')).toBe('Report.pdf_final');
  });
});

describe('composeReportStorageFilename', () => {
  it('composes name_revision_timestamp.pdf', () => {
    expect(composeReportStorageFilename('CostReport', 'R01', 1748736000000)).toBe(
      'CostReport_R01_1748736000000.pdf',
    );
  });

  it('never produces a double extension when reportName already ends in .pdf', () => {
    const result = composeReportStorageFilename(
      'PROJ-123_CostReport_RevA_2026-06-01.pdf',
      'A',
      1748736000000,
    );
    expect(result).toBe('PROJ-123_CostReport_RevA_2026-06-01_A_1748736000000.pdf');
    expect(result.match(/\.pdf/gi)).toHaveLength(1);
  });

  it('sanitizes unsafe characters to underscores', () => {
    expect(composeReportStorageFilename('My Report (Final)/v2', 'R02', 42)).toBe(
      'My_Report__Final__v2_R02_42.pdf',
    );
  });

  it('accepts the output of generateStandardizedPDFFilename without doubling', () => {
    const standardized = generateStandardizedPDFFilename({
      projectNumber: '123',
      reportType: 'CostReport',
      reportNumber: 7,
      revision: 'A',
    });
    expect(standardized.endsWith('.pdf')).toBe(true);
    const composed = composeReportStorageFilename(standardized, 'A', 1);
    expect(composed.match(/\.pdf/gi)).toHaveLength(1);
    expect(composed.endsWith('_A_1.pdf')).toBe(true);
  });

  it('defaults the timestamp when omitted', () => {
    const before = Date.now();
    const result = composeReportStorageFilename('Report', 'R01');
    const after = Date.now();
    const ts = Number(result.match(/_R01_(\d+)\.pdf$/)?.[1]);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
