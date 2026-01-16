/**
 * PDFMake Analysis Dialog
 * 
 * UI for running Abacus AI analysis on pdfmake implementation
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Code, BookOpen, Lightbulb, ExternalLink, Zap } from 'lucide-react';
import { usePdfMakeAnalysis, AnalysisType } from '@/hooks/usePdfMakeAnalysis';

interface PdfMakeAnalysisDialogProps {
  trigger?: React.ReactNode;
}

const ANALYSIS_TYPES: { value: AnalysisType; label: string; description: string }[] = [
  { value: 'full', label: 'Full Analysis', description: 'Comprehensive review of entire implementation' },
  { value: 'best-practices', label: 'Best Practices', description: 'Check adherence to pdfmake conventions' },
  { value: 'performance', label: 'Performance', description: 'Identify optimization opportunities' },
  { value: 'structure', label: 'Structure', description: 'Review document organization' },
  { value: 'tables', label: 'Tables', description: 'Analyze table implementations' },
  { value: 'styling', label: 'Styling', description: 'Review color, font, and spacing patterns' },
];

export const PdfMakeAnalysisDialog = ({ trigger }: PdfMakeAnalysisDialogProps) => {
  const [open, setOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('full');
  const [specificQuestion, setSpecificQuestion] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  
  const { isAnalyzing, result, analyze, clearResult } = usePdfMakeAnalysis();

  const handleAnalyze = async () => {
    await analyze({
      analysisType,
      specificQuestion: specificQuestion || undefined,
      codeSnippet: codeSnippet || undefined,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      clearResult();
      setSpecificQuestion('');
      setCodeSnippet('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Analyze PDFMake
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            PDFMake Implementation Analysis
          </DialogTitle>
          <DialogDescription>
            Use Abacus AI to analyze our pdfmake implementation and get recommendations based on official documentation
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="analyze" className="mt-4">
          <TabsList>
            <TabsTrigger value="analyze" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Analyze
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2" disabled={!result}>
              <Lightbulb className="h-4 w-4" />
              Results
              {result && (
                <Badge variant="secondary" className="ml-1">
                  {result.recommendations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Analysis Type</Label>
                <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANALYSIS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Specific Question (Optional)</Label>
                <Textarea
                  placeholder="E.g., How can we improve table performance with large datasets?"
                  value={specificQuestion}
                  onChange={(e) => setSpecificQuestion(e.target.value)}
                  className="h-[60px] resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Code Snippet to Analyze (Optional)</Label>
              <Textarea
                placeholder="Paste specific code you want analyzed..."
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                className="h-[150px] font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-4">
            {result && (
              <div className="space-y-4">
                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Key Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="shrink-0 mt-0.5">
                              {idx + 1}
                            </Badge>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Full Analysis */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Full Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {result.analysis}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Code Examples */}
                {result.codeExamples && result.codeExamples.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Code className="h-4 w-4 text-primary" />
                        Code Examples
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.codeExamples.map((code, idx) => (
                          <pre
                            key={idx}
                            className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto"
                          >
                            {code}
                          </pre>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* References */}
                {result.references && result.references.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Documentation References
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.references.map((ref, idx) => (
                          <a
                            key={idx}
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {ref.replace('https://pdfmake.github.io/docs/0.3/', '')}
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
