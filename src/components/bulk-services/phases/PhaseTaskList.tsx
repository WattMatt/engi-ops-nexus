/**
 * Reusable Phase Task List Component
 * Displays tasks for a specific workflow phase with checkboxes and linked data
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Circle, 
  Zap, 
  FileText,
  AlertCircle,
  Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PhaseTaskListProps {
  phaseId: string;
  phaseName: string;
  phaseDescription?: string;
  onPhaseComplete?: () => void;
}

export function PhaseTaskList({ phaseId, phaseName, phaseDescription, onPhaseComplete }: PhaseTaskListProps) {
  const queryClient = useQueryClient();
  
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

  const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
    const newCompleted = !currentCompleted;
    
    try {
      const { error } = await supabase
        .from('bulk_services_workflow_tasks')
        .update({
          is_completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['bulk-services-phase-tasks', phaseId] });
      await queryClient.invalidateQueries({ queryKey: ['bulk-services-workflow-phases'] });
      
      toast.success(newCompleted ? 'Task completed' : 'Task reopened');
      
      // Check if all tasks are complete
      const updatedTasks = tasks?.map(t => 
        t.id === taskId ? { ...t, is_completed: newCompleted } : t
      );
      const allComplete = updatedTasks?.every(t => t.is_completed);
      
      if (allComplete && onPhaseComplete) {
        // Update phase status to completed
        await supabase
          .from('bulk_services_workflow_phases')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', phaseId);
          
        onPhaseComplete();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  const completedCount = tasks?.filter(t => t.is_completed).length || 0;
  const totalCount = tasks?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const criticalTasks = tasks?.filter(t => t.is_critical) || [];
  const criticalCompleted = criticalTasks.filter(t => t.is_completed).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {progress === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : progress > 0 ? (
                <Circle className="h-5 w-5 text-blue-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              {phaseName}
            </CardTitle>
            {phaseDescription && (
              <CardDescription className="mt-1">{phaseDescription}</CardDescription>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
            <div className="text-xs text-muted-foreground">{completedCount}/{totalCount} tasks</div>
          </div>
        </div>
        
        <div className="space-y-2 mt-4">
          <Progress value={progress} className="h-2" />
          
          {criticalTasks.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className={cn(
                criticalCompleted === criticalTasks.length ? "text-green-600" : "text-amber-600"
              )}>
                {criticalCompleted}/{criticalTasks.length} critical tasks complete
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {tasks?.map((task) => {
            const linkedData = task.linked_data as Record<string, any> | null;
            const isNotApplicable = linkedData?.not_applicable === true;
            
            return (
              <div 
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-all",
                  task.is_completed 
                    ? "bg-muted/30 border-muted" 
                    : "bg-background border-border hover:border-primary/30"
                )}
              >
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={() => handleTaskToggle(task.id, task.is_completed)}
                  className="mt-0.5"
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "font-medium",
                      task.is_completed && "line-through text-muted-foreground"
                    )}>
                      {task.task_title}
                    </span>
                    
                    {isNotApplicable && (
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600">
                        <Ban className="h-3 w-3 mr-1" />
                        Not Applicable
                      </Badge>
                    )}
                    
                    {task.is_critical && !isNotApplicable && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                        <Zap className="h-3 w-3 mr-1" />
                        Critical
                      </Badge>
                    )}
                    
                    {!isNotApplicable && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs capitalize",
                          task.priority === 'critical' && "text-red-700 bg-red-100 dark:bg-red-900/20 dark:text-red-400",
                          task.priority === 'high' && "text-orange-700 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400",
                          task.priority === 'medium' && "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400",
                          task.priority === 'low' && "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                  
                  {task.task_description && !isNotApplicable && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.task_description}
                    </p>
                  )}
                  
                  {isNotApplicable && linkedData?.reason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {linkedData.reason}
                    </p>
                  )}
                  
                  {linkedData && !isNotApplicable && Object.keys(linkedData).filter(k => k !== 'not_applicable' && k !== 'reason').length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(linkedData)
                        .filter(([key]) => key !== 'not_applicable' && key !== 'reason')
                        .map(([key, value]) => (
                          <Badge 
                            key={key} 
                            variant="secondary" 
                            className="text-xs font-mono"
                          >
                            {key.replace(/_/g, ' ')}: {value}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
                
                {task.is_completed && (
                  <div className="shrink-0 flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Done
                  </div>
                )}
              </div>
            );
          })}
          
          {(!tasks || tasks.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tasks found for this phase</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
