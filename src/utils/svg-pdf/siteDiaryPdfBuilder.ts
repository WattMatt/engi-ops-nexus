/**
 * Site Diary Tasks SVG-to-PDF Builder
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, drawStatCards,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H,
  WHITE, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED,
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
  applyPageFooters(allPages, 'Site Diary Tasks');
  return allPages;
}
