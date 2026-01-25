/**
 * Phase Step Tabs
 * 
 * Row 2 tabs - Shows workflow tasks/steps for the selected phase
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhaseStepContainer } from './PhaseStepContainer';

interface PhaseStepTabsProps {
  phaseId: string;
  phaseName: string;
  phaseNumber: number;
  documentId: string;
  document: any;
  activeStep: string;
  onStepChange: (stepId: string) => void;
  renderStepContent?: (task: any) => React.ReactNode;
}

export function PhaseStepTabs({ 
  phaseId, 
  phaseName, 
  phaseNumber,
  documentId, 
  document,
  activeStep,
  onStepChange,
  renderStepContent
}: PhaseStepTabsProps) {
  // Fetch tasks for this phase
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['bulk-services-phase-tasks', phaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_services_workflow_tasks')
        .select('*')
        .eq('phase_id', phaseId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!phaseId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No steps found for this phase.</p>
        <p className="text-sm mt-1">Initialize the workflow from the summary view.</p>
      </div>
    );
  }

  // If no active step, use the first one
  const currentStep = activeStep || tasks[0]?.id;

  // Calculate progress
  const completedCount = tasks.filter(t => t.is_completed).length;
  const criticalCount = tasks.filter(t => t.is_critical).length;
  const criticalCompleted = tasks.filter(t => t.is_critical && t.is_completed).length;

  return (
    <div className="space-y-4">
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            {phaseNumber}
          </span>
          <div>
            <h2 className="font-semibold">{phaseName}</h2>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{tasks.length} steps complete
              {criticalCount > 0 && (
                <span className="ml-2">
                  • {criticalCompleted}/{criticalCount} critical
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Step Tabs */}
      <Tabs value={currentStep} onValueChange={onStepChange} className="w-full">
        <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-2">
          {tasks.map((task, index) => (
            <TabsTrigger
              key={task.id}
              value={task.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm",
                "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                task.is_completed && "text-green-600 dark:text-green-400"
              )}
            >
              {/* Step Number */}
              <span className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium",
                task.is_completed 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                  : "bg-muted text-muted-foreground"
              )}>
                {task.is_completed ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </span>
              
              {/* Title (truncated for smaller screens) */}
              <span className="hidden sm:inline max-w-[150px] truncate">
                {task.task_title}
              </span>
              <span className="sm:hidden">
                {index + 1}
              </span>
              
              {/* Critical indicator */}
              {task.is_critical && !task.is_completed && (
                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Step Content */}
        {tasks.map((task) => (
          <TabsContent key={task.id} value={task.id} className="mt-6">
            <PhaseStepContainer
              task={{
                ...task,
                task_description: task.task_description || null,
                linked_data: task.linked_data as Record<string, any> | null,
                not_applicable: (task as any).not_applicable ?? false,
                not_applicable_reason: (task as any).not_applicable_reason ?? null
              }}
              phaseId={phaseId}
              documentId={documentId}
              document={document}
            >
              {renderStepContent?.(task)}
            </PhaseStepContainer>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
