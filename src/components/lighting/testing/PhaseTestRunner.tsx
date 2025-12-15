import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  SkipForward
} from 'lucide-react';
import { TestResult, TestSuite, PhaseValidation } from './types';
import { cn } from '@/lib/utils';

interface PhaseTestRunnerProps {
  suite: TestSuite;
  onValidationComplete?: (validation: PhaseValidation) => void;
}

export const PhaseTestRunner: React.FC<PhaseTestRunnerProps> = ({ 
  suite, 
  onValidationComplete 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    const testResults: TestResult[] = [];

    for (const test of suite.tests) {
      setCurrentTest(test.id);
      
      // Set test as running
      setResults(prev => [...prev, {
        id: test.id,
        name: test.name,
        status: 'running',
      }]);

      try {
        const result = await test.run();
        testResults.push(result);
        
        // Update with actual result
        setResults(prev => prev.map(r => 
          r.id === test.id ? result : r
        ));
      } catch (err) {
        const errorResult: TestResult = {
          id: test.id,
          name: test.name,
          status: 'failed',
          error: String(err),
        };
        testResults.push(errorResult);
        setResults(prev => prev.map(r => 
          r.id === test.id ? errorResult : r
        ));
      }

      // Small delay between tests for UI feedback
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setCurrentTest(null);
    setIsRunning(false);

    // Calculate validation
    const passed = testResults.filter(r => r.status === 'passed').length;
    const failed = testResults.filter(r => r.status === 'failed').length;
    const skipped = testResults.filter(r => r.status === 'skipped').length;

    const validation: PhaseValidation = {
      phase: suite.phase,
      totalTests: testResults.length,
      passedTests: passed,
      failedTests: failed,
      skippedTests: skipped,
      status: failed === 0 && passed > 0 ? 'passed' : failed > 0 ? 'failed' : 'partial',
      lastRun: new Date(),
      results: testResults,
    };

    onValidationComplete?.(validation);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants: Record<TestResult['status'], string> = {
      passed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      skipped: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      pending: 'bg-muted text-muted-foreground',
    };
    return variants[status];
  };

  const passedCount = results.filter(r => r.status === 'passed').length;
  const progress = results.length > 0 ? (passedCount / suite.tests.length) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{suite.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{suite.description}</p>
          </div>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Tests
              </>
            )}
          </Button>
        </div>
        
        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {passedCount}/{suite.tests.length} passed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {suite.tests.map((test, index) => {
            const result = results.find(r => r.id === test.id);
            const status = result?.status || 'pending';
            
            return (
              <div 
                key={test.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  currentTest === test.id && "border-blue-500/50 bg-blue-500/5",
                  status === 'passed' && "border-green-500/30 bg-green-500/5",
                  status === 'failed' && "border-red-500/30 bg-red-500/5"
                )}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div>
                    <p className="text-sm font-medium">{test.name}</p>
                    <p className="text-xs text-muted-foreground">{test.description}</p>
                    {result?.error && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {result.error}
                      </p>
                    )}
                    {result?.details && status === 'passed' && (
                      <p className="text-xs text-green-400 mt-1">{result.details}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {result?.duration !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {result.duration.toFixed(0)}ms
                    </span>
                  )}
                  <Badge variant="outline" className={getStatusBadge(status)}>
                    {status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
