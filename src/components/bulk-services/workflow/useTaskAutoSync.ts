/**
 * Auto-sync workflow tasks with document data
 * 
 * Monitors document fields and automatically completes/uncompletes
 * workflow tasks based on whether their linkedDataKey has a value.
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BULK_SERVICES_WORKFLOW_TEMPLATE } from './workflowTemplate';
import { toast } from 'sonner';

// Map of document keys to their validation functions
// A field is considered "completed" if it has a truthy value
// For compound validators, the documentData object is passed as second param
const LINKED_DATA_VALIDATORS: Record<string, (value: any, documentData?: any) => boolean> = {
  total_connected_load: (v) => v !== null && v !== undefined && v > 0,
  maximum_demand: (v) => v !== null && v !== undefined && v > 0,
  diversity_factor: (v) => v !== null && v !== undefined && v > 0,
  future_expansion_factor: (v) => v !== null && v !== undefined && v > 0,
  primary_voltage: (v) => v !== null && v !== undefined && v !== '',
  connection_size: (v) => v !== null && v !== undefined && v !== '',
  supply_authority: (v) => v !== null && v !== undefined && v !== '',
  electrical_standard: (v) => v !== null && v !== undefined && v !== '',
  climatic_zone: (v) => v !== null && v !== undefined && v !== '',
  project_area: (v) => v !== null && v !== undefined && v > 0,
  load_profile_completed: (v) => v === true,
  // Compound validator for transformer sizing:
  // - >400V: bulk supply, internal transformers, auto-complete
  // - =400V: requires transformer_size_kva to be specified
  transformer_sizing_check: (_v, doc) => {
    if (!doc?.primary_voltage) return false;
    const voltage = parseFloat(doc.primary_voltage);
    if (isNaN(voltage)) return false;
    if (voltage > 400) return true; // Bulk supply - task not applicable
    if (voltage === 400) {
      return doc?.transformer_size_kva !== null && doc?.transformer_size_kva !== undefined && doc?.transformer_size_kva > 0;
    }
    return false;
  },
};

// Build a mapping of linkedDataKey -> task titles for quick lookup
function buildLinkedDataTaskMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  
  for (const phase of BULK_SERVICES_WORKFLOW_TEMPLATE) {
    for (const task of phase.tasks) {
      if (task.linkedDataKey) {
        const existing = map.get(task.linkedDataKey) || [];
        existing.push(task.title);
        map.set(task.linkedDataKey, existing);
      }
    }
  }
  
  return map;
}

const LINKED_TASK_MAP = buildLinkedDataTaskMap();

interface DocumentData {
  [key: string]: any;
}

export function useTaskAutoSync(documentId: string, documentData: DocumentData | null) {
  const queryClient = useQueryClient();

  const syncTasksWithDocument = useCallback(async () => {
    if (!documentId || !documentData) return;

    try {
      // Get all tasks for this document
      const { data: phases } = await supabase
        .from('bulk_services_workflow_phases')
        .select('id')
        .eq('document_id', documentId);

      if (!phases || phases.length === 0) return;

      const phaseIds = phases.map(p => p.id);

      const { data: tasks } = await supabase
        .from('bulk_services_workflow_tasks')
        .select('id, task_title, is_completed, linked_data')
        .in('phase_id', phaseIds);

      if (!tasks) return;

      const updates: { id: string; should_complete: boolean; linked_data: Record<string, any> }[] = [];

      // Check each task against document data
      for (const task of tasks) {
        // Find which linkedDataKey this task uses
        let taskLinkedKey: string | null = null;
        
        for (const [key, titles] of LINKED_TASK_MAP.entries()) {
          if (titles.includes(task.task_title)) {
            taskLinkedKey = key;
            break;
          }
        }

        if (!taskLinkedKey) continue;

        const validator = LINKED_DATA_VALIDATORS[taskLinkedKey];
        if (!validator) continue;

        const documentValue = documentData[taskLinkedKey];
        // Pass full documentData for compound validators (e.g., transformer_sizing_check)
        const shouldBeComplete = validator(documentValue, documentData);

        // Build linked_data object - for compound validators, include relevant fields
        const linkedData: Record<string, any> = {};
        if (taskLinkedKey === 'transformer_sizing_check') {
          // Store both voltage and transformer size for compound validator
          if (documentData.primary_voltage) linkedData.primary_voltage = documentData.primary_voltage;
          if (documentData.transformer_size_kva) linkedData.transformer_size_kva = documentData.transformer_size_kva;
        } else if (documentValue !== null && documentValue !== undefined) {
          linkedData[taskLinkedKey] = documentValue;
        }

        // Only update if state needs to change
        if (shouldBeComplete !== task.is_completed) {
          updates.push({
            id: task.id,
            should_complete: shouldBeComplete,
            linked_data: linkedData
          });
        } else if (JSON.stringify(task.linked_data) !== JSON.stringify(linkedData) && Object.keys(linkedData).length > 0) {
          // Update linked_data even if completion status is same
          updates.push({
            id: task.id,
            should_complete: task.is_completed,
            linked_data: linkedData
          });
        }
      }

      // Apply updates
      for (const update of updates) {
        await supabase
          .from('bulk_services_workflow_tasks')
          .update({
            is_completed: update.should_complete,
            completed_at: update.should_complete ? new Date().toISOString() : null,
            linked_data: Object.keys(update.linked_data).length > 0 ? update.linked_data : null
          })
          .eq('id', update.id);
      }

      // Invalidate queries if we made updates
      if (updates.length > 0) {
        await queryClient.invalidateQueries({ queryKey: ['bulk-services-phase-tasks'] });
        await queryClient.invalidateQueries({ queryKey: ['bulk-services-workflow-phases'] });
        
        const completedCount = updates.filter(u => u.should_complete).length;
        if (completedCount > 0) {
          toast.success(`${completedCount} task${completedCount > 1 ? 's' : ''} auto-completed`, {
            description: 'Based on your entered data'
          });
        }
      }

    } catch (error) {
      console.error('Error syncing tasks with document:', error);
    }
  }, [documentId, documentData, queryClient]);

  // Run sync whenever document data changes
  useEffect(() => {
    syncTasksWithDocument();
  }, [syncTasksWithDocument]);

  return { syncTasksWithDocument };
}
