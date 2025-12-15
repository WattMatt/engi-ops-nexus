export interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  details?: string;
}

export interface TestSuite {
  id: string;
  phase: number;
  name: string;
  description: string;
  tests: TestDefinition[];
}

export interface TestDefinition {
  id: string;
  name: string;
  description: string;
  run: () => Promise<TestResult>;
}

export interface PhaseValidation {
  phase: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  status: 'not_run' | 'running' | 'passed' | 'failed' | 'partial';
  lastRun?: Date;
  results: TestResult[];
}
