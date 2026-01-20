/**
 * Expandable phase card for the workflow checklist dashboard
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, AlertTriangle, Clock, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { getPhaseStatusColor, getPriorityColor } from './workflowTemplate';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkflowTask {
  id: string;
  task_title: string;
  task_description: string | null;
  is_critical: boolean;
  is_completed: boolean;
  priority: string;
  linked_data: Record<string, any> | null | unknown;
  display_order: number;
}

interface WorkflowPhase {
  id: string;
  phase_number: number;
  phase_name: string;
  phase_description: string | null;
  status: string;
  display_order: number;
}

interface WorkflowPhaseCardProps {
  phase: WorkflowPhase;
  tasks: WorkflowTask[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onPhaseStatusChange: (phaseId: string, status: string) => void;
}

export function WorkflowPhaseCard({ phase, tasks, onTaskToggle, onPhaseStatusChange }: WorkflowPhaseCardProps) {
  const [isOpen, setIsOpen] = useState(phase.status === 'in_progress');
  
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const criticalTasks = tasks.filter(t => t.is_critical);
  const criticalCompleted = criticalTasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const getStatusIcon = () => {
    switch (phase.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      case 'blocked':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleTaskToggle = async (task: WorkflowTask) => {
    const newCompleted = !task.is_completed;
    
    try {
      const { error } = await supabase
        .from('bulk_services_workflow_tasks')
        .update({
          is_completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;
      
      onTaskToggle(task.id, newCompleted);
      
      // Auto-update phase status based on task completion
      const updatedCompletedCount = newCompleted ? completedTasks + 1 : completedTasks - 1;
      if (updatedCompletedCount === tasks.length && tasks.length > 0) {
        onPhaseStatusChange(phase.id, 'completed');
      } else if (updatedCompletedCount > 0 && phase.status === 'not_started') {
        onPhaseStatusChange(phase.id, 'in_progress');
      } else if (updatedCompletedCount === 0 && phase.status === 'completed') {
        onPhaseStatusChange(phase.id, 'in_progress');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-200 border-l-4",
      phase.status === 'completed' && "border-l-green-500",
      phase.status === 'in_progress' && "border-l-blue-500",
      phase.status === 'blocked' && "border-l-red-500",
      phase.status === 'not_started' && "border-l-muted"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {phase.phase_number}
                  </span>
                  {getStatusIcon()}
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground">{phase.phase_name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {phase.phase_description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {criticalTasks.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className={cn(
                      criticalCompleted === criticalTasks.length ? "text-green-600" : "text-amber-600"
                    )}>
                      {criticalCompleted}/{criticalTasks.length} critical
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 min-w-[120px]">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {completedTasks}/{tasks.length}
                  </span>
                </div>
                
                <Badge 
                  variant="outline" 
                  className={cn("capitalize text-xs", getPhaseStatusColor(phase.status))}
                >
                  {phase.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-2 pl-12">
              {tasks
                .sort((a, b) => a.display_order - b.display_order)
                .map((task) => (
                  <div 
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-all",
                      task.is_completed 
                        ? "bg-muted/30 border-muted" 
                        : "bg-background border-border hover:border-primary/30"
                    )}
                  >
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => handleTaskToggle(task)}
                      className="mt-0.5"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          task.is_completed && "line-through text-muted-foreground"
                        )}>
                          {task.task_title}
                        </span>
                        
                        {task.is_critical && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            <Zap className="h-3 w-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                        
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs capitalize", getPriorityColor(task.priority))}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      
                      {task.task_description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.task_description}
                        </p>
                      )}
                      
                      {task.linked_data && Object.keys(task.linked_data).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(task.linked_data).map(([key, value]) => (
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
                  </div>
                ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
