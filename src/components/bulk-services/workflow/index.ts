/**
 * Bulk Services Workflow Module
 * 
 * Comprehensive workflow tracking for utility power application process
 */

export { WorkflowDashboard } from './WorkflowDashboard';
export { WorkflowPhaseCard } from './WorkflowPhaseCard';
export { useWorkflowInitializer } from './useWorkflowInitializer';
export { 
  BULK_SERVICES_WORKFLOW_TEMPLATE,
  getPhaseStatusColor,
  getPriorityColor,
  type WorkflowPhase,
  type WorkflowTask,
  type NavigationTarget
} from './workflowTemplate';
