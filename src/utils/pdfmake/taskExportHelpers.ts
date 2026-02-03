/**
 * Task Export Helpers for Site Diary PDF
 * 
 * Provides utilities for exporting tasks with roadmap context
 */

import type { Content, TableCell } from 'pdfmake/interfaces';
import { format } from 'date-fns';

export interface TaskForExport {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  progress: number;
  roadmap_item_id: string | null;
  profiles?: { full_name: string | null } | null;
  roadmap_item?: { title: string; phase: string | null } | null;
}

export interface RoadmapGroupedTasks {
  phase: string;
  roadmapItem: string;
  tasks: TaskForExport[];
}

/**
 * Group tasks by their roadmap phase and item
 */
export function groupTasksByRoadmap(tasks: TaskForExport[]): RoadmapGroupedTasks[] {
  const groups: Record<string, RoadmapGroupedTasks> = {};
  
  // First, group linked tasks
  tasks.forEach((task) => {
    if (task.roadmap_item) {
      const key = `${task.roadmap_item.phase || 'No Phase'}-${task.roadmap_item.title}`;
      if (!groups[key]) {
        groups[key] = {
          phase: task.roadmap_item.phase || 'No Phase',
          roadmapItem: task.roadmap_item.title,
          tasks: [],
        };
      }
      groups[key].tasks.push(task);
    }
  });
  
  // Then handle unlinked tasks
  const unlinkedTasks = tasks.filter((t) => !t.roadmap_item);
  if (unlinkedTasks.length > 0) {
    groups['_unlinked'] = {
      phase: 'Unlinked',
      roadmapItem: 'Tasks Not Linked to Roadmap',
      tasks: unlinkedTasks,
    };
  }
  
  // Sort groups by phase (unlinked last)
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === '_unlinked') return 1;
    if (b === '_unlinked') return -1;
    return a.localeCompare(b);
  });
  
  return sortedKeys.map((key) => groups[key]);
}

/**
 * Build PDFMake content for tasks with roadmap grouping
 */
export function buildTasksWithRoadmapContent(
  tasks: TaskForExport[],
  options: { includeRoadmapGrouping?: boolean } = {}
): Content[] {
  const { includeRoadmapGrouping = true } = options;
  const content: Content[] = [];
  
  if (!tasks || tasks.length === 0) {
    content.push({
      text: 'No tasks to display',
      style: 'subheader',
      margin: [0, 10, 0, 10],
    });
    return content;
  }

  if (includeRoadmapGrouping) {
    const groups = groupTasksByRoadmap(tasks);
    
    groups.forEach((group, groupIndex) => {
      // Phase/Roadmap Item Header
      content.push({
        columns: [
          {
            text: group.phase,
            style: 'tableHeader',
            width: 'auto',
            margin: [0, groupIndex > 0 ? 15 : 0, 10, 5],
          },
          {
            text: group.roadmapItem,
            style: 'subheader',
            width: '*',
            margin: [0, groupIndex > 0 ? 15 : 0, 0, 5],
          },
        ],
      });
      
      // Tasks table for this group
      const tableBody: TableCell[][] = [
        [
          { text: 'Task', style: 'tableHeader' },
          { text: 'Status', style: 'tableHeader' },
          { text: 'Priority', style: 'tableHeader' },
          { text: 'Assigned To', style: 'tableHeader' },
          { text: 'Due Date', style: 'tableHeader' },
          { text: 'Progress', style: 'tableHeader' },
        ],
      ];
      
      group.tasks.forEach((task) => {
        tableBody.push([
          { text: task.title, fontSize: 9 },
          { 
            text: task.status.replace('_', ' ').toUpperCase(), 
            fontSize: 8,
            color: getStatusColor(task.status),
            bold: true,
          },
          { 
            text: task.priority.toUpperCase(), 
            fontSize: 8,
            color: getPriorityColor(task.priority),
            bold: true,
          },
          { text: task.profiles?.full_name || 'Unassigned', fontSize: 9 },
          { 
            text: task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-', 
            fontSize: 9 
          },
          { text: `${task.progress}%`, fontSize: 9, alignment: 'center' },
        ]);
      });
      
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 60, 50, 80, 70, 45],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e5e7eb',
          vLineColor: () => '#e5e7eb',
          fillColor: (rowIndex: number) => rowIndex === 0 ? '#f3f4f6' : null,
        },
        margin: [0, 0, 0, 10],
      });
      
      // Summary for this group
      const completed = group.tasks.filter((t) => t.status === 'completed').length;
      const total = group.tasks.length;
      const percentage = Math.round((completed / total) * 100);
      
      content.push({
        columns: [
          { text: '', width: '*' },
          {
            text: `${completed}/${total} completed (${percentage}%)`,
            fontSize: 8,
            color: '#6b7280',
            alignment: 'right',
            width: 'auto',
          },
        ],
        margin: [0, 0, 0, 5],
      });
    });
  } else {
    // Flat list without grouping
    const tableBody: TableCell[][] = [
      [
        { text: 'Task', style: 'tableHeader' },
        { text: 'Roadmap Link', style: 'tableHeader' },
        { text: 'Status', style: 'tableHeader' },
        { text: 'Priority', style: 'tableHeader' },
        { text: 'Assigned', style: 'tableHeader' },
        { text: 'Progress', style: 'tableHeader' },
      ],
    ];
    
    tasks.forEach((task) => {
      tableBody.push([
        { text: task.title, fontSize: 9 },
        { 
          text: task.roadmap_item 
            ? `${task.roadmap_item.phase || ''}: ${task.roadmap_item.title}`.slice(0, 30) 
            : '-', 
          fontSize: 8,
          color: task.roadmap_item ? '#3b82f6' : '#9ca3af',
        },
        { 
          text: task.status.replace('_', ' ').toUpperCase(), 
          fontSize: 8,
          color: getStatusColor(task.status),
          bold: true,
        },
        { 
          text: task.priority.toUpperCase(), 
          fontSize: 8,
          color: getPriorityColor(task.priority),
          bold: true,
        },
        { text: task.profiles?.full_name || '-', fontSize: 8 },
        { text: `${task.progress}%`, fontSize: 9, alignment: 'center' },
      ]);
    });
    
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 100, 55, 45, 70, 40],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#e5e7eb',
        vLineColor: () => '#e5e7eb',
        fillColor: (rowIndex: number) => rowIndex === 0 ? '#f3f4f6' : null,
      },
    });
  }
  
  return content;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return '#16a34a';
    case 'in_progress': return '#2563eb';
    case 'cancelled': return '#6b7280';
    default: return '#ca8a04';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    default: return '#16a34a';
  }
}

