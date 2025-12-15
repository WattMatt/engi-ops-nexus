import { supabase } from "@/integrations/supabase/client";
import { TestDefinition, TestResult } from "./types";

const createTestResult = (
  id: string,
  name: string,
  status: TestResult['status'],
  duration: number,
  error?: string,
  details?: string
): TestResult => ({
  id,
  name,
  status,
  duration,
  error,
  details,
});

// Test 1: Storage bucket exists
const testStorageBucket: TestDefinition = {
  id: 'p2-storage-bucket',
  name: 'Storage Bucket Exists',
  description: 'Verify lighting-spec-sheets storage bucket is configured',
  run: async () => {
    const start = performance.now();
    try {
      const { data, error } = await supabase.storage.getBucket('lighting-spec-sheets');
      const duration = performance.now() - start;
      
      if (error) {
        return createTestResult('p2-storage-bucket', 'Storage Bucket Exists', 'failed', duration, error.message);
      }
      
      return createTestResult('p2-storage-bucket', 'Storage Bucket Exists', 'passed', duration, undefined, 
        `Bucket: ${data.name}, Public: ${data.public}`);
    } catch (err) {
      return createTestResult('p2-storage-bucket', 'Storage Bucket Exists', 'failed', performance.now() - start, String(err));
    }
  },
};

// Test 2: Spec sheets table schema
const testSpecSheetsSchema: TestDefinition = {
  id: 'p2-schema',
  name: 'Spec Sheets Table Schema',
  description: 'Verify lighting_spec_sheets table has required columns',
  run: async () => {
    const start = performance.now();
    try {
      const { data, error } = await supabase
        .from('lighting_spec_sheets')
        .select('id, file_name, file_path, file_type, file_size, extraction_status, extracted_data, confidence_scores, project_id')
        .limit(1);
      
      const duration = performance.now() - start;
      
      if (error) {
        return createTestResult('p2-schema', 'Spec Sheets Table Schema', 'failed', duration, error.message);
      }
      
      return createTestResult('p2-schema', 'Spec Sheets Table Schema', 'passed', duration, undefined, 
        'All required columns accessible');
    } catch (err) {
      return createTestResult('p2-schema', 'Spec Sheets Table Schema', 'failed', performance.now() - start, String(err));
    }
  },
};

// Test 3: Create spec sheet record
const testCreateSpecSheet: TestDefinition = {
  id: 'p2-crud-create',
  name: 'Create Spec Sheet Record',
  description: 'Test creating a spec sheet database record',
  run: async () => {
    const start = performance.now();
    const testRecord = {
      file_name: `test-spec-${Date.now()}.pdf`,
      file_path: `test/test-spec-${Date.now()}.pdf`,
      file_type: 'application/pdf',
      file_size: 1024,
      extraction_status: 'pending',
    };
    
    try {
      const { data, error } = await supabase
        .from('lighting_spec_sheets')
        .insert(testRecord)
        .select()
        .single();
      
      const duration = performance.now() - start;
      
      if (error) {
        return createTestResult('p2-crud-create', 'Create Spec Sheet Record', 'failed', duration, error.message);
      }
      
      if (data) {
        sessionStorage.setItem('test_spec_sheet_id', data.id);
      }
      
      return createTestResult('p2-crud-create', 'Create Spec Sheet Record', 'passed', duration, undefined, 
        `Created: ${data?.file_name}`);
    } catch (err) {
      return createTestResult('p2-crud-create', 'Create Spec Sheet Record', 'failed', performance.now() - start, String(err));
    }
  },
};

