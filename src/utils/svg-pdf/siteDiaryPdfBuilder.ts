/**
 * Site Diary Tasks SVG-to-PDF Builder
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders, drawStatCards,
  wrapText,
  MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, BRAND_LIGHT, BORDER_COLOR, TEXT_DARK, TEXT_MUTED,
  SUCCESS_COLOR, DANGER_COLOR,
  type StandardCoverPageData, type TableColumn, type StatCard,
} from './sharedSvgHelpers';

interface TaskForPdf {
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  progress: number | null;
  assigned_to_name?: string;
  roadmap_phase?: string;
  roadmap_title?: string;
}

export interface SiteDiaryPdfData {
  coverData: StandardCoverPageData;
  tasks: TaskForPdf[];
  projectName: string;
  filterLabel: string;
}

function statusLabel(s: string): string {
  switch (s) {
    case 'completed': return 'Done';
    case 'in_progress': return 'In Progress';
    case 'pending': return 'Pending';
    case 'cancelled': return 'Cancelled';
    default: return s;
  }
}

function priorityLabel(p: string): string {
  switch (p) {
    case 'critical': return 'Critical';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return p;
  }
}

export function buildSiteDiaryPdf(data: SiteDiaryPdfData): SVGSVGElement[] {
  const { coverData, tasks, filterLabel } = data;

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Summary page
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Tasks Summary');

  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const linked = tasks.filter(t => t.roadmap_title).length;

  let y = drawStatCards(summaryPage, [
    { label: 'Total Tasks', value: String(tasks.length), color: BRAND_PRIMARY },
    { label: 'Completed', value: String(completed), color: SUCCESS_COLOR },
    { label: 'In Progress', value: String(inProgress), color: '#f59e0b' },
    { label: 'Pending', value: String(pending), color: DANGER_COLOR },
  ], MARGIN_TOP + 12);

  y += 4;
  textEl(summaryPage, MARGIN_LEFT + 2, y, `Filter: ${filterLabel}`, { size: 3, fill: TEXT_MUTED });
  y += 5;
  textEl(summaryPage, MARGIN_LEFT + 2, y, `Roadmap Linked: ${linked} of ${tasks.length}`, { size: 3, fill: TEXT_MUTED });

  // 3. Tasks table
  const columns: TableColumn[] = [
    { header: 'Task', width: 55, key: 'title' },
    { header: 'Status', width: 22, key: 'status' },
    { header: 'Priority', width: 20, key: 'priority' },
    { header: 'Due Date', width: 25, key: 'due' },
    { header: 'Progress', width: 18, align: 'right', key: 'progress' },
    { header: 'Assigned To', width: 30, key: 'assigned' },
  ];

  const rows = tasks.map(t => ({
    title: t.title,
    status: statusLabel(t.status),
    priority: priorityLabel(t.priority),
    due: t.due_date ? new Date(t.due_date).toLocaleDateString('en-ZA') : '-',
    progress: t.progress != null ? `${t.progress}%` : '-',
    assigned: t.assigned_to_name || '-',
  }));

  const tablePages = buildTablePages('Task Details', columns, rows);

  const allPages = [coverSvg, summaryPage, ...tablePages];
  applyRunningHeaders(allPages, 'Site Diary Tasks', data.projectName);
  applyPageFooters(allPages, 'Site Diary Tasks');
  return allPages;
}

// ─── Single Diary Entry Export ───
// Migrated from the legacy inline jsPDF+autoTable path in src/pages/SiteDiary.tsx.

export interface SiteDiaryEntryActionItem {
  description: string;
  assignedTo?: string[];
  priority: string; // 'high' | 'medium' | 'low' | 'note'
  completed: boolean;
}

export interface SiteDiaryEntryPdfData {
  projectName?: string;
  projectNumber?: string;
  entryDate: string;    // pre-formatted, e.g. "Monday, June 1, 2026"
  createdTime: string;  // pre-formatted, e.g. "7:30 AM"
  weather?: string;
  dailyLog?: string;
  issues?: string;
  notes?: string;
  actionItems: SiteDiaryEntryActionItem[];
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#dc2626',
  medium: '#f97316',
  low: '#22c55e',
  note: '#64748b',
};

export function buildSiteDiaryEntryPdf(data: SiteDiaryEntryPdfData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const maxY = PAGE_H - MARGIN_BOTTOM - 10;
  const startY = MARGIN_TOP + 14;

  const newPage = (): SVGSVGElement => {
    const page = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page);
    addPageHeader(page, 'Site Diary Entry');
    pages.push(page);
    return page;
  };

  let page = newPage();
  let y = startY;

  const ensureSpace = (needed: number) => {
    if (y + needed > maxY) {
      page = newPage();
      y = startY;
    }
  };

  // Project info
  if (data.projectName) {
    textEl(page, MARGIN_LEFT, y, `Project: ${data.projectName}`, { size: 3, fill: TEXT_MUTED });
    y += 4.5;
  }
  if (data.projectNumber) {
    textEl(page, MARGIN_LEFT, y, `Project #: ${data.projectNumber}`, { size: 3, fill: TEXT_MUTED });
    y += 4.5;
  }
  y += 2;

  // Title
  textEl(page, MARGIN_LEFT, y, 'Site Diary Entry', { size: 6.5, fill: BRAND_PRIMARY, weight: 'bold' });
  y += 8;

  // Date & created time
  textEl(page, MARGIN_LEFT, y, data.entryDate, { size: 3.5, fill: TEXT_MUTED });
  y += 5;
  textEl(page, MARGIN_LEFT, y, `Created: ${data.createdTime}`, { size: 3.5, fill: TEXT_MUTED });
  y += 8;

  // Text sections (split paragraphs on newlines, wrap each line)
  const addTextSection = (heading: string, text?: string) => {
    if (!text) return;
    ensureSpace(14);
    textEl(page, MARGIN_LEFT, y, heading, { size: 4.5, fill: TEXT_DARK, weight: 'bold' });
    y += 6;
    for (const paragraph of text.split(/\r?\n/)) {
      const lines = paragraph.trim() ? wrapText(paragraph, CONTENT_W, 3.2) : [''];
      for (const line of lines) {
        ensureSpace(5);
        textEl(page, MARGIN_LEFT, y, line, { size: 3.2, fill: TEXT_DARK });
        y += 4.5;
      }
    }
    y += 5;
  };

  addTextSection('Weather Conditions', data.weather);
  addTextSection('Daily Log', data.dailyLog);
  addTextSection('Issues & Concerns', data.issues);
  addTextSection('Additional Observations', data.notes);

  // Action items table
  if (data.actionItems.length > 0) {
    ensureSpace(20);
    textEl(page, MARGIN_LEFT, y, 'Action Items & Assignments', { size: 4.5, fill: TEXT_DARK, weight: 'bold' });
    y += 7;

    const rowHeight = 6;
    const cols = [
      { header: '#', width: 8 },
      { header: 'Description', width: 82 },
      { header: 'Assigned To', width: 40 },
      { header: 'Priority', width: 25 },
      { header: 'Status', width: 25 },
    ];

    const drawTableHeader = () => {
      el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: rowHeight, fill: BRAND_PRIMARY }, page);
      let x = MARGIN_LEFT + 1.5;
      for (const col of cols) {
        textEl(page, x, y, col.header, { size: 3, fill: WHITE, weight: 'bold' });
        x += col.width;
      }
      y += rowHeight;
    };

    drawTableHeader();

    data.actionItems.forEach((item, index) => {
      if (y + rowHeight > maxY) {
        page = newPage();
        y = startY;
        drawTableHeader();
      }

      const bg = index % 2 === 0 ? WHITE : BRAND_LIGHT;
      el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: rowHeight, fill: bg }, page);

      const priorityColor = PRIORITY_COLORS[item.priority] || TEXT_MUTED;
      const statusColor = item.completed ? '#22c55e' : '#eab308';

      let x = MARGIN_LEFT + 1.5;
      textEl(page, x, y, String(index + 1), { size: 2.8, fill: TEXT_DARK });
      x += cols[0].width;
      const desc = item.description.length > 55 ? `${item.description.slice(0, 54)}…` : item.description;
      textEl(page, x, y, desc, { size: 2.8, fill: TEXT_DARK });
      x += cols[1].width;
      const assigned = item.assignedTo && item.assignedTo.length > 0 ? item.assignedTo.join(', ') : '-';
      textEl(page, x, y, assigned.length > 26 ? `${assigned.slice(0, 25)}…` : assigned, { size: 2.8, fill: TEXT_DARK });
      x += cols[2].width;
      el('circle', { cx: x + 1.2, cy: y - 1, r: 1.1, fill: priorityColor }, page);
      textEl(page, x + 3.5, y, item.priority.toUpperCase(), { size: 2.8, fill: priorityColor, weight: 'bold' });
      x += cols[3].width;
      el('circle', { cx: x + 1.2, cy: y - 1, r: 1.1, fill: statusColor }, page);
      textEl(page, x + 3.5, y, item.completed ? 'Done' : 'Pending', { size: 2.8, fill: statusColor, weight: 'bold' });

      el('line', {
        x1: MARGIN_LEFT, y1: y + rowHeight - 3.5,
        x2: PAGE_W - MARGIN_RIGHT, y2: y + rowHeight - 3.5,
        stroke: BORDER_COLOR, 'stroke-width': 0.15,
      }, page);

      y += rowHeight;
    });
  }

  applyPageFooters(pages, 'Site Diary Entry', false);
  return pages;
}
