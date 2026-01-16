/**
 * PDFMake Analysis Dialog
 * 
 * UI for running Abacus AI analysis on pdfmake implementation
 * with developer prompt generation for copy/paste use
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
import { Switch } from '@/components/ui/switch';
import { 
  Loader2, 
  Sparkles, 
  Code, 
  BookOpen, 
  Lightbulb, 
  ExternalLink, 
  Zap,
  Copy,
  Check,
  FileText,
  Wand2
} from 'lucide-react';
import { usePdfMakeAnalysis, AnalysisType } from '@/hooks/usePdfMakeAnalysis';
import { toast } from 'sonner';

interface PdfMakeAnalysisDialogProps {
  trigger?: React.ReactNode;
}

const ANALYSIS_TYPES: { value: AnalysisType; label: string; description: string }[] = [
  { value: 'generate-prompt', label: '🚀 Generate Developer Prompt', description: 'Create comprehensive prompt for AI assistants' },
  { value: 'full', label: 'Full Analysis', description: 'Comprehensive review of entire implementation' },
  { value: 'best-practices', label: 'Best Practices', description: 'Check adherence to pdfmake conventions' },
  { value: 'performance', label: 'Performance', description: 'Identify optimization opportunities' },
  { value: 'structure', label: 'Structure', description: 'Review document organization' },
  { value: 'tables', label: 'Tables', description: 'Analyze table implementations' },
  { value: 'styling', label: 'Styling', description: 'Review color, font, and spacing patterns' },
];

export const PdfMakeAnalysisDialog = ({ trigger }: PdfMakeAnalysisDialogProps) => {
  const [open, setOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('generate-prompt');
  const [specificQuestion, setSpecificQuestion] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [generatePrompt, setGeneratePrompt] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('analyze');
  
  const { isAnalyzing, result, analyze, clearResult } = usePdfMakeAnalysis();

  const handleAnalyze = async () => {
    const analysisResult = await analyze({
      analysisType,
      specificQuestion: specificQuestion || undefined,
      codeSnippet: codeSnippet || undefined,
      generateDeveloperPrompt: generatePrompt || analysisType === 'generate-prompt',
    });
    
    if (analysisResult) {
      setActiveTab('results');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      clearResult();
      setSpecificQuestion('');
      setCodeSnippet('');
      setCopied(false);
      setActiveTab('analyze');
    }
  };

  const handleCopyPrompt = async () => {
    if (!result?.developerPrompt) return;
    
    try {
      await navigator.clipboard.writeText(result.developerPrompt);
      setCopied(true);
      toast.success('Developer prompt copied!', {
        description: 'Paste it into any AI assistant to get implementation help'
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Failed to copy', { description: 'Please try selecting and copying manually' });
    }
  };

  const handleCopyAnalysis = async () => {
    if (!result?.analysis) return;
    
    try {
      await navigator.clipboard.writeText(result.analysis);
      toast.success('Analysis copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
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
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            PDFMake Implementation Analysis
          </DialogTitle>
          <DialogDescription>
            Analyze implementation and generate developer prompts with code examples for AI assistants
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
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
            <TabsTrigger value="prompt" className="gap-2" disabled={!result?.developerPrompt}>
              <Wand2 className="h-4 w-4" />
              Dev Prompt
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
                <div className="flex items-center justify-between">
                  <Label>Specific Question (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="generate-prompt"
                      checked={generatePrompt}
                      onCheckedChange={setGeneratePrompt}
                    />
                    <Label htmlFor="generate-prompt" className="text-xs text-muted-foreground">
                      Include dev prompt
                    </Label>
                  </div>
                </div>
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
                    {analysisType === 'generate-prompt' ? 'Generate Prompt' : 'Run Analysis'}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-4">
            {result && (
              <div className="space-y-4">
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyAnalysis}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Analysis
                  </Button>
                  {result.developerPrompt && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleCopyPrompt}
                      className="gap-2"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy Developer Prompt'}
                    </Button>
                  )}
                </div>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Key Recommendations ({result.recommendations.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
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
                      </ScrollArea>
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
                    <ScrollArea className="h-[250px]">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
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
                        Code Examples ({result.codeExamples.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
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
                      </ScrollArea>
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
                            className="text-xs text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2 py-1 rounded"
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

          <TabsContent value="prompt" className="mt-4">
            {result?.developerPrompt && (
              <div className="space-y-4">
                {/* Copy Button - Prominent */}
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Developer Prompt Ready</p>
                      <p className="text-sm text-muted-foreground">
                        Copy and paste into ChatGPT, Claude, or any AI assistant
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCopyPrompt}
                    size="lg"
                    className="gap-2"
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    {copied ? 'Copied!' : 'Copy Prompt'}
                  </Button>
                </div>

                {/* Preview */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-primary" />
                      Prompt Preview
                    </CardTitle>
                    <CardDescription>
                      This prompt includes architecture details, code examples, and implementation guidelines
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <pre className="p-4 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {result.developerPrompt}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Usage Tips */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">How to Use This Prompt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0">1</Badge>
                        <span>Copy the prompt using the button above</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0">2</Badge>
                        <span>Paste it into ChatGPT, Claude, or your preferred AI assistant</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0">3</Badge>
                        <span>Add your specific task after the prompt (e.g., "Create a new PDF builder for invoices")</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0">4</Badge>
                        <span>The AI will use the architecture and patterns from this codebase</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};