/**
 * Build a summary section for roadmap-linked tasks
 */
export function buildRoadmapTasksSummary(tasks: TaskForExport[]): Content[] {
  const linkedTasks = tasks.filter((t) => t.roadmap_item);
  const unlinkedTasks = tasks.filter((t) => !t.roadmap_item);
  
  const totalCompleted = tasks.filter((t) => t.status === 'completed').length;
  const linkedCompleted = linkedTasks.filter((t) => t.status === 'completed').length;
  
  return [
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            { text: 'Tasks Summary', style: 'tableHeader', colSpan: 2 },
            {},
          ],
          [
            { text: 'Total Tasks', fontSize: 10 },
            { text: String(tasks.length), fontSize: 10, bold: true, alignment: 'right' },
          ],
          [
            { text: 'Linked to Roadmap', fontSize: 10 },
            { text: String(linkedTasks.length), fontSize: 10, bold: true, alignment: 'right' },
          ],
          [
            { text: 'Unlinked Tasks', fontSize: 10 },
            { text: String(unlinkedTasks.length), fontSize: 10, alignment: 'right' },
          ],
          [
            { text: 'Overall Completion', fontSize: 10 },
            { 
              text: `${totalCompleted}/${tasks.length} (${Math.round((totalCompleted / tasks.length) * 100)}%)`, 
              fontSize: 10, 
              bold: true, 
              alignment: 'right',
              color: '#16a34a',
            },
          ],
          [
            { text: 'Roadmap-Linked Completion', fontSize: 10 },
            { 
              text: linkedTasks.length > 0 
                ? `${linkedCompleted}/${linkedTasks.length} (${Math.round((linkedCompleted / linkedTasks.length) * 100)}%)`
                : 'N/A', 
              fontSize: 10, 
              alignment: 'right',
              color: '#3b82f6',
            },
          ],
        ],
      },
      layout: {
        hLineWidth: (i: number, node: any) => i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#e5e7eb',
        fillColor: (rowIndex: number) => rowIndex === 0 ? '#f3f4f6' : null,
      },
      margin: [0, 10, 0, 10],
    },
  ];
}
