/**
 * Hook for analyzing PDFMake implementation using Abacus AI
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AnalysisType = 'full' | 'best-practices' | 'performance' | 'structure' | 'tables' | 'styling' | 'generate-prompt';

export interface AnalysisResult {
  success: boolean;
  analysis: string;
  recommendations: string[];
  codeExamples?: string[];
  references?: string[];
  developerPrompt?: string;
  error?: string;
}

export interface UsePdfMakeAnalysisReturn {
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  analyze: (params: {
    analysisType: AnalysisType;
    codeSnippet?: string;
    specificQuestion?: string;
    generateDeveloperPrompt?: boolean;
  }) => Promise<AnalysisResult | null>;
  clearResult: () => void;
}

export const usePdfMakeAnalysis = (): UsePdfMakeAnalysisReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyze = async (params: {
    analysisType: AnalysisType;
    codeSnippet?: string;
    specificQuestion?: string;
    generateDeveloperPrompt?: boolean;
  }): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-pdfmake', {
        body: params,
      });

      if (error) {
        console.error('[usePdfMakeAnalysis] Error:', error);
        toast.error('Analysis failed', { description: error.message });
        return null;
      }

      const analysisResult = data as AnalysisResult;
      
      if (!analysisResult.success) {
        toast.error('Analysis failed', { description: analysisResult.error });
        return null;
      }

      setResult(analysisResult);
      
      if (params.generateDeveloperPrompt || params.analysisType === 'generate-prompt') {
        toast.success('Developer prompt generated', { 
          description: 'Copy the prompt to use with any AI assistant' 
        });
      } else {
        toast.success('Analysis complete', { 
          description: `Found ${analysisResult.recommendations.length} recommendations` 
        });
      }
      
      return analysisResult;
    } catch (err) {
      console.error('[usePdfMakeAnalysis] Exception:', err);
      toast.error('Analysis failed', { 
        description: err instanceof Error ? err.message : 'Unknown error' 
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearResult = () => setResult(null);

  return {
    isAnalyzing,
    result,
    analyze,
    clearResult,
  };
};
