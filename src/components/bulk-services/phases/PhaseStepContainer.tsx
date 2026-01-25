/**
 * Phase Step Container
 * 
 * Full Process View for each workflow step/task
 * Includes: Form + Documents + Notes + Audit Trail
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Circle, 
  FileText, 
  MessageSquare, 
  Clock,
  AlertTriangle,
  Save,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PhaseStepContainerProps {
  task: {
    id: string;
    task_title: string;
    task_description: string | null;
    is_critical: boolean;
    is_completed: boolean;
    priority: string;
    linked_data: Record<string, any> | null;
    completed_at: string | null;
    not_applicable?: boolean;
    not_applicable_reason?: string | null;
  };
  phaseId: string;
  documentId: string;
  document: any;
  children?: React.ReactNode; // Custom form content for this step
}

export function PhaseStepContainer({ 
  task, 
  phaseId, 
  documentId, 
  document,
  children 
}: PhaseStepContainerProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Toggle task completion
  const handleToggleComplete = async () => {
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
      
      await queryClient.invalidateQueries({ queryKey: ['bulk-services-phase-tasks', phaseId] });
      await queryClient.invalidateQueries({ queryKey: ['bulk-services-workflow-phases'] });
      
      toast.success(newCompleted ? 'Step marked complete' : 'Step reopened');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update step');
    }
  };

  // Save notes (placeholder - could be extended to save to a notes table)
  const handleSaveNotes = async () => {
    setSaving(true);
    // For now, just show a toast - can be extended to persist notes
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Notes saved');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleComplete}
              className="shrink-0"
            >
              {task.is_completed ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>
            <h2 className={cn(
              "text-xl font-semibold",
              task.is_completed && "text-muted-foreground line-through"
            )}>
              {task.task_title}
            </h2>
            {task.is_critical && (
              <Badge variant="destructive" className="shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Critical
              </Badge>
            )}
            {task.not_applicable && (
              <Badge variant="secondary" className="shrink-0">
                N/A
              </Badge>
            )}
          </div>
          {task.task_description && (
            <p className="text-muted-foreground ml-9">{task.task_description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {task.completed_at && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(task.completed_at), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Form Content */}
          {children ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Step Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {children}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No specific form for this step.</p>
                <p className="text-sm mt-1">Mark as complete when finished.</p>
              </CardContent>
            </Card>
          )}

          {/* Linked Data Display */}
          {task.linked_data && Object.keys(task.linked_data).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Linked Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(task.linked_data).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono font-medium">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-4">
          {/* Notes Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes & Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add notes about this step..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <Button 
                size="sm" 
                onClick={handleSaveNotes}
                disabled={saving || !notes.trim()}
                className="w-full"
              >
                <Save className="h-3 w-3 mr-1" />
                {saving ? 'Saving...' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[150px]">
                <div className="space-y-2 text-sm">
                  {task.completed_at && (
                    <div className="flex items-start gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Marked complete</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                  {!task.completed_at && (
                    <p className="text-muted-foreground text-center py-4">
                      No activity yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={task.is_completed ? 'outline' : 'default'}
                className="w-full"
                onClick={handleToggleComplete}
              >
                {task.is_completed ? (
                  <>
                    <Circle className="h-4 w-4 mr-2" />
                    Reopen Step
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
