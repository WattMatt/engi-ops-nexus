import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

export function DocumentGenerator() {
  const [documentType, setDocumentType] = useState("specification");
  const [specifications, setSpecifications] = useState("");
  const [generatedDocument, setGeneratedDocument] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDocument = async () => {
    setIsGenerating(true);
    try {
      const projectId = localStorage.getItem("selectedProjectId");
      let projectData = {};

      if (projectId) {
        const { data: project } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        projectData = project || {};
      }

      const { data, error } = await supabase.functions.invoke("ai-generate-document", {
        body: {
          documentType,
          projectData,
          specifications,
        },
      });

      if (error) throw error;

      setGeneratedDocument(data.document);
      toast.success("Document generated successfully!");
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Failed to generate document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = () => {
    const blob = new Blob([generatedDocument], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentType}-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          AI Document Generator
        </CardTitle>
        <CardDescription>
          Generate professional technical documents automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specification">Technical Specification</SelectItem>
                  <SelectItem value="report">Technical Report</SelectItem>
                  <SelectItem value="variation">Variation Order</SelectItem>
                  <SelectItem value="handover">Handover Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specifications">Additional Specifications (Optional)</Label>
            <Textarea
              id="specifications"
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              placeholder="Add any specific requirements, details, or context..."
              className="min-h-[100px]"
            />
          </div>

          <Button onClick={generateDocument} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Document
              </>
            )}
          </Button>

          {generatedDocument && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Generated Document</h3>
                <Button variant="outline" size="sm" onClick={downloadDocument}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
              <div className="border rounded-lg p-4 bg-muted/50 max-h-[400px] overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{generatedDocument}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
