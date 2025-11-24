import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wand2, Download, Copy } from "lucide-react";

interface InfographicGeneratorProps {
  reportType: 'generator_report' | 'tenant_report' | 'cost_report' | 'cable_schedule' | 'bulk_services' | 'general';
  projectData?: any;
  onImageGenerated?: (imageUrl: string) => void;
}

export function InfographicGenerator({ reportType, projectData, onImageGenerated }: InfographicGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description for your infographic");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-infographic', {
        body: {
          prompt,
          reportType,
          projectData,
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        onImageGenerated?.(data.imageUrl);
        toast.success("Infographic generated successfully!");
      }
    } catch (error: any) {
      console.error("Error generating infographic:", error);
      toast.error(error.message || "Failed to generate infographic");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `infographic-${reportType}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Infographic downloaded!");
  };

  const handleCopyToClipboard = async () => {
    if (!generatedImage) return;
    
    try {
      // Convert base64 to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast.success("Infographic copied to clipboard!");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  const getPlaceholderText = () => {
    switch (reportType) {
      case 'generator_report':
        return "Describe your generator infographic, e.g., 'A technical diagram showing a standby generator system with load distribution and automatic transfer switch'";
      case 'tenant_report':
        return "Describe your tenant infographic, e.g., 'An illustration of electrical distribution to multiple tenant spaces in a commercial building'";
      case 'cost_report':
        return "Describe your cost infographic, e.g., 'A visual breakdown of electrical project costs with charts and financial symbols'";
      case 'cable_schedule':
        return "Describe your cable infographic, e.g., 'A technical illustration of cable routing and distribution systems'";
      case 'bulk_services':
        return "Describe your bulk services infographic, e.g., 'Infrastructure diagram showing utility supply and distribution network'";
      default:
        return "Describe the infographic you want to generate...";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          AI Infographic Generator
        </CardTitle>
        <CardDescription>
          Generate professional infographics for your {reportType.replace('_', ' ')} using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Describe Your Infographic</Label>
          <Textarea
            id="prompt"
            placeholder={getPlaceholderText()}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be specific about style, colors, elements, and technical details you want included
          </p>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Infographic...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Infographic
            </>
          )}
        </Button>

        {generatedImage && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-primary/20 p-4 bg-muted/20">
              <img 
                src={generatedImage} 
                alt="Generated infographic" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCopyToClipboard}
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
