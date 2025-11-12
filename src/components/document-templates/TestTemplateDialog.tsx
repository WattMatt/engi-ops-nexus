import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download } from "lucide-react";

interface TestTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
}

export function TestTemplateDialog({
  open,
  onOpenChange,
  template,
}: TestTemplateDialogProps) {
  const [testData, setTestData] = useState(`{
  "project_name": "Shopping Mall Phase 2",
  "project_number": "P-2024-001",
  "date": "2024-11-12",
  "total_cost": "R 850,000"
}`);

  const handleDownloadTemplate = () => {
    if (!template) return;
    window.open(template.file_url, "_blank");
    toast.success("Opening template file");
  };

  const handleTest = () => {
    try {
      JSON.parse(testData);
      toast.info("Template testing coming soon", {
        description: "Edge function integration will be added next",
      });
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Test Template: {template.name}</DialogTitle>
          <DialogDescription>
            Enter test data in JSON format to fill the template placeholders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Template Info:</p>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">File:</span>
                <span>{template.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>{template.template_type}</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={handleDownloadTemplate}
            >
              <Download className="mr-2 h-3 w-3" />
              Download Original Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testData">Test Data (JSON)</Label>
            <Textarea
              id="testData"
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder="Enter JSON data to fill placeholders"
            />
            <p className="text-xs text-muted-foreground">
              Keys should match the placeholder names in your template (without the {"{{"} {"}}"})
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Coming Soon: Full Testing
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              The next step will add an edge function to:
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 ml-4 list-disc space-y-1">
              <li>Download your template</li>
              <li>Fill placeholders with test data</li>
              <li>Generate a filled Word document</li>
              <li>Convert to PDF</li>
              <li>Allow you to download the result</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleTest}>
              Test Template (Preview)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