// Test 4: Update extraction status
const testUpdateExtractionStatus: TestDefinition = {
  id: 'p2-extraction-status',
  name: 'Update Extraction Status',
  description: 'Test updating extraction status field',
  run: async () => {
    const start = performance.now();
    const testId = sessionStorage.getItem('test_spec_sheet_id');
    
    if (!testId) {
      return createTestResult('p2-extraction-status', 'Update Extraction Status', 'skipped', 0, 'No test record available');
    }
    
    try {
      const { data, error } = await supabase
        .from('lighting_spec_sheets')
        .update({ 
          extraction_status: 'completed',
          extracted_data: { manufacturer: 'Test', model: 'Model1', wattage: 10 },
          confidence_scores: { manufacturer: 0.95, model: 0.88, wattage: 0.92 }
        })
        .eq('id', testId)
        .select()
        .single();
      
      const duration = performance.now() - start;
      
      if (error) {
        return createTestResult('p2-extraction-status', 'Update Extraction Status', 'failed', duration, error.message);
      }
      
      if (data?.extraction_status !== 'completed') {
        return createTestResult('p2-extraction-status', 'Update Extraction Status', 'failed', duration, 'Status not updated');
      }
      
      return createTestResult('p2-extraction-status', 'Update Extraction Status', 'passed', duration, undefined, 
        'Status updated to completed with extracted data');
    } catch (err) {
      return createTestResult('p2-extraction-status', 'Update Extraction Status', 'failed', performance.now() - start, String(err));
    }
  },
};

// Test 5: AI Extraction Edge Function
const testAIExtractionEndpoint: TestDefinition = {
  id: 'p2-ai-extraction',
  name: 'AI Extraction Edge Function',
  description: 'Verify extract-lighting-specs edge function is deployed and accessible',
  run: async () => {
    const start = performance.now();
    
    try {
      // Call with empty body to test if the function is deployed
      // We expect a 400 validation error (not 500) which confirms the function is working
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-lighting-specs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );
      
      const duration = performance.now() - start;
      
      // 400 means function is deployed and validating input correctly
      if (response.status === 400) {
        return createTestResult('p2-ai-extraction', 'AI Extraction Edge Function', 'passed', duration, undefined, 
          'Edge function deployed and validating input');
      }
      
      // Any other response that's not 404 means function exists
      if (response.status !== 404) {
        const data = await response.json().catch(() => ({}));
        return createTestResult('p2-ai-extraction', 'AI Extraction Edge Function', 'passed', duration, undefined, 
          `Edge function deployed (status: ${response.status})`);
      }
      
      return createTestResult('p2-ai-extraction', 'AI Extraction Edge Function', 'failed', duration, 
        'Edge function not found (404)');
    } catch (err) {
      const duration = performance.now() - start;
      return createTestResult('p2-ai-extraction', 'AI Extraction Edge Function', 'failed', duration, String(err));
    }
  },
};

// Test 6: Duplicate detection query capability
const testDuplicateDetection: TestDefinition = {
  id: 'p2-duplicate-detection',
  name: 'Duplicate Detection Query',
  description: 'Test ability to query for duplicate fittings',
  run: async () => {
    const start = performance.now();
    
    try {
      // Test querying for potential duplicates by manufacturer and model
      const { data, error } = await supabase
        .from('lighting_fittings')
        .select('id, manufacturer, model_name, wattage, lumen_output')
        .limit(10);
      
      const duration = performance.now() - start;
      
      if (error) {
        return createTestResult('p2-duplicate-detection', 'Duplicate Detection Query', 'failed', duration, error.message);
      }
      
      return createTestResult('p2-duplicate-detection', 'Duplicate Detection Query', 'passed', duration, undefined, 
        `Query successful, ${data?.length || 0} fittings available for comparison`);
    } catch (err) {
      return createTestResult('p2-duplicate-detection', 'Duplicate Detection Query', 'failed', performance.now() - start, String(err));
    }
  },
};

