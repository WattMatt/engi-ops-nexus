/**
 * usePDFTest Hook
 * React hook for testing PDF generation with validation and benchmarking
 */

import { useState, useCallback } from 'react';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  testPDFGeneration,
  benchmarkPDFGeneration,
  type PDFTestResult,
  type BenchmarkResult,
} from '@/utils/pdfmake/testing';
import { validateDocument, type ValidationResult } from '@/utils/pdfmake/validation';

export interface UsePDFTestState {
  testing: boolean;
  benchmarking: boolean;
  testResult: PDFTestResult | null;
  benchmarkResult: BenchmarkResult | null;
  validationResult: ValidationResult | null;
  error: string | null;
}

export interface UsePDFTestActions {
  runTest: (docDefinition: TDocumentDefinitions) => Promise<PDFTestResult>;
  runBenchmark: (docDefinition: TDocumentDefinitions, iterations?: number) => Promise<BenchmarkResult>;
  validate: (docDefinition: TDocumentDefinitions) => ValidationResult;
  reset: () => void;
}

export const usePDFTest = (): UsePDFTestState & UsePDFTestActions => {
  const [testing, setTesting] = useState(false);
  const [benchmarking, setBenchmarking] = useState(false);
  const [testResult, setTestResult] = useState<PDFTestResult | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((docDefinition: TDocumentDefinitions): ValidationResult => {
    const result = validateDocument(docDefinition);
    setValidationResult(result);
    return result;
  }, []);

  const runTest = useCallback(async (docDefinition: TDocumentDefinitions): Promise<PDFTestResult> => {
    setTesting(true);
    setError(null);

    try {
      const result = await testPDFGeneration(docDefinition);
      setTestResult(result);
      setValidationResult(result.validation);
      
      if (!result.success) {
        setError(result.error || 'Test failed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setTesting(false);
    }
  }, []);

  const runBenchmark = useCallback(async (
    docDefinition: TDocumentDefinitions,
    iterations: number = 3
  ): Promise<BenchmarkResult> => {
    setBenchmarking(true);
    setError(null);

    try {
      const result = await benchmarkPDFGeneration(docDefinition, iterations);
      setBenchmarkResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setBenchmarking(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTestResult(null);
    setBenchmarkResult(null);
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    // State
    testing,
    benchmarking,
    testResult,
    benchmarkResult,
    validationResult,
    error,
    // Actions
    runTest,
    runBenchmark,
    validate,
    reset,
  };
};

export default usePDFTest;
