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
import { Upload, FileCheck, Wand2, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type WizardStep = "upload" | "analysis" | "preview";

interface AIPlaceholder {
  placeholder: string;
  exampleValue: string;
  position: string;
  description: string;
  confidence: number;
}

export function TemplateWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [progress, setProgress] = useState(0);
  
  const [templateType, setTemplateType] = useState<string>("cost_report");
  const [completedFile, setCompletedFile] = useState<File | null>(null);
  const [blankFile, setBlankFile] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPlaceholders, setAiPlaceholders] = useState<AIPlaceholder[]>([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>("");
  const [generatedDocxUrl, setGeneratedDocxUrl] = useState<string>("");

  const resetWizard = () => {
    setCurrentStep("upload");
    setProgress(0);
    setCompletedFile(null);
    setBlankFile(null);
    setAiPlaceholders([]);
    setPdfPreviewUrl("");
    setGeneratedDocxUrl("");
  };

  const getStepNumber = () => {
    const steps = { upload: 1, analysis: 2, preview: 3 };
    return steps[currentStep];
  };

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
    setProgress(20);

    try {
      // Upload both files to get URLs
      const uploadPromises = [
        supabase.storage.from('document_templates').upload(
          `temp-completed-${Date.now()}.docx`,
          completedFile,
          { contentType: completedFile.type, upsert: true }
        ),
        supabase.storage.from('document_templates').upload(
          `temp-blank-${Date.now()}.docx`,
          blankFile,
          { contentType: blankFile.type, upsert: true }
        )
      ];

      const [completedUpload, blankUpload] = await Promise.all(uploadPromises);

      if (completedUpload.error || blankUpload.error) {
        throw new Error('Failed to upload templates');
      }

      const completedUrl = supabase.storage.from('document_templates').getPublicUrl(completedUpload.data.path).data.publicUrl;
      const blankUrl = supabase.storage.from('document_templates').getPublicUrl(blankUpload.data.path).data.publicUrl;

      setProgress(40);

      // Call AI analysis function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-analyze-template-placeholders', {
        body: { 
          completedTemplateUrl: completedUrl,
          blankTemplateUrl: blankUrl
        }
      });

      if (analysisError) {
        throw analysisError;
      }

      setAiPlaceholders(analysisData.placeholders || []);
      setProgress(100);

      setCurrentStep("analysis");
      toast.success("AI analysis completed - review suggested placeholders");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze templates");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateTemplateWithPlaceholders = async () => {
    if (!blankFile || aiPlaceholders.length === 0) {
      toast.error("Please complete analysis first");
      return;
    }

    setIsProcessing(true);
    setProgress(20);

    try {
      // Upload blank template
      const { data: blankUpload, error: uploadError } = await supabase.storage
        .from('document_templates')
        .upload(`temp-blank-${Date.now()}.docx`, blankFile, {
          contentType: blankFile.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const blankUrl = supabase.storage.from('document_templates').getPublicUrl(blankUpload.path).data.publicUrl;
      setProgress(50);

      // Insert placeholders
      console.log('Calling insert-template-placeholders with:', { blankUrl, placeholders: aiPlaceholders });
      
      const { data: insertData, error: insertError } = await supabase.functions.invoke('insert-template-placeholders', {
        body: {
          blankTemplateUrl: blankUrl,
          placeholders: aiPlaceholders
        }
      });

      console.log('Insert response:', { insertData, insertError });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      if (!insertData?.pdfUrl) {
        console.error('No PDF URL in response:', insertData);
        throw new Error('Failed to generate PDF - no URL returned');
      }

      console.log('Setting URLs:', { docxUrl: insertData.docxUrl, pdfUrl: insertData.pdfUrl });
      setGeneratedDocxUrl(insertData.docxUrl);
      setPdfPreviewUrl(insertData.pdfUrl);
      setProgress(100);
      setCurrentStep("preview");

      toast.success("Template with placeholders generated!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate template");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Template Wizard
          </CardTitle>
              <CardDescription>
                Upload a completed template and a blank template. AI will analyze them and suggest what placeholders you should add to your blank template and where they should go.
              </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {getStepNumber()} of 3</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Upload Step */}
          {currentStep === "upload" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-type">Template Type</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(templateTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="completed-file">Completed Template (with data)</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Input
                        id="completed-file"
                        type="file"
                        accept=".docx"
                        onChange={handleCompletedFileChange}
                        className="hidden"
                      />
                      <label htmlFor="completed-file" className="cursor-pointer">
                        {completedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileCheck className="w-5 h-5 text-green-500" />
                            <span className="text-sm">{completedFile.name}</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Click to upload completed template</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blank-file">Blank Template</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Upload your blank template. AI will suggest where to add placeholders based on the completed version.
                    </p>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Input
                        id="blank-file"
                        type="file"
                        accept=".docx"
                        onChange={handleBlankFileChange}
                        className="hidden"
                      />
                      <label htmlFor="blank-file" className="cursor-pointer">
                        {blankFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileCheck className="w-5 h-5 text-green-500" />
                            <span className="text-sm">{blankFile.name}</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Click to upload blank template</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Upload a completed template with real data and the same template without data. AI will identify placeholders and insert them into your blank template.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button 
                  onClick={handleAnalyze}
                  disabled={!completedFile || !blankFile || isProcessing}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isProcessing ? "Analyzing..." : "Analyze with AI"}
                </Button>
              </div>
            </div>
          )}

          {/* Analysis Step */}
          {currentStep === "analysis" && (
            <div className="space-y-6">
              <Tabs defaultValue="placeholders" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="placeholders">AI Suggested Placeholders</TabsTrigger>
                </TabsList>

                <TabsContent value="placeholders" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Review Placeholders ({aiPlaceholders.length})</h3>
                      <Button 
                        onClick={handleGenerateTemplateWithPlaceholders}
                        disabled={isProcessing || aiPlaceholders.length === 0}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {isProcessing ? "Generating..." : "Insert Placeholders & Generate PDF"}
                      </Button>
                    </div>
                    
                    {aiPlaceholders.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">Placeholder</th>
                              <th className="text-left p-3 text-sm font-medium">Example Value</th>
                              <th className="text-left p-3 text-sm font-medium">Description</th>
                              <th className="text-left p-3 text-sm font-medium">Confidence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aiPlaceholders.map((placeholder, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-3 font-mono text-sm">{placeholder.placeholder}</td>
                                <td className="p-3 text-sm text-muted-foreground">{placeholder.exampleValue}</td>
                                <td className="p-3 text-sm">{placeholder.description}</td>
                                <td className="p-3">
                                  <Badge variant={placeholder.confidence > 80 ? "default" : "secondary"}>
                                    {placeholder.confidence}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        No placeholders detected. Try uploading different templates.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetWizard}>
                  Start Over
                </Button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {currentStep === "preview" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">AI Analysis Results</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Review the suggested placeholders below. You'll need to manually add these to your blank template in Word, then use it in your reports.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {generatedDocxUrl && (
                      <Button variant="outline" onClick={() => window.open(generatedDocxUrl, '_blank')}>
                        <Download className="w-4 h-4 mr-2" />
                        Download DOCX
                      </Button>
                    )}
                    {pdfPreviewUrl && (
                      <Button variant="outline" onClick={() => window.open(pdfPreviewUrl, '_blank')}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                  </div>
                </div>

                {pdfPreviewUrl ? (
                  <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                    <embed
                      src={pdfPreviewUrl}
                      type="application/pdf"
                      width="100%"
                      height="100%"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-8 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Click "Insert Placeholders & Generate PDF" to see the preview</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetWizard}>
                  Start Over
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
