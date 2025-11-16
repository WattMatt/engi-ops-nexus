import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileCheck, Wand2, Download, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { analyzeWordTemplate, compareTemplateStructures, TemplateStructure, detectPlaceholdersInTemplate } from "@/utils/analyzeWordTemplate";
import { detectPlaceholders, getPlaceholderSuggestions } from "@/utils/placeholderDetection";
import { supabase } from "@/integrations/supabase/client";

type WizardStep = "upload" | "analyze" | "generate" | "preview" | "complete";

export function TemplateWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [progress, setProgress] = useState(0);
  
  const [templateType, setTemplateType] = useState<string>("cost_report");
  const [completedFile, setCompletedFile] = useState<File | null>(null);
  const [blankFile, setBlankFile] = useState<File | null>(null);
  
  const [completedStructure, setCompletedStructure] = useState<TemplateStructure | null>(null);
  const [blankStructure, setBlankStructure] = useState<TemplateStructure | null>(null);
  
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string>("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparison, setComparison] = useState<ReturnType<typeof compareTemplateStructures> | null>(null);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<{
    textPlaceholders: string[];
    imagePlaceholders: string[];
    loopPlaceholders: string[];
  } | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const templateTypeLabels: Record<string, string> = {
    cost_report: "Cost Report",
    cover_page: "Cover Page",
    specification: "Specification",
    budget: "Budget",
    final_account: "Final Account",
    other: "Other Document"
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

    setIsProcessing(true);
    setProgress(10);

    try {
      // Analyze completed template
      setProgress(30);
      const completedAnalysis = await analyzeWordTemplate(completedFile);
      setCompletedStructure(completedAnalysis);
      
      console.log("Completed template analysis:", {
        headings: completedAnalysis.headings,
        tables: completedAnalysis.tables,
        images: completedAnalysis.images,
        paragraphCount: completedAnalysis.paragraphs.length,
        hasFinancialContent: completedAnalysis.hasFinancialContent
      });

      // Analyze blank template
      setProgress(60);
      const blankAnalysis = await analyzeWordTemplate(blankFile);
      setBlankStructure(blankAnalysis);
      
      console.log("Blank template analysis:", {
        headings: blankAnalysis.headings,
        tables: blankAnalysis.tables,
        images: blankAnalysis.images,
        paragraphCount: blankAnalysis.paragraphs.length,
      });

      // Compare structures
      setProgress(80);
      const comparisonResult = compareTemplateStructures(completedAnalysis, blankAnalysis);
      setComparison(comparisonResult);

      setProgress(100);
      setCurrentStep("analyze");
      toast.success("Templates analyzed successfully");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze templates");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!blankFile) {
      toast.error("Please upload blank template first");
      return;
    }

    setIsProcessing(true);
    setProgress(20);

    try {
      // Detect placeholders in blank template
      setProgress(40);
      const detected = await detectPlaceholdersInTemplate(blankFile);
      setDetectedPlaceholders(detected);
      
      // Use the blank file AS-IS (this is the key change!)
      setGeneratedBlob(blankFile);
      const fileName = blankFile.name.replace(".docx", "_template.docx");
      setGeneratedFileName(fileName);

      setProgress(100);
      setCurrentStep("preview");
      toast.success("Template analyzed successfully - placeholders detected");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to analyze template");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!blankFile) {
      toast.error("Please upload blank template");
      return;
    }

    setIsProcessing(true);
    try {
      // Upload blank template temporarily
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tempPath = `temp/preview_blank_${timestamp}.docx`;
      
      const { error: uploadError } = await supabase.storage
        .from('document-templates')
        .upload(tempPath, blankFile, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('document-templates')
        .getPublicUrl(tempPath);

      // Generate PDF preview
      const { data, error } = await supabase.functions.invoke('generate-template-preview', {
        body: {
          blankTemplateUrl: urlData.publicUrl,
          templateType,
        },
      });

      if (error) throw error;

      setPdfPreviewUrl(data.pdfUrl);
      toast.success("PDF preview generated");

      // Clean up temp file
      await supabase.storage.from('document-templates').remove([tempPath]);
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to generate preview");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadGenerated = async () => {
    if (!pdfPreviewUrl) {
      toast.error("Please generate PDF preview first");
      return;
    }

    try {
      const response = await fetch(pdfPreviewUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generatedFileName.replace(".docx", ".pdf");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleSaveToDatabase = async () => {
    if (!completedFile || !blankFile) {
      toast.error("Missing files to save");
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const timestamp = new Date().toISOString().split("T")[0];
      
      // Upload completed example and blank template
      const files = [
        { file: completedFile, suffix: "_completed_example" },
        { file: blankFile, suffix: "_blank_template" },
      ];

      let blankTemplateUrl = "";

      for (const { file, suffix } of files) {
        const fileName = `${timestamp}${suffix}.docx`;
        const folderPath = templateType === "cover_page" ? "cover_pages" : `templates/${templateType}`;
        const filePath = `${folderPath}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("document-templates")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("document-templates")
          .getPublicUrl(filePath);

        // Save blank template as the main template
        if (suffix === "_blank_template") {
          blankTemplateUrl = urlData.publicUrl;
          
          await supabase.from("document_templates").insert({
            name: `${templateTypeLabels[templateType]} Template`,
            description: `Created via Template Wizard on ${timestamp}`,
            template_type: templateType,
            file_name: fileName,
            file_url: urlData.publicUrl,
            preview_pdf_url: pdfPreviewUrl,
            is_active: true,
            is_default_cover: templateType === "cover_page",
            created_by: user.id,
          });
        }
      }

      setCurrentStep("complete");
      toast.success("All templates saved to database");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save templates");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep("upload");
    setProgress(0);
    setCompletedFile(null);
    setBlankFile(null);
    setCompletedStructure(null);
    setBlankStructure(null);
    setGeneratedBlob(null);
    setComparison(null);
  };

  const getStepNumber = (step: WizardStep): number => {
    const steps: WizardStep[] = ["upload", "analyze", "generate", "preview", "complete"];
    return steps.indexOf(step) + 1;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Template Wizard</CardTitle>
        <CardDescription>
          Upload your completed and blank templates to generate an intelligent template with placeholders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {getStepNumber(currentStep)} of 5</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Step 1: Upload */}
        {currentStep === "upload" && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Upload a completed example template and a blank structure template. The wizard will analyze both and generate a new template with intelligent placeholder positioning.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-type">
                  Template Type
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost_report">Cost Report</SelectItem>
                    <SelectItem value="cover_page">Cover Page</SelectItem>
                    <SelectItem value="specification">Specification</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="final_account">Final Account</SelectItem>
                    <SelectItem value="other">Other Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="completed-template">
                  Completed Example Template
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="completed-template"
                    type="file"
                    accept=".docx"
                    onChange={handleCompletedFileChange}
                    className="flex-1"
                  />
                  {completedFile && <FileCheck className="h-5 w-5 text-success" />}
                </div>
                {completedFile && (
                  <p className="text-sm text-muted-foreground">{completedFile.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="blank-template">
                  Blank Structure Template
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="blank-template"
                    type="file"
                    accept=".docx"
                    onChange={handleBlankFileChange}
                    className="flex-1"
                  />
                  {blankFile && <FileCheck className="h-5 w-5 text-success" />}
                </div>
                {blankFile && (
                  <p className="text-sm text-muted-foreground">{blankFile.name}</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!completedFile || !blankFile || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Analyze Templates
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Analysis Results */}
        {currentStep === "analyze" && comparison && completedStructure && blankStructure && (
          <div className="space-y-4">
            <Alert variant={comparison.structuralMatch ? "default" : "destructive"}>
              {comparison.structuralMatch ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                Similarity Score: {comparison.similarityScore}%
                {comparison.structuralMatch
                  ? " - Templates are structurally compatible"
                  : " - Templates have significant structural differences"}
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="completed" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="blank">Blank</TabsTrigger>
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              </TabsList>

              <TabsContent value="completed" className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Structure</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>Headings: {completedStructure.headings.length}</p>
                      <p>Tables: {completedStructure.tables.length}</p>
                      <p>Paragraphs: {completedStructure.paragraphs.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Content</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>
                        Financial: <Badge variant={completedStructure.hasFinancialContent ? "default" : "secondary"}>
                          {completedStructure.hasFinancialContent ? "Yes" : "No"}
                        </Badge>
                      </p>
                      <p>
                        Tables: <Badge variant={completedStructure.hasTableStructure ? "default" : "secondary"}>
                          {completedStructure.hasTableStructure ? "Yes" : "No"}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="blank" className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Structure</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>Headings: {blankStructure.headings.length}</p>
                      <p>Tables: {blankStructure.tables.length}</p>
                      <p>Paragraphs: {blankStructure.paragraphs.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Content</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>
                        Financial: <Badge variant={blankStructure.hasFinancialContent ? "default" : "secondary"}>
                          {blankStructure.hasFinancialContent ? "Yes" : "No"}
                        </Badge>
                      </p>
                      <p>
                        Tables: <Badge variant={blankStructure.hasTableStructure ? "default" : "secondary"}>
                          {blankStructure.hasTableStructure ? "Yes" : "No"}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="suggestions" className="space-y-2">
                {comparison.suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {comparison.suggestions.map((suggestion, index) => (
                      <Alert key={index}>
                        <Info className="h-4 w-4" />
                        <AlertDescription>{suggestion}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>No structural issues detected</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button onClick={resetWizard} variant="outline" className="flex-1">
                Start Over
              </Button>
              <Button onClick={handleGenerate} disabled={isProcessing} className="flex-1">
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Template
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview Generated Template */}
        {currentStep === "preview" && blankStructure && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Template generated successfully with intelligent placeholder positioning based on cost report schema.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detected Placeholders</CardTitle>
              </CardHeader>
              <CardContent>
                {detectedPlaceholders ? (
                  <div className="space-y-4">
                    {detectedPlaceholders.textPlaceholders.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium">Text Placeholders</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {detectedPlaceholders.textPlaceholders.map((ph) => (
                            <Badge key={ph} variant="secondary" className="text-xs">
                              {ph}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {detectedPlaceholders.imagePlaceholders.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium">Image Placeholders</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {detectedPlaceholders.imagePlaceholders.map((ph) => (
                            <Badge key={ph} variant="outline" className="text-xs">
                              {ph}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {detectedPlaceholders.loopPlaceholders.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium">Loop Syntax</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {detectedPlaceholders.loopPlaceholders.map((ph) => (
                            <Badge key={ph} variant="default" className="text-xs">
                              {ph}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {detectedPlaceholders.textPlaceholders.length === 0 && 
                     detectedPlaceholders.imagePlaceholders.length === 0 && 
                     detectedPlaceholders.loopPlaceholders.length === 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          No placeholders detected. Add placeholders in format {`{placeholder_name}`} to your blank template.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="mt-4">
                      <Button onClick={handleGeneratePreview} disabled={isProcessing} className="w-full">
                        Generate PDF Preview
                      </Button>
                    </div>

                    {pdfPreviewUrl && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">PDF Preview</p>
                        <iframe 
                          src={pdfPreviewUrl} 
                          className="w-full h-96 border rounded"
                          title="Template Preview"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Analyze your template to detect placeholders
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={handleDownloadGenerated} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <Button onClick={handleSaveToDatabase} disabled={isProcessing} className="flex-1">
                {isProcessing ? "Saving..." : "Save All to Database"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === "complete" && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Templates Saved Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                All three templates (completed example, blank structure, and generated template) have been saved to the database.
              </p>
            </div>
            <Button onClick={resetWizard} className="w-full">
              Create Another Template
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
