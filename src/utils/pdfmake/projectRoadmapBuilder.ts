/**
 * Project Roadmap PDF Builder
 * Clean, focused pdfmake implementation for project roadmap exports
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { PDF_COLORS, FONT_SIZES } from './styles';
import { format } from 'date-fns';

// Phase colors for roadmap items
const PHASE_COLORS: Record<string, string> = {
  'Planning & Preparation': '#3b82f6',   // Blue
  'Budget & Assessment': '#22c55e',      // Green
  'Tender & Procurement': '#a855f7',     // Purple
  'Construction': '#f97316',             // Orange
  'Documentation': '#0ea5e9',            // Sky
  'Commissioning': '#ec4899',            // Pink
  'Handover': '#14b8a6',                 // Teal
  default: '#6366f1',                    // Indigo
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#16a34a',
  default: '#64748b',
};

export interface ProjectRoadmapData {
  project: {
    id: string;
    name: string;
    client_name?: string;
    status?: string;
  };
  items: RoadmapItem[];
  company?: {
    company_name?: string;
    company_logo_url?: string;
  };
}

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

export interface RoadmapExportOptions {
  includeCompleted: boolean;
  includePending: boolean;
  includeActionItems: boolean;
  includeMeetingHeader: boolean;
  includeCoverPage: boolean;
}

interface RoadmapNode {
  item: RoadmapItem;
  children: RoadmapNode[];
  level: number;
}

// Helper to get phase color
const getPhaseColor = (phase?: string): string => {
  return PHASE_COLORS[phase || 'default'] || PHASE_COLORS.default;
};

// Helper to get priority color
const getPriorityColor = (priority?: string): string => {
  return PRIORITY_COLORS[priority?.toLowerCase() || 'default'] || PRIORITY_COLORS.default;
};

// Build hierarchical tree from flat items
function buildItemTree(items: RoadmapItem[]): RoadmapNode[] {
  const itemMap = new Map<string, RoadmapNode>();
  const rootNodes: RoadmapNode[] = [];

  // First pass: create nodes
  items.forEach((item) => {
    itemMap.set(item.id, { item, children: [], level: 0 });
  });

  // Second pass: build hierarchy
  items.forEach((item) => {
    const node = itemMap.get(item.id);
    if (!node) return;

    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        node.level = parent.level + 1;
        parent.children.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  // Sort children by sort_order
  const sortNodes = (nodes: RoadmapNode[]) => {
    nodes.sort((a, b) => (a.item.sort_order || 0) - (b.item.sort_order || 0));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(rootNodes);

  return rootNodes;
}

// Group items by phase
function groupByPhase(nodes: RoadmapNode[]): Record<string, RoadmapNode[]> {
  const groups: Record<string, RoadmapNode[]> = {};
  nodes.forEach((node) => {
    const phase = node.item.phase || 'Unassigned';
    if (!groups[phase]) groups[phase] = [];
    groups[phase].push(node);
  });
  return groups;
}

/**
 * Build meeting header content
 */
export function buildMeetingHeader(): Content[] {
  return [
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                { text: 'Project Roadmap Review Meeting', style: 'h1', margin: [0, 0, 0, 8] as Margins },
                { text: `Date: ${format(new Date(), 'PPPP')}`, style: 'body', color: PDF_COLORS.textMuted },
                { text: '', margin: [0, 8, 0, 0] as Margins },
                {
                  columns: [
                    { text: 'Attendees: ________________________________________', style: 'body' },
                    { text: 'Chairperson: ______________________', style: 'body', alignment: 'right' as const },
                  ],
                },
              ],
              fillColor: PDF_COLORS.backgroundAlt,
              margin: [12, 12, 12, 12] as Margins,
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 16] as Margins,
    },
  ];
}

/**
 * Build project header with progress
 */
export function buildProjectHeader(
  project: ProjectRoadmapData['project'],
  totalItems: number,
  completedItems: number,
  pendingItems: number
): Content[] {
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return [
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            {
              stack: [
                { text: project.name, style: 'h1', color: PDF_COLORS.white, margin: [0, 0, 0, 4] as Margins },
                project.client_name
                  ? { text: `Client: ${project.client_name}`, style: 'body', color: 'rgba(255,255,255,0.8)' }
                  : { text: '' },
              ],
              margin: [12, 12, 12, 12] as Margins,
            },
            {
              stack: [
                { text: `${progress}%`, fontSize: 24, bold: true, color: PDF_COLORS.white, alignment: 'center' as const },
                { text: 'Complete', fontSize: 9, color: 'rgba(255,255,255,0.8)', alignment: 'center' as const },
              ],
              margin: [16, 12, 16, 12] as Margins,
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => PDF_COLORS.primary,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 16] as Margins,
    },
    // Quick stats
    {
      columns: [
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: String(totalItems), fontSize: 20, bold: true, color: PDF_COLORS.text },
                    { text: 'Total Items', fontSize: 9, color: PDF_COLORS.textMuted },
                  ],
                  margin: [12, 8, 12, 8] as Margins,
                  alignment: 'center' as const,
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        },
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: String(completedItems), fontSize: 20, bold: true, color: PDF_COLORS.success },
                    { text: 'Completed', fontSize: 9, color: PDF_COLORS.textMuted },
                  ],
                  margin: [12, 8, 12, 8] as Margins,
                  alignment: 'center' as const,
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        },
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: String(pendingItems), fontSize: 20, bold: true, color: PDF_COLORS.warning },
                    { text: 'Pending', fontSize: 9, color: PDF_COLORS.textMuted },
                  ],
                  margin: [12, 8, 12, 8] as Margins,
                  alignment: 'center' as const,
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 20] as Margins,
    },
  ];
}

