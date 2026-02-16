/**
 * Project Roadmap Export PDF Builder — SVG engine
 */
import {
  createSvgElement, el, textEl, addPageHeader,
  buildStandardCoverPageSvg, applyPageFooters,
  MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, PAGE_W, PAGE_H,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, TEXT_DARK, TEXT_MUTED,
  BORDER_COLOR, WHITE, SUCCESS_COLOR, DANGER_COLOR,
  type StandardCoverPageData,
} from './sharedSvgHelpers';
import { format } from 'date-fns';

const PHASE_COLORS: Record<string, string> = {
  'Planning & Preparation': '#3b82f6',
  'Budget & Assessment': '#22c55e',
  'Tender & Procurement': '#a855f7',
  'Construction': '#f97316',
  'Documentation': '#0ea5e9',
  'Commissioning': '#ec4899',
  'Handover': '#14b8a6',
  default: '#6366f1',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#dc2626', medium: '#d97706', low: '#16a34a', default: '#64748b',
};

export interface RoadmapItem {
  id: string;
  title: string;
  phase?: string;
  priority?: string;
  start_date?: string;
  due_date?: string;
  is_completed?: boolean;
  description?: string;
  comments?: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface RoadmapExportPdfData {
  coverData?: StandardCoverPageData;
  project: { id: string; name: string; client_name?: string; status?: string };
  items: RoadmapItem[];
  options: {
    includeCompleted: boolean;
    includePending: boolean;
    includeActionItems: boolean;
    includeMeetingHeader: boolean;
    includeCoverPage: boolean;
  };
}

interface TreeNode { item: RoadmapItem; children: TreeNode[]; level: number }

function buildTree(items: RoadmapItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  items.forEach(i => map.set(i.id, { item: i, children: [], level: 0 }));
  items.forEach(i => {
    const node = map.get(i.id)!;
    if (i.parent_id && map.has(i.parent_id)) {
      const parent = map.get(i.parent_id)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else roots.push(node);
  });
  const sort = (ns: TreeNode[]) => { ns.sort((a, b) => (a.item.sort_order || 0) - (b.item.sort_order || 0)); ns.forEach(n => sort(n.children)); };
  sort(roots);
  return roots;
}

function groupByPhase(nodes: TreeNode[]): Record<string, TreeNode[]> {
  const g: Record<string, TreeNode[]> = {};
  nodes.forEach(n => { const p = n.item.phase || 'Unassigned'; (g[p] ??= []).push(n); });
  return g;
}

function flattenNodes(nodes: TreeNode[]): { item: RoadmapItem; indent: number }[] {
  const out: { item: RoadmapItem; indent: number }[] = [];
  const walk = (ns: TreeNode[], indent: number) => { ns.forEach(n => { out.push({ item: n.item, indent }); walk(n.children, indent + 1); }); };
  walk(nodes, 0);
  return out;
}

export function buildRoadmapExportPdf(data: RoadmapExportPdfData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const { project, items, options } = data;

  // Cover page
  if (options.includeCoverPage && data.coverData) {
    pages.push(buildStandardCoverPageSvg(data.coverData));
  }

  // Filter items
  const filtered = items.filter(i => {
    if (i.is_completed && !options.includeCompleted) return false;
    if (!i.is_completed && !options.includePending) return false;
    return true;
  });

  const tree = buildTree(filtered);
  const grouped = groupByPhase(tree);
  const phases = Object.keys(grouped);
  const completed = items.filter(i => i.is_completed).length;
  const pending = items.length - completed;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  // Content page
  let svg = createSvgElement();
  addPageHeader(svg, 'Project Roadmap');
  let y = MARGIN_TOP + 12;

  // Meeting header
  if (options.includeMeetingHeader) {
    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 18, fill: '#f1f5f9', rx: 1 }, svg);
    textEl(svg, MARGIN_LEFT + 4, y + 5, 'Project Roadmap Review Meeting', { size: 5, fill: BRAND_PRIMARY, weight: 'bold' });
    textEl(svg, MARGIN_LEFT + 4, y + 10, `Date: ${format(new Date(), 'PPPP')}`, { size: 3, fill: TEXT_MUTED });
    textEl(svg, MARGIN_LEFT + 4, y + 15, 'Attendees: ___________________________   Chairperson: ___________________________', { size: 3, fill: TEXT_MUTED });
    y += 22;
  }

