/**
 * Roadmap Review SVG PDF Builder
 * Phase 4 migration: replaces pdfmake-based generate-roadmap-pdf
 * Features: milestone timeline, score charts, recommendation sections
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTableOfContentsSvg, applyRunningHeaders, applyPageFooters,
  addPageHeader, buildTablePages, drawStatCards,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, TEXT_DARK, TEXT_MUTED,
  WHITE, BORDER_COLOR, wrapText,
  type StandardCoverPageData, type TableColumn, type TocEntry, type StatCard,
} from './sharedSvgHelpers';
import { drawBarChart, drawGaugeChart, type BarChartItem } from './svgChartHelpers';

export interface RoadmapReviewData {
  coverData: StandardCoverPageData;
  projectName: string;
  overallScore: number;
  reviewDate: string;
  focusAreas: string[];
  categories: ReviewCategory[];
  milestones: Milestone[];
  recommendations: string[];
}

interface ReviewCategory {
  name: string;
  score: number;
  maxScore: number;
  findings: string[];
}

interface Milestone {
  title: string;
  targetDate: string;
  status: 'completed' | 'in_progress' | 'pending' | 'overdue';
  notes?: string;
}

export function buildRoadmapReviewPdf(data: RoadmapReviewData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. Summary
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Review Summary');

  let y = MARGIN_TOP + 14;
  const completed = data.milestones.filter(m => m.status === 'completed').length;
  const stats: StatCard[] = [
    { label: 'Overall Score', value: `${data.overallScore}%`, color: data.overallScore >= 70 ? '#16a34a' : '#f59e0b' },
    { label: 'Review Date', value: data.reviewDate, color: BRAND_PRIMARY },
    { label: 'Milestones Done', value: `${completed}/${data.milestones.length}`, color: BRAND_ACCENT },
    { label: 'Focus Areas', value: String(data.focusAreas.length), color: '#8b5cf6' },
  ];
  y = drawStatCards(summaryPage, stats, y);
  y += 8;

  // Overall gauge
  drawGaugeChart(summaryPage, data.overallScore, PAGE_W / 2, y + 20, 22, { label: 'Overall Health' });
  y += 50;

  // Focus areas
  if (data.focusAreas.length > 0) {
    textEl(summaryPage, MARGIN_LEFT, y, 'Focus Areas', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 5;
    data.focusAreas.forEach(area => {
      textEl(summaryPage, MARGIN_LEFT + 4, y, `• ${area}`, { size: 3, fill: TEXT_DARK });
      y += 4.5;
    });
  }
  pages.push(summaryPage);

  // 3. Category scores
  if (data.categories.length > 0) {
    const catPage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, catPage);
    addPageHeader(catPage, 'Category Scores');
    let cy = MARGIN_TOP + 14;

    const barItems: BarChartItem[] = data.categories.map(c => ({
      label: c.name,
      value: c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0,
    }));
    cy = drawBarChart(catPage, barItems, MARGIN_LEFT, cy, CONTENT_W, { barHeight: 7, gap: 4 });
    cy += 8;

    // Findings
    for (const cat of data.categories) {
      if (cat.findings.length > 0 && cy < PAGE_H - MARGIN_BOTTOM - 30) {
        textEl(catPage, MARGIN_LEFT, cy, cat.name, { size: 3.5, fill: BRAND_PRIMARY, weight: 'bold' });
        cy += 5;
        for (const finding of cat.findings) {
          if (cy > PAGE_H - MARGIN_BOTTOM - 10) break;
          textEl(catPage, MARGIN_LEFT + 4, cy, `- ${finding}`, { size: 2.8, fill: TEXT_DARK });
          cy += 4;
        }
        cy += 3;
      }
    }
    pages.push(catPage);
  }

  // 4. Milestones table
  if (data.milestones.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Milestone', width: 55, key: 'title' },
      { header: 'Target Date', width: 30, align: 'center', key: 'targetDate' },
      { header: 'Status', width: 25, align: 'center', key: 'status' },
      { header: 'Notes', width: 40, key: 'notes' },
    ];
    const rows = data.milestones.map(m => ({ ...m, notes: m.notes || '' }));
    pages.push(...buildTablePages('Milestone Tracker', cols, rows));
  }

  // 5. Recommendations
  if (data.recommendations.length > 0) {
    const recPage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, recPage);
    addPageHeader(recPage, 'Recommendations');
    let ry = MARGIN_TOP + 14;
    data.recommendations.forEach((rec, i) => {
      const lines = wrapText(`${i + 1}. ${rec}`, CONTENT_W - 5, 3.2);
      for (const line of lines) {
        textEl(recPage, MARGIN_LEFT + 2, ry, line, { size: 3.2 });
        ry += 4.5;
      }
      ry += 2;
    });
    pages.push(recPage);
  }

  // TOC
  const tocEntries: TocEntry[] = [
    { label: 'Review Summary', pageNumber: 2 },
  ];
  if (data.categories.length > 0) tocEntries.push({ label: 'Category Scores', pageNumber: 3 });
  if (data.milestones.length > 0) tocEntries.push({ label: 'Milestone Tracker', pageNumber: 4, indent: true });
  if (data.recommendations.length > 0) tocEntries.push({ label: 'Recommendations', pageNumber: pages.length });
  const tocPage = buildTableOfContentsSvg(tocEntries);
  pages.splice(1, 0, tocPage);

  applyRunningHeaders(pages, 'Roadmap Review', data.projectName);
  applyPageFooters(pages, 'Roadmap Review');

  return pages;
}
