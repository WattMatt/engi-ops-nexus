/**
 * Main Workflow Dashboard - Checklist Dashboard view
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  PlayCircle, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Zap,
  TrendingUp
} from 'lucide-react';
import { WorkflowPhaseCard } from './WorkflowPhaseCard';
import { useWorkflowInitializer } from './useWorkflowInitializer';
import { BULK_SERVICES_WORKFLOW_TEMPLATE, NavigationTarget } from './workflowTemplate';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WorkflowDashboardProps {
  documentId: string;
  document: any;
  onNavigateToTab?: (tabId: string) => void;
}

export function WorkflowDashboard({ documentId, document, onNavigateToTab }: WorkflowDashboardProps) {
  const queryClient = useQueryClient();
  const { initializeWorkflow, resetWorkflow } = useWorkflowInitializer(documentId);
  const [isInitializing, setIsInitializing] = useState(false);

  // Handle navigation from workflow tasks
  const handleNavigate = (target: NavigationTarget) => {
    if (target.type === 'tab' && onNavigateToTab) {
      onNavigateToTab(target.tabId);
      toast.success(`Navigated to ${target.label.replace('Go to ', '').replace('Add to ', '').replace('Track in ', '')}`);
    } else if (target.type === 'external') {
      window.open(target.url, '_blank');
    }
  };

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
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['bulk-services-workflow-tasks', documentId],
    queryFn: async () => {
      if (!phases || phases.length === 0) return [];
      
      const phaseIds = phases.map(p => p.id);
      const { data, error } = await supabase
        .from('bulk_services_workflow_tasks')
        .select('*')
        .in('phase_id', phaseIds)
        .order('display_order', { ascending: true });

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

  const handleReset = async () => {
    await resetWorkflow();
    await refetchPhases();
    await refetchTasks();
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    await refetchTasks();
  };

  const handlePhaseStatusChange = async (phaseId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bulk_services_workflow_phases')
        .update({
          status,
          started_at: status === 'in_progress' ? new Date().toISOString() : undefined,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', phaseId);

      if (error) throw error;
      await refetchPhases();
    } catch (error) {
      console.error('Error updating phase status:', error);
    }
  };

  // Calculate overall statistics
  const totalPhases = phases?.length || 0;
  const completedPhases = phases?.filter(p => p.status === 'completed').length || 0;
  const inProgressPhases = phases?.filter(p => p.status === 'in_progress').length || 0;
  
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.is_completed).length || 0;
  const criticalTasks = tasks?.filter(t => t.is_critical).length || 0;
  const criticalCompleted = tasks?.filter(t => t.is_critical && t.is_completed).length || 0;
  
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

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

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Utility Application Progress
            </CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Workflow
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Workflow?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all progress and start fresh. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground">
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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

      {/* Phase Cards */}
      <div className="space-y-3">
        {phases?.map((phase) => {
          // Get navigation info from template for each task
          const templatePhase = BULK_SERVICES_WORKFLOW_TEMPLATE.find(
            p => p.phaseNumber === phase.phase_number
          );
          
          return (
            <WorkflowPhaseCard
              key={phase.id}
              phase={phase}
              tasks={(tasks?.filter(t => t.phase_id === phase.id) || []).map(t => {
                // Find matching template task to get navigation info
                const templateTask = templatePhase?.tasks.find(
                  tt => tt.title === t.task_title
                );
                return {
                  ...t,
                  linked_data: t.linked_data as Record<string, any> | null,
                  navigation: templateTask?.navigation
                };
              })}
              onTaskToggle={handleTaskToggle}
              onPhaseStatusChange={handlePhaseStatusChange}
              onNavigate={handleNavigate}
            />
          );
        })}
      </div>
    </div>
  );
}