  // Project header bar
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 14, fill: BRAND_PRIMARY, rx: 1 }, svg);
  textEl(svg, MARGIN_LEFT + 4, y + 5, project.name, { size: 5, fill: WHITE, weight: 'bold' });
  if (project.client_name) textEl(svg, MARGIN_LEFT + 4, y + 10, `Client: ${project.client_name}`, { size: 3, fill: 'rgba(255,255,255,0.8)' });
  textEl(svg, PAGE_W - MARGIN_RIGHT - 4, y + 7, `${progress}%`, { size: 7, fill: WHITE, weight: 'bold', anchor: 'end' });
  y += 18;

  // Stats cards
  const cardW = CONTENT_W / 3 - 2;
  [{ label: 'Total Items', val: items.length, color: TEXT_DARK },
   { label: 'Completed', val: completed, color: SUCCESS_COLOR },
   { label: 'Pending', val: pending, color: '#d97706' }].forEach((s, i) => {
    const cx = MARGIN_LEFT + i * (cardW + 3);
    el('rect', { x: cx, y, width: cardW, height: 12, fill: WHITE, stroke: BORDER_COLOR, 'stroke-width': 0.3, rx: 1 }, svg);
    textEl(svg, cx + cardW / 2, y + 5, String(s.val), { size: 6, fill: s.color, weight: 'bold', anchor: 'middle' });
    textEl(svg, cx + cardW / 2, y + 10, s.label, { size: 2.5, fill: TEXT_MUTED, anchor: 'middle' });
  });
  y += 16;

  // Phase sections
  for (const phase of phases) {
    const flat = flattenNodes(grouped[phase]);
    const neededH = 10 + flat.length * 6 + 8;
    if (y + neededH > PAGE_H - 20) {
      pages.push(svg);
      svg = createSvgElement();
      addPageHeader(svg, 'Project Roadmap');
      y = MARGIN_TOP + 12;
    }

    const phaseColor = PHASE_COLORS[phase] || PHASE_COLORS.default;
    // Phase header
    el('rect', { x: MARGIN_LEFT, y, width: 3, height: 7, fill: phaseColor, rx: 0.5 }, svg);
    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 7, fill: '#f1f5f9', rx: 1 }, svg);
    el('rect', { x: MARGIN_LEFT, y, width: 3, height: 7, fill: phaseColor }, svg);
    textEl(svg, MARGIN_LEFT + 6, y + 5, phase, { size: 4, fill: TEXT_DARK, weight: 'bold' });
    y += 9;

    // Table header
    const cols = [CONTENT_W * 0.4, CONTENT_W * 0.12, CONTENT_W * 0.18, CONTENT_W * 0.1, CONTENT_W * 0.2];
    const hdrs = ['Item', 'Priority', 'Due Date', 'Status', 'Notes'];
    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 5.5, fill: '#f1f5f9' }, svg);
    let cx = MARGIN_LEFT;
    hdrs.forEach((h, i) => {
      textEl(svg, cx + 2, y + 3.8, h, { size: 2.5, fill: TEXT_MUTED, weight: 'bold' });
      cx += cols[i];
    });
    y += 5.5;

    flat.forEach((f, ri) => {
      if (y + 6 > PAGE_H - 20) {
        pages.push(svg);
        svg = createSvgElement();
        addPageHeader(svg, 'Project Roadmap');
        y = MARGIN_TOP + 12;
      }
      const rowFill = ri % 2 === 0 ? WHITE : '#fafbfc';
      el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 5.5, fill: rowFill }, svg);
      cx = MARGIN_LEFT;
      const prefix = f.indent > 0 ? '  '.repeat(f.indent) + '• ' : '';
      textEl(svg, cx + 2, y + 3.8, prefix + f.item.title, { size: 2.8, fill: TEXT_DARK });
      cx += cols[0];
      const pColor = PRIORITY_COLORS[f.item.priority?.toLowerCase() || 'default'] || PRIORITY_COLORS.default;
      textEl(svg, cx + cols[1] / 2, y + 3.8, f.item.priority || '-', { size: 2.5, fill: pColor, anchor: 'middle' });
      cx += cols[1];
      textEl(svg, cx + cols[2] / 2, y + 3.8, f.item.due_date ? format(new Date(f.item.due_date), 'dd MMM yyyy') : '-', { size: 2.5, fill: TEXT_MUTED, anchor: 'middle' });
      cx += cols[2];
      const statusChar = f.item.is_completed ? 'C' : 'P';
      const statusColor = f.item.is_completed ? SUCCESS_COLOR : TEXT_MUTED;
      el('circle', { cx: cx + cols[3] / 2, cy: y + 2.8, r: 2, fill: statusColor }, svg);
      textEl(svg, cx + cols[3] / 2, y + 3.5, statusChar, { size: 2, fill: WHITE, weight: 'bold', anchor: 'middle' });
      cx += cols[3];
      // Empty notes column
      y += 5.5;
    });

    el('line', { x1: MARGIN_LEFT, y1: y, x2: PAGE_W - MARGIN_RIGHT, y2: y, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, svg);
    y += 6;
  }

  // Action items
  if (options.includeActionItems) {
    if (y + 50 > PAGE_H - 20) {
      pages.push(svg);
      svg = createSvgElement();
      addPageHeader(svg, 'Project Roadmap');
      y = MARGIN_TOP + 12;
    }
    textEl(svg, MARGIN_LEFT, y + 4, 'Action Items', { size: 5, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 10;
    for (let i = 0; i < 8; i++) {
      textEl(svg, MARGIN_LEFT, y + 3, `${i + 1}.`, { size: 3, fill: TEXT_MUTED });
      el('line', { x1: MARGIN_LEFT + 6, y1: y + 4, x2: PAGE_W - MARGIN_RIGHT, y2: y + 4, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, svg);
      y += 6;
    }
  }

  pages.push(svg);
  applyPageFooters(pages, 'Project Roadmap', options.includeCoverPage);
  return pages;
}
