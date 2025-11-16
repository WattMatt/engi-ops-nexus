import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { generateCostReportTemplate } from "@/utils/generateCostReportTemplate";

export const CostReportTemplateGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateCostReportTemplate();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cost-report-template.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Template generated successfully! Check your downloads folder.");
    } catch (error) {
      console.error("Failed to generate template:", error);
      toast.error("Failed to generate template. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Cost Report Template Generator
        </CardTitle>
        <CardDescription>
          Generate a ready-to-use Word template with all required placeholders and loop syntax pre-configured
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            What's Included
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground ml-6">
            <li>• All project and report information placeholders</li>
            <li>• Category distribution table with loop syntax</li>
            <li>• Detailed category breakdowns with nested line items</li>
            <li>• Variations table with proper formatting</li>
            <li>• Financial totals and date fields</li>
            <li>• Contractor information section</li>
            <li>• Notes section</li>
          </ul>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to Use</h4>
          <ol className="space-y-1 text-sm text-blue-800 dark:text-blue-200 ml-4">
            <li>1. Click "Generate Template" below</li>
            <li>2. Download the .docx file to your computer</li>
            <li>3. (Optional) Review and customize the layout in Microsoft Word</li>
            <li>4. Upload it using the "Upload Template" button</li>
            <li>5. Set it as the default Cost Report template</li>
            <li>6. Generate PDFs - all placeholders will be automatically filled!</li>
          </ol>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950 dark:border-amber-800">
          <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">⚠️ Important Notes</h4>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200 ml-4">
            <li>• Do NOT manually type placeholders - use the generated template</li>
            <li>• If editing in Word, avoid auto-formatting curly braces</li>
            <li>• Keep loop tags intact: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{#categories}"}</code> and <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{/categories}"}</code></li>
            <li>• The template is already validated and ready to use</li>
          </ul>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          <Download className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Cost Report Template"}
        </Button>
      </CardContent>
    </Card>
  );
};
