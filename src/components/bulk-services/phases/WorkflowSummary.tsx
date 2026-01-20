/**
 * Workflow Summary Dashboard
 * Overview of all phases with progress indicators
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Zap,
  PlayCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BULK_SERVICES_WORKFLOW_TEMPLATE } from '../workflow/workflowTemplate';
import { useWorkflowInitializer } from '../workflow/useWorkflowInitializer';
import { useState } from 'react';

interface WorkflowSummaryProps {
  documentId: string;
  document: any;
  onNavigateToPhase: (phaseNumber: number) => void;
}

export function WorkflowSummary({ documentId, document, onNavigateToPhase }: WorkflowSummaryProps) {
  const { initializeWorkflow } = useWorkflowInitializer(documentId);
  const [isInitializing, setIsInitializing] = useState(false);

  // Fetch workflow phases
  const { data: phases, isLoading: phasesLoading, refetch: refetchPhases } = useQuery({
    queryKey: ['bulk-services-workflow-phases', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_services_workflow_phases')
        .select('*')
        .eq('document_id', documentId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['bulk-services-workflow-tasks-all', documentId],
    queryFn: async () => {
      if (!phases || phases.length === 0) return [];
      
      const phaseIds = phases.map(p => p.id);
      const { data, error } = await supabase
        .from('bulk_services_workflow_tasks')
        .select('*')
        .in('phase_id', phaseIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!phases && phases.length > 0
  });

  const handleInitialize = async () => {
    setIsInitializing(true);
    await initializeWorkflow(document);
    await refetchPhases();
    setIsInitializing(false);
  };

  // Show initialization UI if no phases exist
  if (!phasesLoading && (!phases || phases.length === 0)) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <PlayCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Initialize Utility Application Workflow</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Set up the 6-phase process for obtaining electrical power from a utility. 
                This will create a comprehensive checklist based on industry best practices.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              {BULK_SERVICES_WORKFLOW_TEMPLATE.map((phase) => (
                <Badge key={phase.phaseNumber} variant="outline">
                  {phase.phaseNumber}. {phase.phaseName}
                </Badge>
              ))}
            </div>
            <Button 
              onClick={handleInitialize} 
              disabled={isInitializing}
              className="mt-4"
            >
              {isInitializing ? 'Initializing...' : 'Start Workflow'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phasesLoading || tasksLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5 animate-spin" />
            <span>Loading workflow...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalPhases = phases?.length || 0;
  const completedPhases = phases?.filter(p => p.status === 'completed').length || 0;
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.is_completed).length || 0;
  const criticalTasks = tasks?.filter(t => t.is_critical).length || 0;
  const criticalCompleted = tasks?.filter(t => t.is_critical && t.is_completed).length || 0;
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Utility Application Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</div>
              <div className="text-xs text-muted-foreground">Overall Progress</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{completedPhases}/{totalPhases}</span>
              </div>
              <div className="text-xs text-muted-foreground">Phases Complete</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{completedTasks}/{totalTasks}</span>
              </div>
              <div className="text-xs text-muted-foreground">Tasks Complete</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold text-amber-600">{criticalCompleted}/{criticalTasks}</span>
              </div>
              <div className="text-xs text-muted-foreground">Critical Items</div>
            </div>
          </div>
          
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Phase Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases?.map((phase) => {
          const phaseTasks = tasks?.filter(t => t.phase_id === phase.id) || [];
          const phaseCompleted = phaseTasks.filter(t => t.is_completed).length;
          const phaseProgress = phaseTasks.length > 0 ? (phaseCompleted / phaseTasks.length) * 100 : 0;
          const phaseCritical = phaseTasks.filter(t => t.is_critical);
          const phaseCriticalDone = phaseCritical.filter(t => t.is_completed).length;

          return (
            <Card 
              key={phase.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-l-4",
                phase.status === 'completed' && "border-l-green-500",
                phase.status === 'in_progress' && "border-l-blue-500",
                phase.status === 'blocked' && "border-l-red-500",
                phase.status === 'not_started' && "border-l-muted"
              )}
              onClick={() => onNavigateToPhase(phase.phase_number)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                      {phase.phase_number}
                    </span>
                    <CardTitle className="text-sm font-medium">{phase.phase_name}</CardTitle>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "capitalize text-xs",
                      phase.status === 'completed' && "text-green-600 bg-green-50 border-green-200",
                      phase.status === 'in_progress' && "text-blue-600 bg-blue-50 border-blue-200",
                      phase.status === 'blocked' && "text-red-600 bg-red-50 border-red-200"
                    )}
                  >
                    {phase.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={phaseProgress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{phaseCompleted}/{phaseTasks.length} tasks</span>
                    {phaseCritical.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        {phaseCriticalDone}/{phaseCritical.length} critical
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 gap-1">
                    Go to Phase <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
