import { PhaseValidation } from './types';
import { toast } from 'sonner';

// Maps test IDs to roadmap deliverable IDs
const phase1TestToDeliverableMap: Record<string, string[]> = {
  'p1-db-schema': ['1-1'],
  'p1-crud-create': ['1-2'],
  'p1-crud-read': ['1-2'],
  'p1-crud-update': ['1-2'],
  'p1-crud-delete': ['1-2'],
  'p1-search-filter': ['1-3'],
  'p1-fitting-types': ['1-4'],
  'p1-overview-stats': ['1-6'],
};

const phase2TestToDeliverableMap: Record<string, string[]> = {
  'p2-storage-bucket': ['2-2'],
  'p2-schema': ['2-1'],
  'p2-crud-create': ['2-1'],
  'p2-extraction-status': ['2-4', '2-5', '2-6'],
  'p2-ai-extraction': ['2-4', '2-5'],
  'p2-duplicate-detection': ['2-8'],
  'p2-fitting-link': ['2-7'],
  'p2-batch-processing': ['2-1'],
};

// Store validation results in localStorage for persistence
const VALIDATION_STORAGE_KEY = 'lighting_module_validations';

export const saveValidationResult = (validation: PhaseValidation) => {
  try {
    const existing = localStorage.getItem(VALIDATION_STORAGE_KEY);
    const validations = existing ? JSON.parse(existing) : {};
    validations[validation.phase] = {
      ...validation,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(validations));
  } catch (e) {
    console.error('Failed to save validation result:', e);
  }
};

export const getStoredValidations = (): Record<number, PhaseValidation & { timestamp: string }> => {
  try {
    const stored = localStorage.getItem(VALIDATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

export const updateRoadmapProgress = (validation: PhaseValidation) => {
  // Save the validation result
  saveValidationResult(validation);
  
  const passedTestIds = validation.results
    .filter(r => r.status === 'passed')
    .map(r => r.id);
  
  const failedTestIds = validation.results
    .filter(r => r.status === 'failed')
    .map(r => r.id);
  
  // Get the appropriate mapping based on phase
  const testToDeliverableMap = validation.phase === 1 
    ? phase1TestToDeliverableMap 
    : phase2TestToDeliverableMap;
  
  // Calculate which deliverables are validated
  const validatedDeliverables = new Set<string>();
  const failedDeliverables = new Set<string>();
  
  passedTestIds.forEach(testId => {
    const deliverables = testToDeliverableMap[testId] || [];
    deliverables.forEach(d => validatedDeliverables.add(d));
  });
  
  failedTestIds.forEach(testId => {
    const deliverables = testToDeliverableMap[testId] || [];
    deliverables.forEach(d => failedDeliverables.add(d));
  });
  
  // Show toast notification with results
  if (validation.status === 'passed') {
    toast.success(`Phase ${validation.phase} Validated`, {
      description: `All ${validation.passedTests} tests passed. Roadmap updated.`,
    });
  } else if (validation.status === 'partial') {
    toast.warning(`Phase ${validation.phase} Partially Validated`, {
      description: `${validation.passedTests}/${validation.totalTests} tests passed. ${failedDeliverables.size} deliverables need attention.`,
    });
  } else {
    toast.error(`Phase ${validation.phase} Validation Failed`, {
      description: `${validation.failedTests} tests failed. Review the results for details.`,
    });
  }
  
  // Log the roadmap update for debugging
  console.log(`Phase ${validation.phase} Roadmap Update:`, {
    status: validation.status,
    validatedDeliverables: Array.from(validatedDeliverables),
    failedDeliverables: Array.from(failedDeliverables),
    passRate: `${validation.passedTests}/${validation.totalTests}`,
  });
  
  return {
    validatedDeliverables: Array.from(validatedDeliverables),
    failedDeliverables: Array.from(failedDeliverables),
    phaseStatus: validation.status,
  };
};

// Get current roadmap status based on stored validations
export const getRoadmapStatus = () => {
  const validations = getStoredValidations();
  
  return {
    phase1: validations[1]?.status || 'not_run',
    phase2: validations[2]?.status || 'not_run',
    phase3: 'pending',
    phase4: 'pending',
    phase5: 'pending',
  };
};
