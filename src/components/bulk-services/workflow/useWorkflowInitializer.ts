/**
 * Hook to initialize workflow phases and tasks for a bulk services document
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BULK_SERVICES_WORKFLOW_TEMPLATE } from './workflowTemplate';
import { toast } from 'sonner';

interface BulkServicesDocument {
  id: string;
  total_connected_load?: number | null;
  maximum_demand?: number | null;
  diversity_factor?: number | null;
  future_expansion_factor?: number | null;
  primary_voltage?: string | null;
  connection_size?: string | null;
  supply_authority?: string | null;
  electrical_standard?: string | null;
}

export function useWorkflowInitializer(documentId: string) {
  const initializeWorkflow = useCallback(async (document: BulkServicesDocument) => {
    try {
      // Check if workflow already exists
      const { data: existingPhases } = await supabase
        .from('bulk_services_workflow_phases')
        .select('id')
        .eq('document_id', documentId)
        .limit(1);

      if (existingPhases && existingPhases.length > 0) {
        return { success: true, message: 'Workflow already exists' };
      }

      // Create phases
      const phasesToInsert = BULK_SERVICES_WORKFLOW_TEMPLATE.map((phase, index) => ({
        document_id: documentId,
        phase_number: phase.phaseNumber,
        phase_name: phase.phaseName,
        phase_description: phase.phaseDescription,
        status: 'not_started',
        display_order: index
      }));

      const { data: insertedPhases, error: phasesError } = await supabase
        .from('bulk_services_workflow_phases')
        .insert(phasesToInsert)
        .select();

      if (phasesError) throw phasesError;

      // Create tasks for each phase
      const tasksToInsert: any[] = [];
      
      for (const phase of BULK_SERVICES_WORKFLOW_TEMPLATE) {
        const insertedPhase = insertedPhases?.find(p => p.phase_number === phase.phaseNumber);
        if (!insertedPhase) continue;

        phase.tasks.forEach((task, taskIndex) => {
          // Build linked data from document
          const linkedData: Record<string, any> = {};
          if (task.linkedDataKey && document[task.linkedDataKey as keyof BulkServicesDocument]) {
            linkedData[task.linkedDataKey] = document[task.linkedDataKey as keyof BulkServicesDocument];
          }

          tasksToInsert.push({
            phase_id: insertedPhase.id,
            task_title: task.title,
            task_description: task.description || null,
            is_critical: task.isCritical,
            priority: task.priority,
            linked_data: Object.keys(linkedData).length > 0 ? linkedData : null,
            display_order: taskIndex
          });
        });
      }

      const { error: tasksError } = await supabase
        .from('bulk_services_workflow_tasks')
        .insert(tasksToInsert);

      if (tasksError) throw tasksError;

      toast.success('Workflow initialized successfully');
      return { success: true, message: 'Workflow initialized' };
    } catch (error: any) {
      console.error('Error initializing workflow:', error);
      toast.error('Failed to initialize workflow');
      return { success: false, message: error.message };
    }
  }, [documentId]);

  const resetWorkflow = useCallback(async () => {
    try {
      // Delete existing phases (tasks cascade delete)
      const { error } = await supabase
        .from('bulk_services_workflow_phases')
        .delete()
        .eq('document_id', documentId);

      if (error) throw error;
      
      toast.success('Workflow reset successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error resetting workflow:', error);
      toast.error('Failed to reset workflow');
      return { success: false, message: error.message };
    }
  }, [documentId]);

  return { initializeWorkflow, resetWorkflow };
}
