/**
 * Phase Summary Header Cards
 * 
 * Displays key metrics above the phase tabs
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Zap,
  Activity,
  Building2
} from 'lucide-react';

interface PhaseSummaryHeaderProps {
  documentId: string;
  document: any;
}

export function PhaseSummaryHeader({ documentId, document }: PhaseSummaryHeaderProps) {
  // Fetch workflow phases
  const { data: phases } = useQuery({
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
  const { data: tasks } = useQuery({
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

  // Calculate statistics
  const totalPhases = phases?.length || 0;
  const completedPhases = phases?.filter(p => p.status === 'completed').length || 0;
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.is_completed).length || 0;
  const criticalTasks = tasks?.filter(t => t.is_critical).length || 0;
  const criticalCompleted = tasks?.filter(t => t.is_critical && t.is_completed).length || 0;
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Current phase (first incomplete or last)
  const currentPhase = phases?.find(p => p.status !== 'completed') || phases?.[phases.length - 1];

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Connected Load */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-400">Connected Load</span>
            </div>
            <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
              {document?.total_connected_load 
                ? `${(document.total_connected_load / 1000).toFixed(1)} MVA`
                : '—'
              }
            </div>
          </CardContent>
        </Card>

        {/* Maximum Demand */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-700 dark:text-blue-400">Max Demand</span>
            </div>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {document?.maximum_demand 
                ? `${(document.maximum_demand / 1000).toFixed(1)} MVA`
                : '—'
              }
            </div>
          </CardContent>
        </Card>

        {/* Supply Voltage */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-purple-700 dark:text-purple-400">Supply Voltage</span>
            </div>
            <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {document?.primary_voltage || '—'}
            </div>
          </CardContent>
        </Card>

        {/* Phases Progress */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-700 dark:text-green-400">Phases</span>
            </div>
            <div className="text-lg font-bold text-green-900 dark:text-green-100">
              {completedPhases}/{totalPhases}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Progress */}
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-900/20 dark:to-cyan-800/10 border-cyan-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-cyan-600" />
              <span className="text-xs text-cyan-700 dark:text-cyan-400">Tasks</span>
            </div>
            <div className="text-lg font-bold text-cyan-900 dark:text-cyan-100">
              {completedTasks}/{totalTasks}
            </div>
          </CardContent>
        </Card>

        {/* Critical Items */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <span className="text-xs text-red-700 dark:text-red-400">Critical</span>
            </div>
            <div className="text-lg font-bold text-red-900 dark:text-red-100">
              {criticalCompleted}/{criticalTasks}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