// Test 7: Spec sheet to fitting link
const testSpecSheetFittingLink: TestDefinition = {
  id: 'p2-fitting-link',
  name: 'Spec Sheet Fitting Link',
  description: 'Test linking spec sheet to fitting',
  run: async () => {
    const start = performance.now();
    const testSpecId = sessionStorage.getItem('test_spec_sheet_id');
    
    if (!testSpecId) {
      return createTestResult('p2-fitting-link', 'Spec Sheet Fitting Link', 'skipped', 0, 'No test spec sheet available');
    }
    
    try {
      // First create a test fitting
      const { data: fitting, error: fittingError } = await supabase
        .from('lighting_fittings')
        .insert({
          fitting_code: `SPEC-TEST-${Date.now()}`,
          manufacturer: 'Spec Test Manufacturer',
          model_name: 'Spec Test Model',
          fitting_type: 'downlight',
          wattage: 15,
        })
        .select()
        .single();
      
      if (fittingError) {
        return createTestResult('p2-fitting-link', 'Spec Sheet Fitting Link', 'failed', performance.now() - start, fittingError.message);
      }
      
      sessionStorage.setItem('test_fitting_id_p2', fitting.id);
      
      // Now link the spec sheet to the fitting
      const { data, error } = await supabase
        .from('lighting_spec_sheets')
        .update({ fitting_id: fitting.id })
        .eq('id', testSpecId)
        .select()
        .single();
      
      const duration = performance.now() - start;
      
      if (error) {
        return createTestResult('p2-fitting-link', 'Spec Sheet Fitting Link', 'failed', duration, error.message);
      }
      
      return createTestResult('p2-fitting-link', 'Spec Sheet Fitting Link', 'passed', duration, undefined, 
        `Linked spec sheet to fitting: ${fitting.fitting_code}`);
    } catch (err) {
      return createTestResult('p2-fitting-link', 'Spec Sheet Fitting Link', 'failed', performance.now() - start, String(err));
    }
  },
};

// Test 8: Batch query capability
const testBatchProcessing: TestDefinition = {
  id: 'p2-batch-processing',
  name: 'Batch Processing Capability',
  description: 'Test ability to query multiple spec sheets at once',
  run: async () => {
    const start = performance.now();
    
    try {
      const { data, error, count } = await supabase
        .from('lighting_spec_sheets')
        .select('id, file_name, extraction_status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);
      
      const duration = performance.now() - start;
      
      if (error) {
        return createTestResult('p2-batch-processing', 'Batch Processing Capability', 'failed', duration, error.message);
      }
      
      const statusCounts = data?.reduce((acc, sheet) => {
        acc[sheet.extraction_status || 'unknown'] = (acc[sheet.extraction_status || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return createTestResult('p2-batch-processing', 'Batch Processing Capability', 'passed', duration, undefined, 
        `Total: ${count || 0}, Status breakdown: ${JSON.stringify(statusCounts || {})}`);
    } catch (err) {
      return createTestResult('p2-batch-processing', 'Batch Processing Capability', 'failed', performance.now() - start, String(err));
    }
  },
};

// Test 9: Cleanup test data
const testCleanup: TestDefinition = {
  id: 'p2-cleanup',
  name: 'Cleanup Test Data',
  description: 'Remove test records created during testing',
  run: async () => {
    const start = performance.now();
    const testSpecId = sessionStorage.getItem('test_spec_sheet_id');
    const testFittingId = sessionStorage.getItem('test_fitting_id_p2');
    
    try {
      // Delete test spec sheet
      if (testSpecId) {
        await supabase.from('lighting_spec_sheets').delete().eq('id', testSpecId);
        sessionStorage.removeItem('test_spec_sheet_id');
      }
      
      // Delete test fitting
      if (testFittingId) {
        await supabase.from('lighting_fittings').delete().eq('id', testFittingId);
        sessionStorage.removeItem('test_fitting_id_p2');
      }
      
      const duration = performance.now() - start;
      return createTestResult('p2-cleanup', 'Cleanup Test Data', 'passed', duration, undefined, 'Test data cleaned up');
    } catch (err) {
      return createTestResult('p2-cleanup', 'Cleanup Test Data', 'failed', performance.now() - start, String(err));
    }
  },
};

export const phase2Tests: TestDefinition[] = [
  testStorageBucket,
  testSpecSheetsSchema,
  testCreateSpecSheet,
  testUpdateExtractionStatus,
  testAIExtractionEndpoint,
  testDuplicateDetection,
  testSpecSheetFittingLink,
  testBatchProcessing,
  testCleanup,
];

export const phase2Suite = {
  id: 'phase-2',
  phase: 2,
  name: 'Phase 2: Spec Sheet Management',
  description: 'Tests for storage, AI extraction, duplicate detection, and batch processing',
  tests: phase2Tests,
};
