import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Wand2, FileText, FileDown, CheckCircle2, AlertCircle, Loader2, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

type WizardStep = "upload" | "analysis" | "guide" | "validate";

interface AIPlaceholder {
  placeholder: string;
  exampleValue: string;
  position: string;
  description: string;
  confidence: number;
}

interface ValidationResult {
  isValid: boolean;
  completeness: number;
  total: number;
  matched: number;
  missing: string[];
  extra: string[];
  details: {
    summary: string;
    recommendations: string[];
  };
}

export function TemplateWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [progress, setProgress] = useState(0);
  const [completedFile, setCompletedFile] = useState<File | null>(null);
  const [blankFile, setBlankFile] = useState<File | null>(null);
  const [updatedBlankFile, setUpdatedBlankFile] = useState<File | null>(null);
  const [templateType, setTemplateType] = useState("cost_report");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [aiPlaceholders, setAiPlaceholders] = useState<AIPlaceholder[]>([]);
  const [guidePdfUrl, setGuidePdfUrl] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const resetWizard = () => {
    setCurrentStep("upload");
    setProgress(0);
    setCompletedFile(null);
    setBlankFile(null);
    setUpdatedBlankFile(null);
    setAiPlaceholders([]);
    setGuidePdfUrl(null);
    setExcelData(null);
    setValidationResult(null);
  };

  const handleCompletedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".docx")) {
      setCompletedFile(file);
    } else {
      toast.error("Please select a .docx file");
    }
  };

  const handleBlankFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".docx")) {
      setBlankFile(file);
    } else {
      toast.error("Please select a .docx file");
    }
  };

  const handleAnalyze = async () => {
    if (!completedFile || !blankFile) {
      toast.error("Please upload both files");
      return;
    }

    setIsAnalyzing(true);
    setProgress(20);

    try {
      const timestamp = Date.now();
      
      const [completedUpload, blankUpload] = await Promise.all([
        supabase.storage.from('document_templates').upload(
          `temp-completed-${timestamp}.docx`,
          completedFile,
          { upsert: true }
        ),
        supabase.storage.from('document_templates').upload(
          `temp-blank-${timestamp}.docx`,
          blankFile,
          { upsert: true }
        )
      ]);

      if (completedUpload.error || blankUpload.error) {
        throw new Error('Failed to upload templates');
      }

      const { data: { publicUrl: completedUrl } } = supabase.storage
        .from('document_templates')
        .getPublicUrl(completedUpload.data.path);
      
      const { data: { publicUrl: blankUrl } } = supabase.storage
        .from('document_templates')
        .getPublicUrl(blankUpload.data.path);

      setProgress(40);

      const { data, error } = await supabase.functions.invoke('ai-analyze-template-placeholders', {
        body: {
          completedTemplateUrl: completedUrl,
          blankTemplateUrl: blankUrl,
        },
      });

      if (error) throw error;

      setAiPlaceholders(data.placeholders);
      setCurrentStep("analysis");
      setProgress(50);
      toast.success("Analysis complete! Review the suggested placeholders.");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze templates. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateGuide = async () => {
    if (aiPlaceholders.length === 0) {
      toast.error("No placeholder data available");
      return;
    }

    setIsGeneratingGuide(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-placeholder-guide', {
        body: {
          placeholders: aiPlaceholders,
          templateType,
        },
      });

      if (error) throw error;

      setGuidePdfUrl(data.pdfUrl);
      setExcelData(data.excelData);
      setCurrentStep("guide");
      setProgress(75);
      toast.success("Instruction guide generated!");
    } catch (error) {
      console.error("Guide generation error:", error);
      toast.error("Failed to generate guide.");
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!excelData) return;
    const ws = XLSX.utils.aoa_to_sheet([excelData.headers, ...excelData.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Placeholders");
    XLSX.writeFile(wb, `placeholder-reference-${Date.now()}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const handleValidateTemplate = async () => {
    if (!updatedBlankFile) {
      toast.error("Please upload your updated template");
      return;
    }

    setIsValidating(true);
    try {
      const timestamp = Date.now();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document_templates')
        .upload(`validate-${timestamp}.docx`, updatedBlankFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl: templateUrl } } = supabase.storage
        .from('document_templates')
        .getPublicUrl(uploadData.path);

      const { data, error } = await supabase.functions.invoke('validate-template-placeholders', {
        body: { templateUrl, expectedPlaceholders: aiPlaceholders },
      });

      if (error) throw error;

      setValidationResult(data);
      setCurrentStep("validate");
      setProgress(100);
      
      if (data.isValid) {
        toast.success("✅ All placeholders validated!");
      } else {
        toast.warning(`⚠️ ${data.missing.length} placeholder(s) missing`);
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Failed to validate template.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Template Wizard
          </CardTitle>
          <CardDescription>
            Upload completed and blank templates. AI analyzes them and provides a detailed guide for adding placeholders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={currentStep === "upload" ? "text-primary font-medium" : ""}>Upload</span>
              <span className={currentStep === "analysis" ? "text-primary font-medium" : ""}>Analyze</span>
              <span className={currentStep === "guide" ? "text-primary font-medium" : ""}>Guide</span>
              <span className={currentStep === "validate" ? "text-primary font-medium" : ""}>Validate</span>
            </div>
          </div>

          {currentStep === "upload" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost_report">Cost Report</SelectItem>
                    <SelectItem value="cover_page">Cover Page</SelectItem>
                    <SelectItem value="specification">Specification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Completed Template</Label>
                <Input type="file" accept=".docx" onChange={handleCompletedFileChange} />
              </div>
              <div className="space-y-2">
                <Label>Blank Template</Label>
                <Input type="file" accept=".docx" onChange={handleBlankFileChange} />
              </div>
              <Button onClick={handleAnalyze} disabled={!completedFile || !blankFile || isAnalyzing} className="w-full">
                {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Wand2 className="w-4 h-4 mr-2" />Analyze</>}
              </Button>
            </div>
          )}

          {currentStep === "analysis" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Found {aiPlaceholders.length} placeholders</p>
              <Button onClick={handleGenerateGuide} disabled={isGeneratingGuide} className="w-full">
                {isGeneratingGuide ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><FileText className="w-4 h-4 mr-2" />Generate Guide</>}
              </Button>
            </div>
          )}

          {currentStep === "guide" && guidePdfUrl && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button asChild className="flex-1"><a href={guidePdfUrl} download><FileText className="w-4 h-4 mr-2" />Download PDF</a></Button>
                <Button onClick={handleDownloadExcel} variant="outline" className="flex-1"><FileDown className="w-4 h-4 mr-2" />Download Excel</Button>
              </div>
              <iframe src={guidePdfUrl} className="w-full border rounded" style={{height:'500px'}} />
              <div className="space-y-2">
                <Label>Upload Updated Template</Label>
                <Input type="file" accept=".docx" onChange={(e) => setUpdatedBlankFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={handleValidateTemplate} disabled={!updatedBlankFile || isValidating} className="w-full">
                {isValidating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validating...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Validate</>}
              </Button>
            </div>
          )}

          {currentStep === "validate" && validationResult && (
            <div className="space-y-4">
              <div className={validationResult.isValid ? "bg-green-50 dark:bg-green-950 p-4 rounded" : "bg-yellow-50 dark:bg-yellow-950 p-4 rounded"}>
                <p className="font-semibold flex items-center gap-2">
                  {validationResult.isValid ? <><CheckCircle2 />Success!</> : <><AlertCircle />Issues Found</>}
                </p>
              </div>
              <Button onClick={resetWizard} variant="outline" className="w-full"><RotateCw className="w-4 h-4 mr-2" />Start Over</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
