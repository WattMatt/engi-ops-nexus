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
import { Loader2, Wand2, Download, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FileTreeView } from "./import-wizard/FileTreeView";
import { DependencyReport } from "./import-wizard/DependencyReport";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      // Fetch file contents
      const { data: filesData, error: fetchError } = await supabase.functions.invoke(
        "fetch-repository-files",
        {
          body: {
            repoUrl: repoUrl.trim(),
            filePaths: filesToImport,
          },
        }
      );

      if (fetchError) throw fetchError;
      if (filesData?.error) throw new Error(filesData.error);

      const files = filesData.files || [];
      setImportProgress(50);

      // For now, we'll download as a ZIP since we can't write directly to the project
      // In a real implementation with file system access, we'd write the files directly
      
      // Create download data
      const downloadData = {
        files: files.map((f: any) => ({
          path: f.path,
          content: f.content,
        })),
        dependencies: analysis.dependencies,
        readme: `# Imported from ${repoUrl}\n\n${analysis.summary}\n\n## Installation\n\nRun the following command to install dependencies:\n\n\`\`\`bash\nnpm install ${analysis.dependencies.missing.join(' ')}\n\`\`\`\n\n## Files Imported\n\n${files.map((f: any) => `- ${f.path}`).join('\n')}`,
      };

      setImportProgress(100);
      setImportedFiles(files.map((f: any) => f.path));
      setStep('complete');
      
      // Create and trigger download
      const blob = new Blob([JSON.stringify(downloadData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Successfully prepared ${files.length} files for import!`);
    } catch (error: any) {
      console.error("Error importing files:", error);
      toast.error(error.message || "Failed to import files");
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
                    <Download className="mr-2 h-4 w-4" />
                    Import {selectedFiles.size} Files
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

          {step === 'complete' && (
            <div className="space-y-4">
              <Alert className="border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  <p className="font-medium">Import Complete!</p>
                  <p className="text-sm mt-1">
                    Successfully prepared {importedFiles.length} files. The import data has been downloaded as JSON.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Next Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Review the downloaded JSON file containing all file contents</li>
                  <li>Manually create the files in your project structure</li>
                  {analysis && analysis.dependencies.missing.length > 0 && (
                    <li>Install missing dependencies:
                      <pre className="mt-1 p-2 bg-background rounded text-xs overflow-x-auto">
                        npm install {analysis.dependencies.missing.join(' ')}
                      </pre>
                    </li>
                  )}
                  <li>Update import paths if needed</li>
                  <li>Test the imported functionality</li>
                </ol>
              </div>

              <Button onClick={handleReset} className="w-full">
                Import Another Repository
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
