import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Wand2, CheckCircle2, Circle, AlertCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FileTreeView } from "./import-wizard/FileTreeView";
import { DependencyReport } from "./import-wizard/DependencyReport";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type WizardStep = 'input' | 'analyzing' | 'review' | 'importing' | 'complete';

interface AnalysisResult {
  files: Array<{ path: string; type: 'file' | 'dir'; size?: number }>;
  dependencies: { required: string[]; missing: string[] };
  structure: {
    components: string[];
    utils: string[];
    types: string[];
    styles: string[];
    config: string[];
  };
  summary: string;
}

export function ComponentGenerator() {
  const [open, setOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [step, setStep] = useState<WizardStep>('input');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState(0);
  const [importedFiles, setImportedFiles] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }

    setStep('analyzing');

    try {
      const { data, error } = await supabase.functions.invoke("analyze-repository", {
        body: { repoUrl: repoUrl.trim() },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setStep('input');
        return;
      }

      setAnalysis(data);
      // Auto-select all files except config files by default
      const autoSelected = new Set<string>(
        data.files
          .filter((f: any) => !f.path.includes('config') && !f.path.endsWith('.json'))
          .map((f: any) => f.path as string)
      );
      setSelectedFiles(autoSelected);
      setStep('review');
      toast.success("Repository analyzed successfully!");
    } catch (error: any) {
      console.error("Error analyzing repository:", error);
      toast.error(error.message || "Failed to analyze repository");
      setStep('input');
    }
  };

  const handleImport = async () => {
    if (!analysis || selectedFiles.size === 0) {
      toast.error("Please select files to import");
      return;
    }

    setStep('importing');
    setImportProgress(0);
    const filesToImport = Array.from(selectedFiles);

    try {
      setImportProgress(20);
      
      // Fetch file contents and store in database
      const { data: filesData, error: fetchError } = await supabase.functions.invoke(
        "fetch-repository-files",
        {
          body: {
            repoUrl: repoUrl.trim(),
            filePaths: filesToImport,
            repoName: repoUrl.split('/').slice(-2).join('/'),
            dependencies: analysis.dependencies,
          },
        }
      );

      if (fetchError) throw fetchError;
      if (filesData?.error) throw new Error(filesData.error);

      setImportProgress(80);
      
      const files = filesData.files || [];
      const newSessionId = filesData.sessionId;
      
      setSessionId(newSessionId);
      setImportedFiles(files.map((f: any) => f.path));
      setImportProgress(100);
      setStep('complete');

      toast.success(`Successfully prepared ${files.length} files!`, {
        description: "Copy the message below and send it to import.",
      });
    } catch (error: any) {
      console.error("Error importing files:", error);
      toast.error(error.message || "Failed to prepare import");
      setStep('review');
    }
  };

  const handleReset = () => {
    setRepoUrl("");
    setStep('input');
    setAnalysis(null);
    setSelectedFiles(new Set());
    setImportProgress(0);
    setImportedFiles([]);
    setSessionId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'input', label: 'Repository' },
      { id: 'analyzing', label: 'Analyzing' },
      { id: 'review', label: 'Review' },
      { id: 'importing', label: 'Import' },
      { id: 'complete', label: 'Complete' },
    ];

    const currentIndex = steps.findIndex(s => s.id === step);

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((s, index) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`rounded-full p-2 ${
                index <= currentIndex ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {index < currentIndex ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span className="text-xs mt-1">{s.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-[2px] flex-1 mx-2 ${
                index < currentIndex ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleReset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Import Application
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Full Application</DialogTitle>
          <DialogDescription>
            Analyze and import complete applications from GitHub repositories
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="space-y-4">
          {step === 'input' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="repo-url">GitHub Repository URL *</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/owner/repo, owner/repo, or gh repo clone owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter a GitHub repository URL to analyze and import the entire application
                </p>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!repoUrl.trim()}
                className="w-full"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Analyze Repository
              </Button>
            </>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h3 className="font-medium">Analyzing Repository</h3>
                <p className="text-sm text-muted-foreground">
                  Fetching files, analyzing structure, and identifying dependencies...
                </p>
              </div>
            </div>
          )}

          {step === 'review' && analysis && (
            <>
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <p className="font-medium mb-2">Analysis Summary</p>
                    <p className="text-sm">{analysis.summary}</p>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="p-2 border rounded">
                    <div className="text-lg font-bold">{analysis.structure.components.length}</div>
                    <div className="text-xs text-muted-foreground">Components</div>
                  </div>
                  <div className="p-2 border rounded">
                    <div className="text-lg font-bold">{analysis.structure.utils.length}</div>
                    <div className="text-xs text-muted-foreground">Utils</div>
                  </div>
                  <div className="p-2 border rounded">
                    <div className="text-lg font-bold">{analysis.structure.types.length}</div>
                    <div className="text-xs text-muted-foreground">Types</div>
                  </div>
                  <div className="p-2 border rounded">
                    <div className="text-lg font-bold">{analysis.structure.styles.length}</div>
                    <div className="text-xs text-muted-foreground">Styles</div>
                  </div>
                  <div className="p-2 border rounded">
                    <div className="text-lg font-bold">{analysis.files.length}</div>
                    <div className="text-xs text-muted-foreground">Total Files</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Select Files to Import</h3>
                    <FileTreeView
                      files={analysis.files}
                      selectedFiles={selectedFiles}
                      onSelectionChange={setSelectedFiles}
                    />
                  </div>

                  <DependencyReport
                    required={analysis.dependencies.required}
                    missing={analysis.dependencies.missing}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleReset} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedFiles.size === 0}
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Prepare Import ({selectedFiles.size} Files)
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'importing' && (
            <div className="space-y-4 py-8">
              <div className="text-center space-y-2">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <h3 className="font-medium">Importing Files</h3>
                <p className="text-sm text-muted-foreground">
                  Fetching and preparing files for import...
                </p>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {step === 'complete' && sessionId && (
            <div className="space-y-4">
              <Alert className="border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  <p className="font-medium">Files Ready to Import!</p>
                  <p className="text-sm mt-1">
                    Successfully prepared {importedFiles.length} files from {repoUrl}
                  </p>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="mb-3">Final Step - Auto-Import Files</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p className="text-sm">
                    Copy and send this message to the AI assistant to automatically create all files:
                  </p>
                  <div className="relative">
                    <div className="bg-muted p-3 pr-12 rounded-md font-mono text-sm break-all">
                      Import repository session {sessionId}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1"
                      onClick={() => copyToClipboard(`Import repository session ${sessionId}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The AI will automatically create all {importedFiles.length} files with proper directory structure and updated import paths.
                  </p>
                </AlertDescription>
              </Alert>

              {analysis && analysis.dependencies.missing.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Dependencies Required</AlertTitle>
                  <AlertDescription>
                    <p className="text-sm mb-2">After files are imported, install these packages:</p>
                    <div className="relative">
                      <pre className="bg-muted p-2 pr-12 rounded-md text-xs overflow-x-auto">
npm install {analysis.dependencies.missing.join(' ')}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1"
                        onClick={() => copyToClipboard(`npm install ${analysis.dependencies.missing.join(' ')}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">What happens next:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>AI creates all {importedFiles.length} files in proper directories</li>
                  <li>Import paths are automatically updated to use @/ aliases</li>
                  <li>Directory structure is preserved from the original repo</li>
                  <li>You install any missing npm dependencies</li>
                  <li>Your imported application is ready to use!</li>
                </ol>
              </div>

              <Button onClick={handleReset} variant="outline" className="w-full">
                Import Another Repository
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
