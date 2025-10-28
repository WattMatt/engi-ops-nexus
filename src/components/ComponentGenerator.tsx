import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Wand2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ComponentGenerator() {
  const [open, setOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [componentName, setComponentName] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [sourceFiles, setSourceFiles] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }

    setGenerating(true);
    setGeneratedCode("");
    setSourceFiles([]);

    try {
      const { data, error } = await supabase.functions.invoke("generate-component", {
        body: {
          repoUrl: repoUrl.trim(),
          componentName: componentName.trim() || undefined,
          description: description.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedCode(data.component);
      setSourceFiles(data.sourceFiles || []);
      toast.success("Component generated successfully!");
    } catch (error: any) {
      console.error("Error generating component:", error);
      toast.error(error.message || "Failed to generate component");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setRepoUrl("");
    setComponentName("");
    setDescription("");
    setGeneratedCode("");
    setSourceFiles([]);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Component Generator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Component Generator</DialogTitle>
          <DialogDescription>
            Generate React components from GitHub repositories using AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">GitHub Repository URL *</Label>
            <Input
              id="repo-url"
              placeholder="https://github.com/owner/repo, owner/repo, or gh repo clone owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={generating}
            />
            <p className="text-sm text-muted-foreground">
              Supports GitHub URLs, short form (owner/repo), or git clone commands
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="component-name">Component Name (Optional)</Label>
            <Input
              id="component-name"
              placeholder="e.g., UserProfile, DataTable"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              disabled={generating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe what the component should do..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={generating}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !repoUrl.trim()}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Component
                </>
              )}
            </Button>
            {generatedCode && (
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            )}
          </div>

          {sourceFiles.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium mb-2">Analyzed files:</p>
              <div className="flex flex-wrap gap-2">
                {sourceFiles.map((file, i) => (
                  <span
                    key={i}
                    className="text-xs bg-background px-2 py-1 rounded border"
                  >
                    {file}
                  </span>
                ))}
              </div>
            </div>
          )}

          {generatedCode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Generated Component</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
                  <code>{generatedCode}</code>
                </pre>
              </div>
              <p className="text-sm text-muted-foreground">
                Review the generated code and save it to a new file in your project.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