/**
 * Build a phase section with items
 */
export function buildPhaseSection(phase: string, nodes: RoadmapNode[]): Content[] {
  const phaseColor = getPhaseColor(phase);

  // Build items table
  const itemRows: any[][] = [
    [
      { text: 'Item', style: 'tableHeader' },
      { text: 'Priority', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Due Date', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Status', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Action Items', style: 'tableHeader' },
    ],
  ];

  const flattenNodes = (nodeList: RoadmapNode[], indent = 0): void => {
    nodeList.forEach((node) => {
      const { item } = node;
      const prefix = indent > 0 ? '  '.repeat(indent) + '• ' : '';

      itemRows.push([
        { text: prefix + item.title, style: 'body', margin: [indent * 8, 4, 0, 4] as Margins },
        {
          text: item.priority || '-',
          fontSize: 8,
          color: getPriorityColor(item.priority),
          alignment: 'center' as const,
          margin: [0, 4, 0, 4] as Margins,
        },
        {
          text: item.due_date ? format(new Date(item.due_date), 'dd MMM yyyy') : '-',
          fontSize: 9,
          color: PDF_COLORS.textMuted,
          alignment: 'center' as const,
          margin: [0, 4, 0, 4] as Margins,
        },
        {
          text: item.is_completed ? '✓' : '○',
          fontSize: 12,
          color: item.is_completed ? PDF_COLORS.success : PDF_COLORS.textLight,
          alignment: 'center' as const,
          margin: [0, 2, 0, 4] as Margins,
        },
        { text: '', style: 'body', margin: [0, 4, 0, 4] as Margins }, // Empty for action items
      ]);

      if (node.children.length > 0) {
        flattenNodes(node.children, indent + 1);
      }
    });
  };

  flattenNodes(nodes);

  return [
    // Phase header
    {
      table: {
        widths: ['auto', '*'],
        body: [
          [
            {
              text: '',
              fillColor: phaseColor,
              margin: [0, 0, 0, 0] as Margins,
            },
            {
              text: phase,
              style: 'h2',
              color: PDF_COLORS.text,
              margin: [12, 8, 12, 8] as Margins,
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: (i: number) => (i === 0 ? 4 : 0),
        vLineColor: () => phaseColor,
        fillColor: () => PDF_COLORS.backgroundAlt,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 8] as Margins,
    },
    // Items table
    {
      table: {
        headerRows: 1,
        widths: ['*', 60, 70, 50, 100],
        body: itemRows,
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: (i: number) => (i === 1 ? PDF_COLORS.primary : PDF_COLORS.border),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 4,
        paddingBottom: () => 4,
        fillColor: (i: number) => (i === 0 ? PDF_COLORS.backgroundAlt : null),
      },
      margin: [0, 0, 0, 16] as Margins,
    },
  ];
}

/**
 * Build action items section (blank lines for meeting notes)
 */
export function buildActionItemsSection(): Content[] {
  const lines: any[][] = [];
  for (let i = 0; i < 8; i++) {
    lines.push([
      { text: `${i + 1}.`, style: 'body', width: 20 },
      { text: '____________________________________________________________________________', style: 'body', color: PDF_COLORS.border },
    ]);
  }

  return [
    { text: 'Action Items', style: 'h2', margin: [0, 20, 0, 12] as Margins },
    {
      table: {
        widths: ['auto', '*'],
        body: lines,
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 20] as Margins,
    },
  ];
}

/**
 * Build complete project roadmap document content
 */
export function buildProjectRoadmapContent(
  data: ProjectRoadmapData,
  options: RoadmapExportOptions
): Content[] {
  const content: Content[] = [];
  const { project, items } = data;

  // Filter items based on options
  const filteredItems = items.filter((item) => {
    if (item.is_completed && !options.includeCompleted) return false;
    if (!item.is_completed && !options.includePending) return false;
    return true;
  });

  // Build tree and group by phase
  const tree = buildItemTree(filteredItems);
  const groupedByPhase = groupByPhase(tree);
  const phases = Object.keys(groupedByPhase);

  // Calculate stats
  const completedItems = items.filter((item) => item.is_completed).length;
  const pendingItems = items.filter((item) => !item.is_completed).length;
  const totalItems = items.length;

  // Meeting header
  if (options.includeMeetingHeader) {
    content.push(...buildMeetingHeader());
  }

  // Project header with stats
  content.push(...buildProjectHeader(project, totalItems, completedItems, pendingItems));

  // Phase sections
  phases.forEach((phase) => {
    content.push(...buildPhaseSection(phase, groupedByPhase[phase]));
  });

  // Action items section
  if (options.includeActionItems) {
    content.push(...buildActionItemsSection());
  }

  return content;
}
