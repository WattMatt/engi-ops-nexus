import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  FlaskConical,
  AlertTriangle,
  PlayCircle,
  RotateCcw
} from 'lucide-react';
import { PhaseTestRunner } from './PhaseTestRunner';
import { PhaseValidation } from './types';
import { phase1Suite } from './phase1Tests';
import { phase2Suite } from './phase2Tests';
import { updateRoadmapProgress } from './roadmapUpdater';
import { toast } from 'sonner';

export const LightingTestDashboard: React.FC = () => {
  const [validations, setValidations] = useState<Record<number, PhaseValidation>>({});
  const [autoRunComplete, setAutoRunComplete] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const handleValidationComplete = (validation: PhaseValidation) => {
    setValidations(prev => {
      const updated = {
        ...prev,
        [validation.phase]: validation,
      };
      
      // Auto-update roadmap when a phase validation completes
      updateRoadmapProgress(validation);
      
      return updated;
    });
  };

  const getPhaseStatus = (phase: number) => {
    const validation = validations[phase];
    if (!validation) return 'not_run';
    return validation.status;
  };

  const getStatusBadge = (status: PhaseValidation['status'] | 'not_run') => {
    switch (status) {
      case 'passed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Validated
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Not Run
          </Badge>
        );
    }
  };

  const totalTests = Object.values(validations).reduce((sum, v) => sum + v.totalTests, 0);
  const passedTests = Object.values(validations).reduce((sum, v) => sum + v.passedTests, 0);
  const failedTests = Object.values(validations).reduce((sum, v) => sum + v.failedTests, 0);

  const allPhasesPassed = validations[1]?.status === 'passed' && validations[2]?.status === 'passed';

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle>Integration Test Dashboard</CardTitle>
            </div>
            {allPhasesPassed && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-3 py-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                All Phases Validated - Roadmap Updated
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{totalTests}</p>
              <p className="text-sm text-muted-foreground">Total Tests</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-500/10">
              <p className="text-2xl font-bold text-green-500">{passedTests}</p>
              <p className="text-sm text-muted-foreground">Passed</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-500/10">
              <p className="text-2xl font-bold text-red-500">{failedTests}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Pass Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Tests */}
      <Tabs defaultValue="phase1" className="space-y-4">
        <TabsList>
          <TabsTrigger value="phase1" className="flex items-center gap-2">
            Phase 1
            {getStatusBadge(getPhaseStatus(1))}
          </TabsTrigger>
          <TabsTrigger value="phase2" className="flex items-center gap-2">
            Phase 2
            {getStatusBadge(getPhaseStatus(2))}
          </TabsTrigger>
          <TabsTrigger value="phase3" disabled className="flex items-center gap-2">
            Phase 3
            <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phase1">
          <PhaseTestRunner 
            suite={phase1Suite} 
            onValidationComplete={handleValidationComplete}
          />
        </TabsContent>

        <TabsContent value="phase2">
          <PhaseTestRunner 
            suite={phase2Suite} 
            onValidationComplete={handleValidationComplete}
          />
        </TabsContent>

        <TabsContent value="phase3">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Phase 3 tests will be available after Phase 3 implementation</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
